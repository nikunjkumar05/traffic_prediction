"""Stage 4: Dispatch Engine — OR-tools VRP tow truck routing + nearest-neighbor fallback + tiered response."""

import numpy as np
import pandas as pd
from typing import List, Tuple, Optional


def compute_distance_matrix(junctions: List[Tuple[float, float]]) -> np.ndarray:
    """Euclidean distance matrix between junctions in meters (vectorized)."""
    pts = np.array(junctions)
    diff = pts[:, None, :] - pts[None, :, :]
    return np.sqrt((diff ** 2).sum(axis=2)) * 111000


def solve_tow_truck_vrp(junctions, num_trucks, depot_index=0, max_distance=30000):
    """Generate optimized tow truck routes using OR-tools VRP. Returns list of routes or None."""
    try:
        from ortools.constraint_solver import routing_enums_pb2, pywrapcp
        int_matrix = compute_distance_matrix(junctions).astype(int).tolist()

        manager = pywrapcp.RoutingIndexManager(len(int_matrix), num_trucks, depot_index)
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            return int_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

        idx = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(idx)
        routing.AddDimension(idx, 0, int(max_distance), True, 'Distance')

        sp = pywrapcp.DefaultRoutingSearchParameters()
        sp.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        sp.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        sp.time_limit.seconds = 10

        solution = routing.SolveWithParameters(sp)
        if solution:
            routes = []
            for tid in range(num_trucks):
                route, index = [], routing.Start(tid)
                while not routing.IsEnd(index):
                    route.append(junctions[manager.IndexToNode(index)])
                    index = solution.Value(routing.NextVar(index))
                if route:
                    routes.append(route)
            return routes
    except (ImportError, Exception) as e:
        print(f"  OR-tools: {e}, using nearest-neighbor fallback")
    return None


def nearest_neighbor_routing(junctions, num_trucks, max_distance=50000):
    """Greedy nearest-neighbor routing fallback. Each truck visits closest unvisited junction."""
    unvisited = set(range(len(junctions)))
    routes = [[] for _ in range(num_trucks)]

    for t in range(min(num_trucks, len(unvisited))):
        start = unvisited.pop()
        routes[t].append(junctions[start])

    current_truck = 0
    for _ in range(len(junctions) * num_trucks):
        if not unvisited:
            break
        last = routes[current_truck][-1]
        best_idx, best_dist = -1, float('inf')
        for idx in unvisited:
            d = np.sqrt((last[0] - junctions[idx][0])**2 + (last[1] - junctions[idx][1])**2) * 111000
            if d < best_dist:
                best_dist, best_idx = d, idx
        if best_idx >= 0 and best_dist <= max_distance:
            unvisited.discard(best_idx)
            routes[current_truck].append(junctions[best_idx])
        else:
            current_truck = (current_truck + 1) % num_trucks

    return [r for r in routes if r]


def compute_capacity_recovery_priority(hotspots: pd.DataFrame) -> pd.DataFrame:
    """Rank by capacity recovered per minute of tow truck time."""
    hotspots = hotspots.copy()
    if 'blocked_width_m' in hotspots.columns and 'violation_count' in hotspots.columns:
        # Estimate tow time: 5 min per vehicle + 2 min travel
        hotspots['estimated_tow_time_min'] = hotspots['violation_count'] * 5 + 2
        hotspots['capacity_recovery_rate'] = (
            hotspots['blocked_width_m'] / hotspots['estimated_tow_time_min']
        ).round(2)
    else:
        hotspots['capacity_recovery_rate'] = hotspots.get('total_delay', 0)
    return hotspots.sort_values('capacity_recovery_rate', ascending=False)


def generate_tiered_response(hotspots: pd.DataFrame) -> List[dict]:
    """Map gridlock score → action: >=80 TOW_TRUCK, >=50 MARSHAL, <50 DRIVER_ALERT."""
    responses = []
    for _, row in hotspots.iterrows():
        score = row.get('gridlock_score', row.get('avg_gridlock', 0))
        delay = row.get('predicted_cost', row.get('total_delay', row.get('congestion_cost', 0)))
        recovery = row.get('capacity_recovery_rate', 0)
        
        if score >= 80:
            action, reason = 'PRE_POSITION_TOW_TRUCK', f"Critical: {delay:.0f} veh-min delay, recovery rate: {recovery:.1f}m/min"
        elif score >= 50:
            action, reason = 'COMMUNITY_MARSHAL', f"High: {delay:.0f} veh-min delay"
        else:
            action, reason = 'DRIVER_ALERT', f"Moderate: {delay:.0f} veh-min delay"
        
        responses.append({
            'junction': row.get('mapped_junction', 'Unknown'),
            'gridlock_score': score,
            'action': action,
            'reason': reason,
            'predicted_delay': delay,
            'capacity_recovery_rate': recovery,
        })
    return responses


def plan_shift(df, junction_coords, num_trucks=2, start_junction=None, max_distance=30000):
    """Plan a full tow truck shift: identify hotspots → capacity-aware priority → VRP routing."""
    if 'total_delay' not in df.columns:
        hotspot_stats = df.groupby('mapped_junction').agg(
            total_delay=('congestion_cost', 'sum'), violation_count=('single_violation', 'count'),
            avg_gridlock=('gridlock_score', 'mean'),
            blocked_width_m=('blocked_width_m', 'sum') if 'blocked_width_m' in df.columns else ('congestion_cost', 'sum'),
        ).reset_index().nlargest(10, 'total_delay')
    else:
        hotspot_stats = df.nlargest(10, 'total_delay')
    
    # Apply capacity-aware prioritization
    hotspot_stats = compute_capacity_recovery_priority(hotspot_stats)

    responses = generate_tiered_response(hotspot_stats)

    junction_list, junction_names = [], []
    for jname in hotspot_stats['mapped_junction']:
        if jname in junction_coords:
            junction_list.append(junction_coords[jname])
            junction_names.append(jname)

    if not junction_list:
        return {'routes': [], 'junction_names': [], 'responses': responses, 'hotspot_stats': hotspot_stats,
                'summary': {'routing_method': 'none', 'num_trucks': num_trucks, 'total_stops': 0,
                            'total_distance_km': 0, 'top_hotspot': hotspot_stats.iloc[0]['mapped_junction'] if len(hotspot_stats) > 0 else 'N/A'}}

    depot_idx = junction_names.index(start_junction) if start_junction in junction_names else 0
    routes = solve_tow_truck_vrp(junction_list, num_trucks, depot_idx, max_distance)
    method = 'OR-tools VRP (optimal)' if routes else 'nearest-neighbor (greedy)'
    if not routes:
        routes = nearest_neighbor_routing(junction_list, num_trucks, max_distance)

    total_dist = sum(
        np.sqrt((r[i][0] - r[i-1][0])**2 + (r[i][1] - r[i-1][1])**2) * 111000
        for r in routes for i in range(1, len(r))
    )

    return {'routes': routes, 'junction_names': junction_names, 'responses': responses,
            'hotspot_stats': hotspot_stats,
            'summary': {'routing_method': method, 'num_trucks': num_trucks,
                        'total_stops': sum(len(r) for r in routes),
                        'total_distance_km': round(total_dist / 1000, 1),
                        'top_hotspot': hotspot_stats.iloc[0]['mapped_junction'],
                        'top_hotspot_delay': hotspot_stats.iloc[0]['total_delay']}}


def run_dispatch(df: pd.DataFrame, junction_coords: dict, num_trucks: int = 2) -> dict:
    """Run Stage 4: Generate tow truck shift plan."""
    print("=" * 60)
    print("Stage 4: Dispatch Engine")
    print("=" * 60)

    plan = plan_shift(df, junction_coords, num_trucks)
    s = plan['summary']
    print(f"\n  Routing: {s['routing_method']} | Trucks: {s['num_trucks']} | Stops: {s['total_stops']} | Distance: {s['total_distance_km']} km")
    for r in plan['responses'][:5]:
        print(f"    [{r['action']}] {r['junction']}: {r['reason']}")

    print("=" * 60)
    print("Stage 4 complete.")
    print("=" * 60)
    return plan


if __name__ == '__main__':
    import json
    from src.data_pipeline import run_pipeline
    from src.congestion_cost import run_congestion_cost

    with open('data/external/junction_coords.json', 'r', encoding='utf-8') as f:
        coords = json.load(f)

    df = run_pipeline('data/raw/violations.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords)
    plan = run_dispatch(df, coords, num_trucks=2)
