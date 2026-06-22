"""
Stage 10: Flipkart Green-Zone Module — Delivery Bay Optimization.

Identifies delivery vehicle parking hotspots and recommends
Dynamic Loading Windows to reduce last-mile delivery delays.
"""

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from typing import Dict, List
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import get_config_value


# Delivery vehicle types
DELIVERY_VEHICLE_TYPES = {
    'GOODS AUTO', 'TEMPO', 'VAN', 'LGV', 'MINI LORRY',
}

# Commercial zone keywords
COMMERCIAL_KEYWORDS = [
    'market', 'mall', 'commercial', 'tech', 'park', 'hub',
    'koramangala', 'indiranagar', 'whitefield', 'electronic city',
]


def identify_delivery_violations(df: pd.DataFrame) -> pd.DataFrame:
    """Filter to delivery vehicle violations only."""
    if 'vehicle_type' in df.columns:
        delivery_mask = df['vehicle_type'].isin(DELIVERY_VEHICLE_TYPES)
    else:
        delivery_mask = pd.Series(False, index=df.index)
    
    delivery_df = df[delivery_mask].copy()
    print(f"  Delivery violations: {len(delivery_df):,} / {len(df):,} ({len(delivery_df)/len(df)*100:.1f}%)")
    return delivery_df


def cluster_delivery_hotspots(
    df: pd.DataFrame,
    eps: float = 0.003,
    min_samples: int = 3,
) -> pd.DataFrame:
    """
    Cluster delivery violations by location using DBSCAN.
    
    Returns DataFrame with cluster centers and stats.
    """
    if len(df) < min_samples:
        return pd.DataFrame()
    
    coords = df[['latitude', 'longitude']].to_numpy()
    
    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean')
    df = df.copy()
    df['cluster_id'] = clustering.fit_predict(coords)
    
    # Skip noise (cluster_id == -1)
    clustered = df[df['cluster_id'] != -1]
    
    if len(clustered) == 0:
        return pd.DataFrame()
    
    # Aggregate by cluster
    cluster_stats = clustered.groupby('cluster_id').agg(
        center_lat=('latitude', 'mean'),
        center_lon=('longitude', 'mean'),
        violation_count=('single_violation', 'count'),
        avg_congestion=('congestion_cost', 'mean'),
        total_congestion=('congestion_cost', 'sum'),
        unique_vehicles=('vehicle_number', 'nunique') if 'vehicle_number' in df.columns else ('vehicle_type', 'count'),
        top_vehicle=('vehicle_type', lambda x: x.value_counts().idxmax() if len(x) > 0 else 'Unknown'),
    ).reset_index()
    
    # Sort by violation count
    cluster_stats = cluster_stats.sort_values('violation_count', ascending=False)
    
    print(f"  Delivery clusters: {len(cluster_stats)} hotspots identified")
    return cluster_stats


def analyze_temporal_patterns(df: pd.DataFrame) -> pd.DataFrame:
    """Analyze delivery violation patterns by hour of day."""
    if 'created_datetime' not in df.columns:
        if 'hour' in df.columns:
            df = df.copy()
        else:
            return pd.DataFrame()
    else:
        df = df.copy()
        df['hour'] = df['created_datetime'].dt.hour
    
    hourly = df.groupby('hour').agg(
        violation_count=('single_violation', 'count'),
        avg_congestion=('congestion_cost', 'mean'),
    ).reset_index()
    
    hourly['hour'] = hourly['hour'].astype(int)
    return hourly


def recommend_loading_windows(
    cluster_stats: pd.DataFrame,
    df: pd.DataFrame,
) -> List[Dict]:
    """
    Recommend dynamic loading windows for each delivery hotspot.
    
    Logic:
    - Peak delivery hours: 11AM-1PM (lunch), 5PM-8PM (evening)
    - If violations concentrated in these hours → recommend loading bays
    - If violations spread throughout → recommend enforcement
    """
    recommendations = []
    
    for _, cluster in cluster_stats.iterrows():
        # Get hourly pattern for this cluster
        cluster_df = df[df['cluster_id'] == cluster['cluster_id']] if 'cluster_id' in df.columns else df
        
        if 'created_datetime' in cluster_df.columns:
            cluster_df = cluster_df.copy()
            cluster_df['hour'] = cluster_df['created_datetime'].dt.hour
            hourly_counts = cluster_df.groupby('hour').size()
        else:
            hourly_counts = pd.Series(dtype=int)
        
        # Find peak hours
        if len(hourly_counts) > 0:
            peak_hours = hourly_counts.nlargest(3).index.tolist()
            peak_hours.sort()
        else:
            peak_hours = [12, 17, 18]
        
        # Determine recommended windows
        # If most violations are during delivery peaks → recommend loading bays
        morning_peak = sum(hourly_counts.get(h, 0) for h in range(7, 10))
        lunch_peak = sum(hourly_counts.get(h, 0) for h in range(11, 14))
        evening_peak = sum(hourly_counts.get(h, 0) for h in range(17, 20))
        total = hourly_counts.sum() if len(hourly_counts) > 0 else 1
        
        if lunch_peak / total > 0.3:
            window = "11:00-13:00"
            bay_count = max(2, cluster['violation_count'] // 5)
        elif evening_peak / total > 0.3:
            window = "17:00-19:00"
            bay_count = max(2, cluster['violation_count'] // 5)
        else:
            window = "11:00-13:00, 17:00-19:00"
            bay_count = max(3, cluster['violation_count'] // 4)
        
        # Estimate impact
        violations_per_day = cluster['violation_count'] / 20  # ~20 weeks in dataset
        delay_reduction_min = min(15, violations_per_day * 0.5)
        daily_cost_saving = violations_per_day * 50  # ₹50 per violation in delay cost
        
        # Zone name (use junction or coordinates)
        zone_name = f"Zone ({cluster['center_lat']:.4f}, {cluster['center_lon']:.4f})"
        
        recommendations.append({
            'zone_name': zone_name,
            'center_lat': round(cluster['center_lat'], 6),
            'center_lon': round(cluster['center_lon'], 6),
            'delivery_violations_per_week': round(violations_per_day * 7),
            'recommended_bays': bay_count,
            'recommended_window': window,
            'peak_hours': peak_hours,
            'estimated_delay_reduction_min': round(delay_reduction_min, 1),
            'estimated_daily_cost_saving_inr': round(daily_cost_saving),
            'priority': 'HIGH' if violations_per_day > 5 else 'MEDIUM' if violations_per_day > 2 else 'LOW',
        })
    
    # Sort by priority
    priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    recommendations.sort(key=lambda x: priority_order.get(x['priority'], 99))
    
    return recommendations


def compute_flipkart_impact(recommendations: List[Dict]) -> Dict:
    """Compute city-wide impact of implementing all recommendations."""
    total_violations_per_week = sum(r['delivery_violations_per_week'] for r in recommendations)
    total_bays = sum(r['recommended_bays'] for r in recommendations)
    avg_delay_reduction = np.mean([r['estimated_delay_reduction_min'] for r in recommendations]) if recommendations else 0
    total_daily_savings = sum(r['estimated_daily_cost_saving_inr'] for r in recommendations)
    
    return {
        'total_delivery_hotspots': len(recommendations),
        'total_violations_per_week': total_violations_per_week,
        'violations_reducible_pct': round(min(35, total_violations_per_week / 10), 1),
        'total_bays_needed': total_bays,
        'avg_delivery_time_saved_min': round(avg_delay_reduction, 1),
        'daily_savings_inr': round(total_daily_savings),
        'annual_savings_inr': round(total_daily_savings * 365),
        'annual_savings_crores': round(total_daily_savings * 365 / 10000000, 2),
    }


def run_flipkart_logistics(df: pd.DataFrame) -> Dict:
    """
    Run Stage 10: Flipkart Green-Zone analysis.
    
    Returns:
        Dict with recommendations, impact metrics, and hourly patterns.
    """
    print("=" * 60)
    print("Stage 10: Flipkart Green-Zone Module")
    print("=" * 60)
    
    # Identify delivery violations
    delivery_df = identify_delivery_violations(df)
    
    if len(delivery_df) < 3:
        print("  Insufficient delivery violations for analysis")
        return {
            'status': 'insufficient_data',
            'recommendations': [],
            'impact': compute_flipkart_impact([]),
        }
    
    # Cluster hotspots
    cluster_stats = cluster_delivery_hotspots(delivery_df)
    
    if len(cluster_stats) == 0:
        print("  No delivery clusters found")
        return {
            'status': 'no_clusters',
            'recommendations': [],
            'impact': compute_flipkart_impact([]),
        }
    
    # Temporal patterns
    hourly_patterns = analyze_temporal_patterns(delivery_df)
    
    # Generate recommendations
    recommendations = recommend_loading_windows(cluster_stats, delivery_df)
    
    # Compute impact
    impact = compute_flipkart_impact(recommendations)
    
    result = {
        'status': 'success',
        'recommendations': recommendations,
        'impact': impact,
        'hourly_patterns': hourly_patterns.to_dict('records') if len(hourly_patterns) > 0 else [],
        'cluster_count': len(cluster_stats),
    }
    
    print(f"\n  Recommendations: {len(recommendations)} zones")
    for r in recommendations[:3]:
        print(f"    [{r['priority']}] {r['zone_name']}: "
              f"{r['recommended_bays']} bays, {r['recommended_window']}")
    print(f"\n  Impact:")
    print(f"    Hotspots: {impact['total_delivery_hotspots']}")
    print(f"    Bays needed: {impact['total_bays_needed']}")
    print(f"    Time saved: {impact['avg_delivery_time_saved_min']} min/delivery")
    print(f"    Annual savings: Rs. {impact['annual_savings_crores']} Cr")
    
    print("Stage 10 complete.")
    print("=" * 60)
    
    return result


if __name__ == '__main__':
    import json
    from src.data_pipeline import run_pipeline
    from src.congestion_cost import run_congestion_cost
    
    with open('data/external/junction_coords.json', 'r', encoding='utf-8') as f:
        coords = json.load(f)
    
    df = run_pipeline('data/raw/violations.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords)
    
    result = run_flipkart_logistics(df)
    
    if result['status'] == 'success':
        print("\nTop 3 Recommendations:")
        for r in result['recommendations'][:3]:
            print(json.dumps(r, indent=2))
