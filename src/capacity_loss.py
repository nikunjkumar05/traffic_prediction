"""
Stage 7: Road Capacity Loss Engine — Quantifies exact percentage of road capacity lost to illegal parking.

Core Innovation: Instead of counting violations, we measure:
  "This junction is operating at 60% capacity."

Formula:
  Capacity Loss % = (blocked_width / total_road_width) × 100
  
Operational Status:
  > 70% capacity = GREEN (normal flow)
  50-70% = YELLOW (degraded flow)
  < 50% = RED (bottleneck forming)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import get_config_value


# ── Constants ────────────────────────────────────────────────────────────────

# Default road widths (meters) for Bengaluru road types
ROAD_WIDTHS = {
    'arterial': 12.0,      # 4-lane divided
    'main_road': 7.0,      # 2-lane
    'collector': 5.5,      # narrow 2-lane
    'local': 3.5,          # single lane
    'footpath': 1.5,       # pedestrian path (blocked by 2-wheelers)
}

# Vehicle widths in meters (from config, with defaults)
DEFAULT_VEHICLE_WIDTHS = {
    'SCOOTER': 0.8, 'MOTOR CYCLE': 0.7, 'MOPED': 0.6,
    'PASSENGER AUTO': 1.5, 'GOODS AUTO': 1.8,
    'CAR': 1.8, 'VAN': 1.8, 'MAXI-CAB': 1.8, 'JEEP': 2.0,
    'TEMPO': 2.0, 'LGV': 2.2, 'MINI LORRY': 2.2,
    'BUS (BMTC/KSRTC)': 2.5, 'HGV': 2.5, 'TANKER': 2.5,
    'PRIVATE BUS': 2.5, 'TOURIST BUS': 2.5,
    'SCHOOL VEHICLE': 2.0, 'OTHERS': 1.8,
}

# Violation types that block footpath (pedestrian → carriageway spillover)
FOOTPATH_VIOLATIONS = {
    'PARKING ON FOOTPATH',
    'PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC',
}


def get_vehicle_width(vehicle_type: str) -> float:
    """Get vehicle width in meters from config or defaults."""
    config_widths = get_config_value('formula', 'congestion', {}).get('vehicle_width', {})
    return config_widths.get(vehicle_type, DEFAULT_VEHICLE_WIDTHS.get(vehicle_type, 1.8))


def get_road_width(road_type: str = 'main_road') -> float:
    """Get road width in meters for the given road type."""
    return ROAD_WIDTHS.get(road_type, 7.0)


def classify_road_type(row: pd.Series) -> str:
    """Classify road type based on junction proximity and violation context."""
    junction_dist = row.get('junction_distance', 50.0)
    violation = row.get('single_violation', '')
    
    if violation in FOOTPATH_VIOLATIONS:
        return 'footpath'
    if junction_dist < 10:
        return 'arterial'
    if junction_dist < 30:
        return 'main_road'
    if junction_dist < 50:
        return 'collector'
    return 'local'


def compute_blocked_width(row: pd.Series) -> float:
    """Compute width blocked by a single parked vehicle (meters)."""
    vehicle_type = row.get('vehicle_type', 'CAR')
    width = get_vehicle_width(vehicle_type)
    
    # Double parking blocks ~2x width
    violation = row.get('single_violation', '')
    if violation == 'DOUBLE PARKING':
        width *= 1.8
    elif violation == 'PARKING IN A MAIN ROAD':
        width *= 1.3
    
    return round(width, 2)


def compute_capacity_loss_single(row: pd.Series) -> Dict:
    """
    Compute capacity loss metrics for a single violation.
    
    Returns dict with:
        - blocked_width_m: meters of road blocked
        - road_width_m: total road width
        - capacity_loss_pct: percentage of capacity lost
        - operational_status: GREEN/YELLOW/RED
        - is_footpath_violation: whether this blocks pedestrians
        - pedestrian_spillover_risk: estimated pedestrian-on-road impact
    """
    blocked_width = compute_blocked_width(row)
    road_type = classify_road_type(row)
    road_width = get_road_width(road_type)
    
    # For footpath violations, calculate pedestrian spillover
    is_footpath = road_type == 'footpath'
    pedestrian_spillover = 0.0
    if is_footpath:
        # When footpath is blocked, ~60% of pedestrians spill onto carriageway
        # Each pedestrian occupies ~0.5m of effective road width
        pedestrian_spillover = 0.6 * 0.5  # 0.3m effective carriageway loss
    
    # Total effective blocked width
    effective_blocked = blocked_width + pedestrian_spillover
    
    # Capacity loss percentage
    capacity_loss_pct = min(100.0, (effective_blocked / road_width) * 100)
    
    # Operational status
    remaining_capacity = 100 - capacity_loss_pct
    if remaining_capacity > 70:
        status = 'GREEN'
    elif remaining_capacity > 50:
        status = 'YELLOW'
    else:
        status = 'RED'
    
    return {
        'blocked_width_m': round(blocked_width, 2),
        'road_width_m': road_width,
        'road_type': road_type,
        'capacity_loss_pct': round(capacity_loss_pct, 1),
        'remaining_capacity_pct': round(100 - capacity_loss_pct, 1),
        'operational_status': status,
        'is_footpath_violation': is_footpath,
        'pedestrian_spillover_m': round(pedestrian_spillover, 2),
    }


def compute_junction_capacity(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute aggregate capacity loss per junction.
    
    Aggregates all violations at each junction to calculate total
    blocked width and junction-level operational status.
    """
    print("  Computing junction-level capacity...")
    
    # Compute per-violation capacity metrics
    capacity_data = df.apply(compute_capacity_loss_single, axis=1, result_type='expand')
    df = pd.concat([df, capacity_data], axis=1)
    
    # Aggregate by junction
    junction_stats = df.groupby('mapped_junction').agg(
        total_blocked_width=('blocked_width_m', 'sum'),
        avg_road_width=('road_width_m', 'mean'),
        violation_count=('single_violation', 'count'),
        footpath_violations=('is_footpath_violation', 'sum'),
        total_pedestrian_spillover=('pedestrian_spillover_m', 'sum'),
    ).reset_index()
    
    # Junction-level capacity loss
    # Use mean blocked width (typical vehicle size) scaled by a congestion
    # multiplier that grows logarithmically with violation count.
    # A hard cap at 70% of road width ensures some clearance always exists.
    mean_blocked = junction_stats['total_blocked_width'] / junction_stats['violation_count'].replace(0, 1)
    scaling = np.log1p(junction_stats['violation_count']) * 0.3
    effective_blocked = (mean_blocked * scaling).clip(upper=junction_stats['avg_road_width'] * 0.7)
    junction_stats['junction_capacity_loss_pct'] = (
        (effective_blocked / junction_stats['avg_road_width']) * 100
    ).clip(upper=100).round(1)
    
    junction_stats['junction_remaining_pct'] = (
        100 - junction_stats['junction_capacity_loss_pct']
    ).round(1)
    
    # Operational status per junction
    junction_stats['operational_status'] = pd.cut(
        junction_stats['junction_remaining_pct'],
        bins=[0, 50, 70, 100],
        labels=['RED', 'YELLOW', 'GREEN'],
        include_lowest=True,
    )
    
    # Footpath impact score
    junction_stats['footpath_impact_score'] = (
        junction_stats['footpath_violations'] * junction_stats['total_pedestrian_spillover'] * 10
    ).round(1)
    
    # Sort by capacity loss (worst first)
    junction_stats = junction_stats.sort_values('junction_capacity_loss_pct', ascending=False)
    
    # Summary stats
    red_count = (junction_stats['operational_status'] == 'RED').sum()
    yellow_count = (junction_stats['operational_status'] == 'YELLOW').sum()
    green_count = (junction_stats['operational_status'] == 'GREEN').sum()
    
    print(f"  Junction capacity: {red_count} RED, {yellow_count} YELLOW, {green_count} GREEN")
    print(f"  Worst junction: {junction_stats.iloc[0]['mapped_junction']} at "
          f"{junction_stats.iloc[0]['junction_capacity_loss_pct']}% capacity loss")
    
    return df, junction_stats


def compute_gpi(
    capacity_loss_pct: float,
    cascade_risk: float = 0.0,
    temporal_urgency: float = 0.0,
    spatial_density: float = 0.0,
    weights: Optional[Dict[str, float]] = None,
) -> float:
    """
    Gridlock Propagation Index (GPI) — Novel 0-100 composite metric.

    Combines four dimensions of congestion risk:
      30% — Cascade risk (max upstream correlation)
      30% — Capacity degradation (100 - remaining_capacity_pct)
      20% — Temporal urgency (peak multiplier x presence probability)
      20% — Spatial density (nearby violation concentration)

    GPI = 0.30*CR_norm + 0.30*CD_norm + 0.20*TU_norm + 0.20*SD_norm
    """
    if weights is None:
        w = get_config_value('gpi', 'weights', {'cascade': 0.30, 'capacity': 0.30, 'temporal': 0.20, 'density': 0.20})
    else:
        w = weights

    cap_norm = min(100.0, max(0.0, float(capacity_loss_pct)))
    cas_norm = min(100.0, max(0.0, float(cascade_risk) * 100.0))
    temp_norm = min(100.0, max(0.0, float(temporal_urgency) * 100.0))
    dens_norm = min(100.0, max(0.0, float(spatial_density) * 100.0))

    gpi = (
        w.get('cascade', 0.30) * cas_norm +
        w.get('capacity', 0.30) * cap_norm +
        w.get('temporal', 0.20) * temp_norm +
        w.get('density', 0.20) * dens_norm
    )
    return round(gpi, 1)


def compute_junction_gpi(
    junction_data: pd.Series,
    cascade_risk_map: Optional[Dict[str, float]] = None,
) -> float:
    cap_loss = float(junction_data.get('junction_capacity_loss_pct', 0))
    density_raw = float(junction_data.get('violation_count', 0))
    density_norm = min(1.0, density_raw / 100.0)
    jname = str(junction_data.get('mapped_junction', ''))
    cascade_risk = cascade_risk_map.get(jname, 0.0) if cascade_risk_map else 0.0
    temporal = get_config_value('gpi', 'default_temporal_urgency', 0.7)
    return compute_gpi(capacity_loss_pct=cap_loss, cascade_risk=cascade_risk, temporal_urgency=temporal, spatial_density=density_norm)


def get_capacity_summary(junction_stats: pd.DataFrame) -> Dict:
    """Generate summary statistics for the capacity dashboard."""
    total_junctions = len(junction_stats)
    
    return {
        'total_junctions': total_junctions,
        'red_junctions': int((junction_stats['operational_status'] == 'RED').sum()),
        'yellow_junctions': int((junction_stats['operational_status'] == 'YELLOW').sum()),
        'green_junctions': int((junction_stats['operational_status'] == 'GREEN').sum()),
        'avg_capacity_loss_pct': round(junction_stats['junction_capacity_loss_pct'].mean(), 1),
        'worst_junction': junction_stats.iloc[0]['mapped_junction'] if total_junctions > 0 else 'N/A',
        'worst_capacity_loss_pct': round(junction_stats.iloc[0]['junction_capacity_loss_pct'], 1) if total_junctions > 0 else 0,
        'total_footpath_violations': int(junction_stats['footpath_violations'].sum()),
        'total_pedestrian_spillover_m': round(junction_stats['total_pedestrian_spillover'].sum(), 1),
    }


def run_capacity_loss(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Run Stage 7: Road Capacity Loss analysis.
    
    Returns:
        df: DataFrame with capacity metrics added
        junction_stats: Per-junction capacity summary
        summary: City-level capacity summary
    """
    print("=" * 60)
    print("Stage 7: Road Capacity Loss Engine")
    print("=" * 60)
    
    df, junction_stats = compute_junction_capacity(df)
    summary = get_capacity_summary(junction_stats)
    
    print(f"\n  City Summary:")
    print(f"    Average capacity loss: {summary['avg_capacity_loss_pct']}%")
    print(f"    RED junctions: {summary['red_junctions']}")
    print(f"    Footpath violations: {summary['total_footpath_violations']}")
    print(f"    Pedestrian spillover: {summary['total_pedestrian_spillover_m']}m")
    
    print("Stage 7 complete.")
    print("=" * 60)
    
    return df, junction_stats, summary


if __name__ == '__main__':
    import json
    from src.data_pipeline import run_pipeline
    from src.congestion_cost import run_congestion_cost
    
    with open('data/external/junction_coords.json', 'r', encoding='utf-8') as f:
        coords = json.load(f)
    
    df = run_pipeline('data/raw/violations.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords)
    df, junction_stats, summary = run_capacity_loss(df)
    
    print("\nTop 5 Junctions by Capacity Loss:")
    print(junction_stats[['mapped_junction', 'junction_capacity_loss_pct', 'operational_status', 'footpath_violations']].head())
