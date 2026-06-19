"""Stage 1: Data Pipeline — Load, explode JSON, estimate duration, classify severity, map junctions."""

import json
import numpy as np
import pandas as pd
from pathlib import Path

# Duration lookup: violation_type → base minutes
DURATION_BY_TYPE = {
    'WRONG PARKING': 35, 'NO PARKING': 40, 'DOUBLE PARKING': 55,
    'PARKING IN A MAIN ROAD': 45, 'PARKING ON FOOTPATH': 30,
    'PARKING NEAR ROAD CROSSING': 25, 'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC': 20,
    'PARKING OPPOSITE TO ANOTHER PARKED VEHICLE': 50,
    'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS': 25,
}

# Vehicle type → duration multiplier (larger vehicles = harder to move)
VEHICLE_ADJUSTMENT = {
    'SCOOTER': 0.8, 'MOTOR CYCLE': 0.7, 'MOPED': 0.7,
    'PASSENGER AUTO': 0.9, 'CAR': 1.0, 'MAXI-CAB': 1.0, 'VAN': 1.0,
    'JEEP': 1.0, 'SCHOOL VEHICLE': 1.0, 'OTHERS': 1.0,
    'GOODS AUTO': 1.1, 'TEMPO': 1.1, 'MINI LORRY': 1.1,
    'LGV': 1.2, 'BUS (BMTC/KSRTC)': 1.3, 'PRIVATE BUS': 1.3,
    'TOURIST BUS': 1.3, 'HGV': 1.4, 'TANKER': 1.4,
}

# Severity classification
SEVERITY_MAP = {
    'DOUBLE PARKING': 3, 'PARKING IN A MAIN ROAD': 3,
    'PARKING ON FOOTPATH': 2, 'PARKING NEAR ROAD CROSSING': 2,
    'PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS': 2,
    'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC': 2,
}


def _parse_violation_types(raw) -> list:
    """Parse one violation_type cell — JSON array or plain string."""
    if pd.isna(raw):
        return ['UNKNOWN']
    try:
        t = json.loads(raw)
        return t if isinstance(t, list) else [t]
    except (json.JSONDecodeError, TypeError):
        return [str(raw)]


def load_and_parse(csv_path: str) -> pd.DataFrame:
    """Load CSV, parse timestamps, explode JSON violation_type arrays into individual rows."""
    df = pd.read_csv(csv_path)

    # Parse timestamps and extract time features
    df['created_datetime'] = pd.to_datetime(df['created_datetime'], format='ISO8601')
    df['closed_datetime'] = pd.to_datetime(df['closed_datetime'], format='ISO8601', errors='coerce')
    df['hour'] = df['created_datetime'].dt.hour
    df['day_of_week'] = df['created_datetime'].dt.dayofweek
    df['month'] = df['created_datetime'].dt.month
    df['date'] = df['created_datetime'].dt.date

    # Explode JSON violation_type
    print(f"  Exploding {len(df):,} rows with JSON violation_type...")
    all_types = df['violation_type'].apply(_parse_violation_types)
    df = df.loc[df.index.repeat(all_types.str.len())].copy()
    df['single_violation'] = np.concatenate([t for t in all_types])
    print(f"  Result: {len(df):,} violation events")
    return df


def estimate_duration(df: pd.DataFrame) -> pd.DataFrame:
    """Estimate parking duration (closed_datetime is 100% null). Formula: base × vehicle_factor × time_factor."""
    base = df['single_violation'].map(DURATION_BY_TYPE).fillna(35)
    v_factor = df['vehicle_type'].map(VEHICLE_ADJUSTMENT).fillna(1.0)

    hour = df['created_datetime'].dt.hour
    t_factor = np.where(
        (hour >= 8) & (hour <= 10), 1.2,
        np.where((hour >= 17) & (hour <= 20), 1.2,
        np.where((hour >= 22) | (hour <= 5), 0.7, 1.0))
    )

    df['duration_minutes'] = (base * v_factor * t_factor).round(1)
    print(f"  Duration: min={df['duration_minutes'].min()}, max={df['duration_minutes'].max()}, nulls={df['duration_minutes'].isna().sum()}")
    return df


def classify_severity(df: pd.DataFrame) -> pd.DataFrame:
    """Classify violations: 3=critical (double parking, main road), 2=high (footpath, crossing, hospital), 1=standard."""
    df['severity'] = df['single_violation'].map(SEVERITY_MAP).fillna(1).astype(int)
    print(f"  Severity: {dict(df['severity'].value_counts().sort_index())}")
    return df


def map_to_nearest_junction(df: pd.DataFrame, junction_coords: dict) -> pd.DataFrame:
    """Map 'No Junction' records (~50%) to nearest known junction using vectorized Euclidean distance."""
    df['mapped_junction'] = df['junction_name']

    if not junction_coords:
        print("  No junction coords provided — skipping mapping")
        return df

    jnames = list(junction_coords.keys())
    jlats = np.array([junction_coords[j][0] for j in jnames])
    jlons = np.array([junction_coords[j][1] for j in jnames])

    needs_map = (df['junction_name'] == 'No Junction') | df['junction_name'].isna()

    if needs_map.any():
        lats = df.loc[needs_map, 'latitude'].values[:, None]
        lons = df.loc[needs_map, 'longitude'].values[:, None]
        # Batch to avoid huge memory (process 50K rows at a time)
        batch_size = 50_000
        nearest = []
        for i in range(0, len(lats), batch_size):
            batch_lats, batch_lons = lats[i:i+batch_size], lons[i:i+batch_size]
            dists = np.sqrt((batch_lats - jlats)**2 + (batch_lons - jlons)**2) * 111000
            nearest.extend([jnames[j] for j in dists.argmin(axis=1)])
        df.loc[needs_map, 'mapped_junction'] = nearest

    mapped = (df['mapped_junction'] != 'No Junction').sum()
    print(f"  Junction mapping: {mapped:,}/{len(df):,} mapped")
    return df


def run_pipeline(csv_path: str, junction_coords: dict = None, output_dir: str = None) -> pd.DataFrame:
    """Run full Stage 1: load → explode → duration → severity → junction mapping."""
    print("=" * 60)
    print("Stage 1: Data Pipeline")
    print("=" * 60)

    print("\n[1/4] Loading and parsing CSV...")
    df = load_and_parse(csv_path)

    print("\n[2/4] Estimating parking duration...")
    df = estimate_duration(df)

    print("\n[3/4] Classifying severity...")
    df = classify_severity(df)

    print("\n[4/4] Mapping 'No Junction' records...")
    df = map_to_nearest_junction(df, junction_coords or {})

    if output_dir:
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        csv_out = out_path / "violations_scored.csv"
        df.to_csv(csv_out, index=False)
        print(f"\n  Saved: {csv_out} ({len(df):,} rows)")

    print("=" * 60)
    print("Stage 1 complete.")
    print("=" * 60)
    return df


if __name__ == '__main__':
    df = run_pipeline(csv_path='data/raw/violations.csv', output_dir='data/processed')
    print(f"\nShape: {df.shape}")
