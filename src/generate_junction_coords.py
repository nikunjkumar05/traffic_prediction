"""
Generate junction coordinates FROM DATASET ONLY - No external sources.
This ensures compliance with HackerEarth Dataset Isolation Rule.
"""

import pandas as pd
import json
from pathlib import Path

def generate_junction_coords_from_dataset(csv_path: str, output_path: str = None):
    """
    Extract junction coordinates by taking median lat/lon per junction_name.
    
    This uses ONLY data from the HackerEarth dataset - no Google Maps, OSM, etc.
    """
    print("=" * 60)
    print("Generating Junction Coordinates FROM DATASET")
    print("=" * 60)
    
    # Load raw data
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df):,} violations")
    
    # Filter to records with junction names
    has_junction = (df['junction_name'] != 'No Junction') & (df['junction_name'].notna())
    df_junctions = df[has_junction].copy()
    
    print(f"Violations with junction: {len(df_junctions):,} ({100*len(df_junctions)/len(df):.1f}%)")
    
    # Group by junction_name and compute median coordinates
    junction_coords = {}
    grouped = df_junctions.groupby('junction_name')
    
    for name, group in grouped:
        if len(group) >= 3:  # Minimum threshold for reliability
            median_lat = group['latitude'].median()
            median_lon = group['longitude'].median()
            count = len(group)
            
            # Store as [lat, lon] with metadata
            junction_coords[name] = {
                'coords': [round(median_lat, 6), round(median_lon, 6)],
                'violation_count': count,
                'confidence': 'HIGH' if count >= 10 else 'MEDIUM' if count >= 5 else 'LOW'
            }
    
    print(f"\nGenerated {len(junction_coords)} junction coordinates")
    
    # Confidence breakdown
    confidence_counts = {}
    for junc, data in junction_coords.items():
        conf = data['confidence']
        confidence_counts[conf] = confidence_counts.get(conf, 0) + 1
    
    print(f"Confidence distribution: {confidence_counts}")
    
    # Save to JSON
    if output_path is None:
        output_path = 'data/external/junction_coords_from_dataset.json'
    
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Save simple format: {junction_name: [lat, lon]}
    simple_coords = {k: v['coords'] for k, v in junction_coords.items()}
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(simple_coords, f, indent=2)
    
    print(f"\nSaved to: {output_file}")
    print("=" * 60)
    
    return simple_coords


if __name__ == '__main__':
    coords = generate_junction_coords_from_dataset('data/raw/violations.csv')
    print(f"\nSample entries:")
    for i, (name, coord) in enumerate(list(coords.items())[:5]):
        print(f"  {name}: {coord}")
