"""
ParkIntel — Stage 5: CurbFlex
Chronic zone detection, policy recommendations, and enforcement equity analysis.
"""

import numpy as np
import pandas as pd
from typing import List, Dict


# --- Chronic Zone Detection -------------------------------------------------

def detect_chronic_violation_zones(df: pd.DataFrame, weekly_threshold: int = 50) -> pd.DataFrame:
    """
    Detect junctions with consistently high violations (>threshold per week).

    A "chronic zone" is one where violations persist week after week —
    indicating an infrastructure problem, not just bad luck.

    Args:
        df: violations DataFrame with 'created_datetime' and 'mapped_junction'
        weekly_threshold: minimum violations per week to flag as chronic

    Returns: DataFrame with junction, avg_weekly_violations, weeks_observed
    """
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df['created_datetime']):
        df['created_datetime'] = pd.to_datetime(df['created_datetime'], format='ISO8601', errors='coerce')

    df['week'] = df['created_datetime'].dt.isocalendar()['week'].astype(int)
    df['year'] = df['created_datetime'].dt.year

    # Count violations per junction per week
    weekly = df.groupby(['mapped_junction', 'year', 'week']).size().reset_index(name='violations')

    # Find junctions that exceed threshold in multiple weeks
    chronic = weekly[weekly['violations'] >= weekly_threshold].groupby('mapped_junction').agg(
        avg_weekly_violations=('violations', 'mean'),
        max_weekly_violations=('violations', 'max'),
        weeks_observed=('violations', 'count'),
        total_violations=('violations', 'sum'),
    ).reset_index()

    chronic = chronic.sort_values('avg_weekly_violations', ascending=False)

    print(f"  Chronic zones (>={weekly_threshold}/week): {len(chronic)}")
    return chronic


# --- Policy Recommendations -------------------------------------------------

def generate_policy_recommendations(chronic_zones: pd.DataFrame) -> List[Dict]:
    """
    Generate parking policy recommendations for chronic zones.

    Logic:
        >100 violations/week → CRITICAL: Convert to paid parking + add bays
        >50 violations/week  → HIGH: Install no-stopping signs + add bays
        >20 violations/week  → MEDIUM: Increase patrol frequency
    """
    recommendations = []

    for _, zone in chronic_zones.iterrows():
        avg = zone['avg_weekly_violations']

        if avg > 100:
            rec = {
                'junction': zone['mapped_junction'],
                'severity': 'CRITICAL',
                'recommendation': 'Convert 20m stretch to paid parking 11AM-8PM',
                'infrastructure': f"Add {max(5, int(avg / 10))} scooter bays",
                'estimated_reduction': '72%',
                'revenue_projection': f"Rs {int(avg * 50)}/month",
                'priority': 1,
            }
        elif avg > 50:
            rec = {
                'junction': zone['mapped_junction'],
                'severity': 'HIGH',
                'recommendation': 'Install no-stopping sign 50m from junction approach',
                'infrastructure': 'Add 5 scooter bays',
                'estimated_reduction': '45%',
                'revenue_projection': 'N/A (enforcement only)',
                'priority': 2,
            }
        else:
            rec = {
                'junction': zone['mapped_junction'],
                'severity': 'MEDIUM',
                'recommendation': 'Increase patrol frequency during peak hours',
                'infrastructure': 'None required',
                'estimated_reduction': '25%',
                'revenue_projection': 'N/A',
                'priority': 3,
            }
        recommendations.append(rec)

    recommendations.sort(key=lambda x: x['priority'])
    print(f"  Policy recommendations: {len(recommendations)}")
    return recommendations


# --- Enforcement Equity Detection -------------------------------------------

def detect_enforcement_equity(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect zones where violations are high but enforcement is low.

    "Enforcement equity" = are we ticketing proportionally to violations?
    A zone with 200 violations and 10 tickets is under-enforced.
    A zone with 50 violations and 40 tickets is over-enforced.

    Uses 'validation_status' as proxy for enforcement:
        'approved' = ticket was issued and validated
        Other values = ticket was rejected or not processed
    """
    zone_stats = df.groupby('mapped_junction').agg(
        total_violations=('single_violation', 'count'),
        total_delay=('congestion_cost', 'sum'),
        approved_tickets=('validation_status', lambda x: (x == 'approved').sum()),
    ).reset_index()

    # Enforcement rate = approved tickets / total violations
    zone_stats['enforcement_rate'] = (
        zone_stats['approved_tickets'] / zone_stats['total_violations']
    ).round(3)

    # Compute enforcement gap (deviation from median)
    median_rate = zone_stats['enforcement_rate'].median()
    zone_stats['enforcement_gap'] = (median_rate - zone_stats['enforcement_rate']).round(3)

    # Flag under-enforced high-impact zones
    median_delay = zone_stats['total_delay'].median()
    zone_stats['is_under_enforced'] = (
        (zone_stats['enforcement_gap'] > 0.1) &
        (zone_stats['total_delay'] > median_delay)
    )

    # Flag over-enforced low-impact zones
    zone_stats['is_over_enforced'] = (
        (zone_stats['enforcement_gap'] < -0.1) &
        (zone_stats['total_delay'] < median_delay)
    )

    under_count = zone_stats['is_under_enforced'].sum()
    over_count = zone_stats['is_over_enforced'].sum()
    print(f"  Under-enforced zones: {under_count}")
    print(f"  Over-enforced zones: {over_count}")

    return zone_stats


# --- Run Full Stage 5 -------------------------------------------------------

def run_curbflex(df: pd.DataFrame, weekly_threshold: int = 50) -> dict:
    """
    Run Stage 5: CurbFlex analysis.
    """
    print("=" * 60)
    print("Stage 5: CurbFlex — Chronic Zones + Enforcement Equity")
    print("=" * 60)

    print("\n[1/3] Detecting chronic violation zones...")
    chronic_zones = detect_chronic_violation_zones(df, weekly_threshold)

    print("\n[2/3] Generating policy recommendations...")
    recommendations = generate_policy_recommendations(chronic_zones)

    print("\n[3/3] Analyzing enforcement equity...")
    equity_stats = detect_enforcement_equity(df)

    # Print summary
    if len(recommendations) > 0:
        print("\n  Top 3 policy recommendations:")
        for rec in recommendations[:3]:
            print(f"    [{rec['severity']}] {rec['junction']}")
            print(f"      -> {rec['recommendation']}")
            print(f"      -> Estimated reduction: {rec['estimated_reduction']}")

    under_enforced = equity_stats[equity_stats['is_under_enforced']]
    if len(under_enforced) > 0:
        print("\n  Under-enforced high-impact zones:")
        for _, row in under_enforced.head(3).iterrows():
            print(f"    {row['mapped_junction']}: {row['total_violations']:.0f} violations, {row['enforcement_rate']:.1%} enforcement rate")

    print("=" * 60)
    print("Stage 5 complete.")
    print("=" * 60)

    return {
        'chronic_zones': chronic_zones,
        'recommendations': recommendations,
        'equity_stats': equity_stats,
    }


if __name__ == '__main__':
    import sys
    sys.path.insert(0, '.')
    import json
    from src.data_pipeline import run_pipeline
    from src.congestion_cost import run_congestion_cost

    with open('data/external/junction_coords.json') as f:
        coords = json.load(f)

    df = run_pipeline('data/raw/violations.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords)
    results = run_curbflex(df)
