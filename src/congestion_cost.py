"""Stage 2: Congestion Damage Score — Quantifies actual congestion impact per violation."""

import numpy as np
import pandas as pd

# Vehicle width (meters) for lane blockage
VEHICLE_WIDTH = {
    'SCOOTER': 0.8, 'MOTOR CYCLE': 0.7, 'MOPED': 0.6,
    'PASSENGER AUTO': 1.5, 'CAR': 1.8, 'MAXI-CAB': 1.8, 'VAN': 1.8,
    'JEEP': 2.0, 'GOODS AUTO': 1.8, 'TEMPO': 2.0,
    'LGV': 2.2, 'MINI LORRY': 2.2,
    'BUS (BMTC/KSRTC)': 2.5, 'HGV': 2.5, 'TANKER': 2.5,
    'PRIVATE BUS': 2.5, 'TOURIST BUS': 2.5, 'SCHOOL VEHICLE': 2.0, 'OTHERS': 1.8,
}

# Vehicle size multiplier (larger = more delay)
VEHICLE_SIZE_MULT = {
    'TANKER': 2.5, 'BUS (BMTC/KSRTC)': 2.5, 'HGV': 2.5,
    'PRIVATE BUS': 2.5, 'TOURIST BUS': 2.5,
    'LGV': 2.2, 'MINI LORRY': 2.2,
    'CAR': 1.8, 'VAN': 1.8, 'MAXI-CAB': 1.8, 'JEEP': 1.8,
    'TEMPO': 1.8, 'GOODS AUTO': 1.8,
    'PASSENGER AUTO': 1.0, 'SCOOTER': 1.0, 'MOTOR CYCLE': 1.0,
    'MOPED': 1.0, 'SCHOOL VEHICLE': 1.0, 'OTHERS': 1.0,
}

DEFAULT_LANE_WIDTH = 3.5  # Bengaluru default


def compute_distance_to_junction(df: pd.DataFrame, junction_coords: dict) -> pd.DataFrame:
    """Compute distance (meters) from each violation to its mapped junction."""
    if not junction_coords:
        df['junction_distance'] = 50.0
        return df

    jnames = list(junction_coords.keys())
    jlats = np.array([junction_coords[j][0] for j in jnames])
    jlons = np.array([junction_coords[j][1] for j in jnames])

    # Vectorized lookup via reindex
    junc_lats = df['mapped_junction'].map(dict(zip(jnames, jlats)))
    junc_lons = df['mapped_junction'].map(dict(zip(jnames, jlons)))

    df['junction_distance'] = (
        np.sqrt((df['latitude'] - junc_lats)**2 + (df['longitude'] - junc_lons)**2) * 111000
    ).fillna(50.0).round(1)

    print(f"  Junction distance: min={df['junction_distance'].min():.0f}m, max={df['junction_distance'].max():.0f}m, mean={df['junction_distance'].mean():.0f}m")
    return df


def compute_congestion_cost(df: pd.DataFrame, junction_coords: dict, road_width: float = 7.0) -> pd.DataFrame:
    """
    Compute Congestion Damage Score for every violation.

    Formula: delay = duration × lane_block × peak × junction_mult × vehicle_mult × severity

    This replaces raw violation counts with actual congestion impact (vehicle-minutes of delay).
    """
    print("\n  Computing Congestion Damage Score...")

    # Step 1: Junction distance
    df = compute_distance_to_junction(df, junction_coords)

    # Step 2: Lane blockage (vehicle_width / half_road_width), capped at 1.0
    veh_width = df['vehicle_type'].map(VEHICLE_WIDTH).fillna(1.8)
    df['lane_block'] = (veh_width / (road_width / 2)).clip(upper=1.0).round(3)

    # Step 3: Peak hour multiplier (vectorized)
    hour = df['created_datetime'].dt.hour
    df['peak'] = np.where(
        ((hour >= 7) & (hour < 10)) | ((hour >= 17) & (hour <= 20)), 2.0,
        np.where((hour >= 22) | (hour <= 5), 0.5, 1.0)
    )

    # Step 4: JunctionGuard multiplier (vectorized with np.select)
    dist = df['junction_distance']
    df['junction_mult'] = np.select(
        [dist < 10, dist < 30, dist < 50],
        [3.0, 2.0, 1.5],
        default=1.0
    )

    # Step 5: Vehicle size multiplier
    df['vehicle_mult'] = df['vehicle_type'].map(VEHICLE_SIZE_MULT).fillna(1.0)

    # Step 6: THE FORMULA
    df['congestion_cost'] = (
        df['duration_minutes'] * df['lane_block'] * df['peak']
        * df['junction_mult'] * df['vehicle_mult'] * df['severity']
    ).round(2)

    # Step 7: Gridlock Score (0-100)
    max_cost = df['congestion_cost'].max()
    df['gridlock_score'] = (df['congestion_cost'] / max_cost * 100).clip(0, 100).round(1) if max_cost > 0 else 0.0

    print(f"  CongestionCost: min={df['congestion_cost'].min():.2f}, max={df['congestion_cost'].max():.2f}, mean={df['congestion_cost'].mean():.2f}")
    print(f"  Gridlock Score: min={df['gridlock_score'].min():.1f}, max={df['gridlock_score'].max():.1f}")
    return df


def get_counter_intuitive_examples(df: pd.DataFrame, n: int = 5):
    """Find junctions with low violation count but high total delay (proves count heatmaps are misleading)."""
    stats = df.groupby('mapped_junction').agg(
        total_delay=('congestion_cost', 'sum'),
        violation_count=('single_violation', 'count'),
        top_vehicle=('vehicle_type', lambda x: x.mode()[0] if len(x) > 0 else 'UNKNOWN'),
        avg_junction_dist=('junction_distance', 'mean'),
    ).reset_index()

    med_count = stats['violation_count'].median()
    med_delay = stats['total_delay'].median()

    examples = stats[(stats['violation_count'] < med_count) & (stats['total_delay'] > med_delay)].nlargest(n, 'total_delay')
    false_positives = stats[(stats['violation_count'] > med_count) & (stats['total_delay'] < med_delay)].nlargest(n, 'violation_count')
    return examples, false_positives, stats


def run_congestion_cost(df: pd.DataFrame, junction_coords: dict, road_width: float = 7.0) -> pd.DataFrame:
    """Run Stage 2: Compute Congestion Damage Score for all violations."""
    print("=" * 60)
    print("Stage 2: Congestion Damage Score + JunctionGuard")
    print("=" * 60)

    df = compute_congestion_cost(df, junction_coords, road_width)
    examples, false_positives, _ = get_counter_intuitive_examples(df)

    print("\n  Counter-Intuitive Examples (low count, high delay):")
    for _, r in examples.head(3).iterrows():
        print(f"    {r['mapped_junction']}: {r['violation_count']:.0f} violations => {r['total_delay']:.1f} vehicle-min delay")

    print("\n  False Positives (high count, low delay):")
    for _, r in false_positives.head(3).iterrows():
        print(f"    {r['mapped_junction']}: {r['violation_count']:.0f} violations => {r['total_delay']:.1f} vehicle-min delay")

    print("=" * 60)
    print("Stage 2 complete.")
    print("=" * 60)
    return df


if __name__ == '__main__':
    df = pd.read_csv('data/processed/violations_scored.csv')
    df['created_datetime'] = pd.to_datetime(df['created_datetime'])
    df = run_congestion_cost(df, junction_coords={})
    print(f"\nShape: {df.shape}")
