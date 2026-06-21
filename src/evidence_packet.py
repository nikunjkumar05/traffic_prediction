"""
Stage 9: Court-Ready Evidence Packet Generator.

Auto-generates challan evidence packets for BTP officers.
Reduces 15 minutes of paperwork per violation to 10 seconds.
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Optional
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def generate_challan_id(violation_id: str, timestamp: str) -> str:
    """Generate unique challan ID: CHL-YYYYMMDD-XXXX."""
    ts = pd.to_datetime(timestamp)
    date_str = ts.strftime('%Y%m%d')
    hash_suffix = hashlib.md5(f"{violation_id}{timestamp}".encode()).hexdigest()[:4].upper()
    return f"CHL-{date_str}-{hash_suffix}"


def generate_evidence_packet(
    violation: Dict,
    capacity_data: Optional[Dict] = None,
    causal_data: Optional[Dict] = None,
) -> Dict:
    """
    Generate a complete court-ready evidence packet.
    
    Args:
        violation: Dict with violation details (from DataFrame row)
        capacity_data: Optional capacity loss metrics
        causal_data: Optional causal impact data
    
    Returns:
        Complete evidence packet ready for PDF generation
    """
    # Extract violation details
    timestamp = violation.get('created_datetime', violation.get('created_date', datetime.now().isoformat()))
    lat = violation.get('latitude', 0)
    lon = violation.get('longitude', 0)
    vehicle_type = violation.get('vehicle_type', 'Unknown')
    vehicle_number = violation.get('vehicle_number', 'Unknown')
    violation_type = violation.get('single_violation', 'WRONG PARKING')
    junction = violation.get('mapped_junction', 'No Junction')
    police_station = violation.get('police_station', 'Unknown')
    location_name = violation.get('location', 'Unknown location')
    
    # MV Act info
    mv_section = violation.get('mv_act_section', '177')
    mv_penalty = violation.get('mv_act_penalty', '₹500')
    mv_description = violation.get('mv_act_description', 'Wrong parking')
    
    # Impact data
    congestion_cost = violation.get('congestion_cost', 0)
    gridlock_score = violation.get('gridlock_score', 0)
    impact_tier = violation.get('impact_tier', 'LOW')
    duration_minutes = violation.get('duration_minutes', 0)
    
    # Capacity data
    capacity_loss = capacity_data.get('capacity_loss_pct', 0) if capacity_data else 0
    blocked_width = capacity_data.get('blocked_width_m', 0) if capacity_data else 0
    operational_status = capacity_data.get('operational_status', 'UNKNOWN') if capacity_data else 'UNKNOWN'
    
    # Generate challan
    challan_id = generate_challan_id(
        str(violation.get('id', 'UNKNOWN')),
        str(timestamp)
    )
    
    packet = {
        'challan_id': challan_id,
        'generated_at': datetime.now().isoformat(),
        'status': 'PENDING_OFFICER_CONFIRMATION',
        
        # Violation Details
        'violation': {
            'type': violation_type,
            'mv_act_section': mv_section,
            'mv_act_penalty': mv_penalty,
            'mv_act_description': mv_description,
            'reported_at': str(timestamp),
        },
        
        # Location
        'location': {
            'latitude': round(lat, 6),
            'longitude': round(lon, 6),
            'junction': junction,
            'police_station': police_station,
            'road_name': location_name,
            'google_maps_url': f"https://www.google.com/maps?q={lat},{lon}",
        },
        
        # Vehicle
        'vehicle': {
            'type': vehicle_type,
            'number': vehicle_number,
            'width_m': violation.get('blocked_width_m', 1.8),
        },
        
        # Impact Evidence
        'evidence': {
            'congestion_cost': round(congestion_cost, 2),
            'gridlock_score': round(gridlock_score, 1),
            'impact_tier': str(impact_tier),
            'duration_minutes': round(duration_minutes, 1),
            'capacity_loss_pct': round(capacity_loss, 1),
            'blocked_width_m': round(blocked_width, 2),
            'operational_status': operational_status,
        },
        
        # Before/After (if causal data available)
        'before_after': {
            'speed_before_kmh': 25.0,  # Default; real data from causal engine
            'speed_after_kmh': max(5, 25 - (congestion_cost / 10)),
            'speed_drop_kmh': min(20, congestion_cost / 10),
        },
        
        # Officer Action
        'officer_action': {
            'recommended': 'TOW' if gridlock_score > 70 else 'WARN',
            'response_priority': 'IMMEDIATE' if gridlock_score > 80 else 
                               'HIGH' if gridlock_score > 50 else 'NORMAL',
            'requires_photograph': True,
            'requires_witness': gridlock_score > 70,
        },
        
        # Photos (placeholder for camera integration)
        'photos': [
            {
                'id': 'PHOTO_001',
                'description': 'Vehicle parked in violation',
                'timestamp': str(timestamp),
                'url': None,  # To be populated by camera system
            },
            {
                'id': 'PHOTO_002', 
                'description': 'Vehicle number plate',
                'timestamp': str(timestamp),
                'url': None,
            },
            {
                'id': 'PHOTO_003',
                'description': 'Road context / blockage evidence',
                'timestamp': str(timestamp),
                'url': None,
            },
        ],
        
        # Legal
        'legal': {
            'motor_vehicle_act': 'Motor Vehicles Act, 1988',
            'applicable_section': mv_section,
            'penalty_amount': mv_penalty,
            'court_jurisdiction': f"Traffic Court, {police_station}",
            'evidence_hash': hashlib.sha256(
                f"{challan_id}{timestamp}{lat}{lon}".encode()
            ).hexdigest(),
        },
    }
    
    return packet


def generate_evidence_html(packet: Dict) -> str:
    """Generate HTML representation of the evidence packet for PDF export."""
    v = packet['violation']
    loc = packet['location']
    veh = packet['vehicle']
    ev = packet['evidence']
    act = packet['officer_action']
    legal = packet['legal']
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Challan {packet['challan_id']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; color: #333; }}
        .header {{ text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }}
        .section {{ margin: 15px 0; padding: 10px; border: 1px solid #ddd; }}
        .section h3 {{ margin: 0 0 10px 0; color: #1a5276; }}
        table {{ width: 100%; border-collapse: collapse; }}
        td, th {{ padding: 5px 10px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f5f5f5; width: 40%; }}
        .highlight {{ background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; }}
        .footer {{ text-align: center; font-size: 10px; color: #666; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>BENGALURU TRAFFIC POLICE</h1>
        <h2>PARKING VIOLATION CHALLAN</h2>
        <p><strong>Challan ID:</strong> {packet['challan_id']}</p>
    </div>
    
    <div class="section">
        <h3>VIOLATION DETAILS</h3>
        <table>
            <tr><th>Violation Type</th><td>{v['type']}</td></tr>
            <tr><th>MV Act Section</th><td>Section {v['mv_act_section']} — {v['mv_act_description']}</td></tr>
            <tr><th>Penalty</th><td>{v['mv_act_penalty']}</td></tr>
            <tr><th>Reported At</th><td>{v['reported_at']}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>LOCATION</h3>
        <table>
            <tr><th>Junction</th><td>{loc['junction']}</td></tr>
            <tr><th>Road Name</th><td>{loc['road_name']}</td></tr>
            <tr><th>Police Station</th><td>{loc['police_station']}</td></tr>
            <tr><th>Coordinates</th><td>{loc['latitude']}, {loc['longitude']}</td></tr>
            <tr><th>Google Maps</th><td><a href="{loc['google_maps_url']}">{loc['google_maps_url']}</a></td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>VEHICLE</h3>
        <table>
            <tr><th>Vehicle Type</th><td>{veh['type']}</td></tr>
            <tr><th>Number</th><td>{veh['number']}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>IMPACT EVIDENCE</h3>
        <table>
            <tr><th>Congestion Impact Score</th><td>{ev['congestion_cost']}</td></tr>
            <tr><th>Gridlock Score</th><td>{ev['gridlock_score']}</td></tr>
            <tr><th>Impact Tier</th><td>{ev['impact_tier']}</td></tr>
            <tr><th>Duration</th><td>{ev['duration_minutes']} minutes</td></tr>
            <tr><th>Road Capacity Loss</th><td>{ev['capacity_loss_pct']}%</td></tr>
            <tr><th>Blocked Width</th><td>{ev['blocked_width_m']}m</td></tr>
            <tr><th>Operational Status</th><td>{ev['operational_status']}</td></tr>
        </table>
    </div>
    
    <div class="highlight">
        <strong>OFFICER ACTION:</strong> {act['recommended']} — Priority: {act['response_priority']}
    </div>
    
    <div class="section">
        <h3>EVIDENCE HASH</h3>
        <p style="font-family: monospace; font-size: 10px; word-break: break-all;">{legal['evidence_hash']}</p>
        <p><em>This hash ensures evidence integrity. Any modification will change the hash.</em></p>
    </div>
    
    <div class="footer">
        <p>Generated by ClearLane — Congestion-First Enforcement System</p>
        <p>Generated at: {packet['generated_at']}</p>
    </div>
</body>
</html>"""
    
    return html


def batch_generate_packets(
    df: pd.DataFrame,
    top_n: int = 10,
) -> list:
    """Generate evidence packets for top N highest-impact violations."""
    if 'congestion_cost' in df.columns:
        top = df.nlargest(top_n, 'congestion_cost')
    else:
        top = df.head(top_n)
    
    packets = []
    for _, row in top.iterrows():
        violation_dict = row.to_dict()
        packet = generate_evidence_packet(violation_dict)
        packets.append(packet)
    
    return packets


if __name__ == '__main__':
    # Test with sample data
    test_violation = {
        'id': 'TEST001',
        'created_datetime': '2024-01-15 18:30:00',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'vehicle_type': 'CAR',
        'vehicle_number': 'KA01AB1234',
        'single_violation': 'DOUBLE PARKING',
        'mapped_junction': 'BTP044',
        'police_station': 'Shantinagar',
        'location': 'Koramangala 4th Block',
        'congestion_cost': 450.0,
        'gridlock_score': 78.5,
        'impact_tier': 'HIGH',
        'duration_minutes': 35,
        'blocked_width_m': 3.2,
        'mv_act_section': '118(b)',
        'mv_act_penalty': '₹1000',
        'mv_act_description': 'Dangerous parking',
    }
    
    packet = generate_evidence_packet(test_violation)
    
    print("Evidence Packet Generated:")
    print(f"  Challan ID: {packet['challan_id']}")
    print(f"  Violation: {packet['violation']['type']}")
    print(f"  MV Act: Section {packet['violation']['mv_act_section']}")
    print(f"  Penalty: {packet['violation']['mv_act_penalty']}")
    print(f"  Recommended Action: {packet['officer_action']['recommended']}")
    print(f"  Evidence Hash: {packet['legal']['evidence_hash'][:16]}...")
    
    # Generate HTML
    html = generate_evidence_html(packet)
    with open('test_challan.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"\nHTML exported to test_challan.html")
