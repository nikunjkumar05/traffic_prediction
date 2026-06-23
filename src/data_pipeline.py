"""Stage 1: Data Pipeline — Load, explode JSON, estimate duration, classify severity, map junctions."""

import json
import numpy as np
import pandas as pd
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    get_duration_base_by_type,
    get_vehicle_adjustment,
    get_temporal_factors,
    get_config_value
)


def _parse_violation_types(raw) -> list:
    """Robust parsing of stringified JSON arrays with multiple fallbacks."""
    import ast
    import re
    
    if pd.isna(raw) or raw == "":
        return ['UNKNOWN']
    
    # Try JSON first (handles proper JSON: ["WRONG PARKING"])
    try:
        t = json.loads(raw)
        return t if isinstance(t, list) else [t]
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Try ast.literal_eval for Python literals (handles: ['WRONG PARKING'])
    try:
        t = ast.literal_eval(raw)
        return t if isinstance(t, list) else [t]
    except (ValueError, SyntaxError):
        pass
    
    # Fallback: extract quoted strings (handles: "['WRONG PARKING']", "WRONG PARKING")
    matches = re.findall(r'["\']([^"\']+)["\']', str(raw))
    return matches if matches else [str(raw).strip()]


def load_and_parse(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    # Canonical column mapping: ensure consistent naming across all downstream modules
    CANONICAL_MAP = {
        'created_date': 'created_datetime',
        'junction_': 'junction_name',
    }
    df.rename(columns={k: v for k, v in CANONICAL_MAP.items() if k in df.columns}, inplace=True)

    if 'created_datetime' not in df.columns:
        df['created_datetime'] = pd.Timestamp("2024-06-01 12:00:00")

    df['created_datetime'] = pd.to_datetime(df['created_datetime'], format='ISO8601', utc=True).dt.tz_localize(None)
    df['hour'] = df['created_datetime'].dt.hour
    df['day_of_week'] = df['created_datetime'].dt.dayofweek
    df['month'] = df['created_datetime'].dt.month
    df['date'] = df['created_datetime'].dt.date

    all_types = df['violation_type'].apply(_parse_violation_types)
    df = df.loc[df.index.repeat(all_types.apply(len))].copy()
    df['single_violation'] = np.concatenate([t for t in all_types])
    print(f"  Parsed {len(df):,} violation events from {csv_path}")
    return df


def estimate_duration(df: pd.DataFrame) -> pd.DataFrame:
    """Estimate violation duration using domain-expert formula (no closed_date dependency)."""
    df = df.copy()
    
    # Base duration from config by violation type
    df['base_duration'] = df['single_violation'].apply(get_duration_base_by_type)
    
    # Vehicle size adjustment from config
    df['vehicle_adjustment'] = df['vehicle_type'].map(lambda x: get_vehicle_adjustment(x)).fillna(1.0)
    
    # Temporal multiplier (peak/off-peak/normal) from config
    df['temporal_factors'] = df['created_datetime'].dt.hour.apply(
        lambda h: get_temporal_factors(h)['multiplier']
    )
    
    # Pure formula: base × vehicle × temporal
    df['duration_minutes'] = (
        df['base_duration'] * df['vehicle_adjustment'] * df['temporal_factors']
    ).round(1)
    
    print(f"  Duration (formula-only): min={df['duration_minutes'].min()}, max={df['duration_minutes'].max()}, mean={df['duration_minutes'].mean():.1f}")
    
    return df


def classify_severity(df: pd.DataFrame) -> pd.DataFrame:
    from config import get_severity_map
    
    # Get severity mapping from config
    severity_map = get_severity_map()
    
    # For backward compatibility, use default if not in config
    if not severity_map:
        severity_map = {
            'DOUBLE PARKING': 3, 'PARKING IN A MAIN ROAD': 3,
            'PARKING ON FOOTPATH': 2, 'PARKING NEAR ROAD CROSSING': 2,
            'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS': 2,
            'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC': 2,
        }
    
    df['severity'] = df['single_violation'].map(severity_map).fillna(1).astype(int)
    print(f"  Severity: {dict(df['severity'].value_counts().sort_index())}")
    return df


def map_to_nearest_junction(df: pd.DataFrame, junction_coords: dict) -> pd.DataFrame:
    df['mapped_junction'] = df['junction_name']
    if not junction_coords:
        return df

    jnames = list(junction_coords.keys())
    jlats = np.array([junction_coords[j][0] for j in jnames])
    jlons = np.array([junction_coords[j][1] for j in jnames])
    needs_map = (df['junction_name'] == 'No Junction') | df['junction_name'].isna()

    if needs_map.any():
        lats = df.loc[needs_map, 'latitude'].values[:, None]
        lons = df.loc[needs_map, 'longitude'].values[:, None]
        batch_size = 50_000
        nearest = []
        for i in range(0, len(lats), batch_size):
            dists = np.sqrt((lats[i:i+batch_size] - jlats)**2 + (lons[i:i+batch_size] - jlons)**2) * 111000
            nearest.extend([jnames[j] for j in dists.argmin(axis=1)])
        df.loc[needs_map, 'mapped_junction'] = nearest

    print(f"  Junction mapping: {(df['mapped_junction'] != 'No Junction').sum():,}/{len(df):,} mapped")
    return df


def validate_pipeline_data(df: pd.DataFrame) -> dict:
    """Validate pipeline data integrity and return a summary of issues found."""
    report = {
        "valid": True,
        "total_rows": len(df),
        "dropped_rows": 0,
        "issues": [],
    }

    if len(df) == 0:
        report["valid"] = False
        report["issues"].append("DataFrame is empty")
        return report

    required_columns = [
        "mapped_junction", "latitude", "longitude", "congestion_cost",
        "impact_tier", "single_violation", "vehicle_type", "created_datetime",
    ]
    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        report["valid"] = False
        report["issues"].append(f"Missing required columns: {missing}")
        return report

    null_junctions = df["mapped_junction"].isna().sum()
    if null_junctions > 0:
        report["dropped_rows"] += null_junctions
        report["issues"].append(f"Dropped {null_junctions} rows with null mapped_junction")
        df.dropna(subset=["mapped_junction"], inplace=True)

    if "latitude" in df.columns and "longitude" in df.columns:
        bad_coords = (
            df["latitude"].notna() & (
                (df["latitude"] < -90) | (df["latitude"] > 90) |
                (df["longitude"] < -180) | (df["longitude"] > 180)
            )
        ).sum()
        if bad_coords > 0:
            report["dropped_rows"] += int(bad_coords)
            report["issues"].append(f"Dropped {bad_coords} rows with invalid lat/lon")
            df.drop(df[bad_coords].index, inplace=True)

    if "congestion_cost" in df.columns:
        negative = (df["congestion_cost"] < 0).sum()
        if negative > 0:
            report["issues"].append(f"Found {negative} rows with negative congestion_cost (clamped to 0)")
            df["congestion_cost"] = df["congestion_cost"].clip(lower=0)

    valid_tiers = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    if "impact_tier" in df.columns:
        invalid_tiers = ~df["impact_tier"].isin(valid_tiers)
        if invalid_tiers.any():
            report["issues"].append(
                f"Found {invalid_tiers.sum()} rows with unknown impact_tier (defaulting to LOW)"
            )
            df.loc[invalid_tiers, "impact_tier"] = "LOW"

    report["remaining_rows"] = len(df)
    if report["dropped_rows"] > 0:
        report["valid"] = False

    return report


def run_pipeline(csv_path: str, junction_coords: dict = None, output_dir: str = None) -> pd.DataFrame:
    print("=" * 60)
    print("Stage 1: Data Pipeline")
    print("=" * 60)

    df = load_and_parse(csv_path)
    df = estimate_duration(df)
    df = classify_severity(df)
    df = map_to_nearest_junction(df, junction_coords or {})

    validation = validate_pipeline_data(df)
    for issue in validation["issues"]:
        print(f"  [VALIDATION] {issue}")
    if not validation["valid"]:
        print(f"  [VALIDATION] Pipeline completed with {validation['dropped_rows']} rows dropped")

    if output_dir:
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        df.to_csv(out_path / "violations_scored.csv", index=False)

    print("Stage 1 complete.")
    print("=" * 60)
    return df


if __name__ == '__main__':
    import os
    default_csv = os.environ.get(
        "DISPATCHMIND_CSV",
        "jan to may police violation_anonymized791b166.csv",
    )
    df = run_pipeline(csv_path=default_csv, output_dir='data/processed')
    print(f"\nShape: {df.shape}")
