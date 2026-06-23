"""
Stage 2b: Traffic Microsimulation Engine — Cell Transmission Model.

Dataset-Only Mode: Uses provided violation lat/lon as obstacles in a
physics-based macroscopic traffic flow model (Greenshields + CTM).

Dual-Mode Architecture:
  MODE 1 — Training (this module): CTM simulation on provided violation data.
    Output = simulated_speed_kmh, queue_length_m.
    Active when no live camera feed is connected.

  MODE 2 — Live (camera measurement): Replaces simulation with measured
    speed from YOLOv8 + ByteTrack on BTP camera feeds.
    Active when CameraJunction.is_online = True.

  The causal impact engine accepts either input transparently —
  zero code changes between modes.

Formula:
  CellTransmissionModel discretises each approaching road segment into cells.
  Violations block cells via capacity_loss_pct.
  Traffic propagates via Greenshields fundamental diagram.
  Outputs simulated speed at the junction-adjacent cell.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import get_config_value
from capacity_loss import ROAD_WIDTHS, DEFAULT_VEHICLE_WIDTHS, FOOTPATH_VIOLATIONS


# ── Default Parameters (Highway Capacity Manual, Indian urban context) ────────

DEFAULT_FREE_SPEED_KPH = 40.0       # Bengaluru urban free-flow speed
DEFAULT_JAM_DENSITY_VPK = 200.0     # veh/km/lane (standard HCM)
DEFAULT_CELL_LENGTH_M = 50.0        # 50m cells
DEFAULT_TIME_STEP_S = 5.0           # 5-second timestep (CFL: dt <= dx/v_max)
DEFAULT_ROAD_SEGMENT_M = 500.0      # 500m approaching road per junction
DEFAULT_LANES = 2                   # default 2-lane road
DEFAULT_CAPACITY_VPHPL = 1800       # veh/hr/lane (HCM standard for urban arterial)

# Base demand estimates by time-of-day (fraction of capacity)
DEMAND_PROFILE = {
    'peak_morning':   (7, 10, 0.80),
    'peak_evening':   (17, 20, 0.85),
    'offpeak_night':  (22, 5, 0.20),
    'offpeak_day':    (10, 17, 0.50),
    'shoulder':       (5, 7, 0.40),
    'shoulder_evening': (20, 22, 0.55),
}


@dataclass
class TrafficState:
    """Traffic state at a junction for a single time window."""
    junction: str
    time_bin: pd.Timestamp
    simulated_speed_kmh: float
    queue_length_m: float
    density_veh_per_km: float
    flow_veh_per_hour: float
    road_type: str
    violations_present: int
    capacity_loss_pct: float
    operational_status: str


def classify_road_type(junction_distance: float, violation: str = '') -> str:
    """Classify road type based on proximity to junction center."""
    if violation in FOOTPATH_VIOLATIONS:
        return 'footpath'
    if junction_distance < 10:
        return 'arterial'
    if junction_distance < 30:
        return 'main_road'
    if junction_distance < 50:
        return 'collector'
    return 'local'


def get_inflow_demand(hour: int, road_type: str) -> float:
    """
    Estimate traffic inflow demand based on time of day and road type.

    Values derived from standard traffic engineering profiles.
    No external data required — pure engineering assumption.
    """
    for period, start, end, fraction in DEMAND_PROFILE.values():
        if isinstance(period, str):
            if start <= end:
                if start <= hour < end:
                    demand_frac = fraction
                    break
            else:
                if hour >= start or hour < end:
                    demand_frac = fraction
                    break
    else:
        demand_frac = 0.50

    # Road-type capacity from config
    road_capacities = get_config_value('formula', 'throughput', {}).get('road_capacity_veh_per_hour', {})
    base_capacity = road_capacities.get(road_type, 1200)

    lanes_map = {'arterial': 4, 'main_road': 2, 'collector': 2, 'local': 1, 'footpath': 1}
    lanes = lanes_map.get(road_type, DEFAULT_LANES)
    cap_per_lane = base_capacity / max(lanes, 1)

    return demand_frac * cap_per_lane * lanes


class CellTransmissionModel:
    """
    Macroscopic Cell Transmission Model for traffic flow simulation.

    Discretises a road segment into cells and simulates traffic propagation
    using the Greenshields fundamental diagram. Violations act as cell capacity
    reductions.

    Dataset-only: violation lat/lon and timestamps from the provided CSV.
    Road parameters are standard traffic engineering defaults from config.
    """

    def __init__(self, config: Optional[Dict] = None):
        self.free_speed_kph = get_config_value('traffic_sim', 'free_speed_kph', DEFAULT_FREE_SPEED_KPH)
        self.jam_density_vpk = get_config_value('traffic_sim', 'jam_density_vpk', DEFAULT_JAM_DENSITY_VPK)
        self.cell_length_m = get_config_value('traffic_sim', 'cell_length_m', DEFAULT_CELL_LENGTH_M)
        self.time_step_s = get_config_value('traffic_sim', 'time_step_s', DEFAULT_TIME_STEP_S)
        self.road_segment_m = get_config_value('traffic_sim', 'road_segment_m', DEFAULT_ROAD_SEGMENT_M)
        self.lanes = get_config_value('traffic_sim', 'lanes', DEFAULT_LANES)

        # Derived
        self.n_cells = int(np.ceil(self.road_segment_m / self.cell_length_m))
        # CFL check: max distance per timestep = free_speed * dt
        self.max_step_m = (self.free_speed_kph / 3.6) * self.time_step_s
        if self.max_step_m > self.cell_length_m:
            import warnings
            warnings.warn(
                f"CFL condition violated: free_speed per dt ({self.max_step_m:.1f}m) "
                f"> cell_length ({self.cell_length_m:.1f}m). Reduce dt or increase cell length."
            )

        # Maximum flow rate per cell (veh/timestep)
        v_ms = self.free_speed_kph / 3.6
        self.max_flow_per_cell = (self.lanes * self.jam_density_vpk / 1000) * self.cell_length_m

    def fundamental_diagram_speed(self, density_vpk: float) -> float:
        """
        Greenshields model: v = v_free * (1 - ρ/ρ_max).

        Args:
            density_vpk: Traffic density in veh/km

        Returns:
            Speed in km/h
        """
        if density_vpk <= 0:
            return self.free_speed_kph
        if density_vpk >= self.jam_density_vpk:
            return 0.0
        return self.free_speed_kph * (1 - density_vpk / self.jam_density_vpk)

    def fundamental_diagram_flow(self, density_vpk: float) -> float:
        """
        Flow-density relationship: q = ρ * v(ρ).

        Args:
            density_vpk: Density in veh/km

        Returns:
            Flow in veh/hour
        """
        speed = self.fundamental_diagram_speed(density_vpk)
        return density_vpk * speed

    def get_critical_density(self) -> float:
        """Critical density where flow is maximised (ρ_c = ρ_max / 2 for Greenshields)."""
        return self.jam_density_vpk / 2.0

    def simulate_cells(
        self,
        cells_density: np.ndarray,
        cells_blocked_pct: np.ndarray,
        inflow_demand_veh_per_s: float,
        n_timesteps: int = 60,
    ) -> np.ndarray:
        """
        Run CTM for multiple timesteps until equilibrium.

        Args:
            cells_density: Initial density per cell (veh/km)
            cells_blocked_pct: Fraction of each cell blocked by violations (0-1)
            inflow_demand_veh_per_s: Inflow boundary condition (veh/sec)
            n_timesteps: Maximum timesteps to simulate

        Returns:
            density after simulation (veh/km per cell)
        """
        dt = self.time_step_s
        dx = self.cell_length_m
        n = len(cells_density)
        rho_max = self.jam_density_vpk
        v_free = self.free_speed_kph / 3.6  # m/s

        rho = cells_density.copy()

        for _ in range(n_timesteps):
            rho_prev = rho.copy()

            # Send flow from each cell to next (upstream → downstream direction)
            # For each cell i, the flow to cell i+1 is:
            #   demand = min(rho_i * v_free, q_max * (1 - blocked_pct_i))
            #   supply = min((rho_max - rho_{i+1}) * v_free, q_max * (1 - blocked_pct_{i+1}))

            send_flow = np.zeros(n)
            recv_flow = np.zeros(n)

            for i in range(n):
                # Effective capacity reduction from violations
                cap_factor = max(0.01, 1.0 - cells_blocked_pct[i] / 100.0)

                # Demand: vehicles wanting to leave cell i
                # Speed in this cell from fundamental diagram
                v_i = self.fundamental_diagram_speed(rho_prev[i])
                q_max_i = rho_max * v_free * cap_factor  # max flow this cell can handle
                send_flow[i] = min(rho_prev[i] * v_i / 3.6 * dt / dx * 1000, q_max_i * dt / 3600)

            for i in range(1, n):
                # Supply: space available in cell i
                cap_factor_next = max(0.01, 1.0 - cells_blocked_pct[i] / 100.0)
                q_max_next = rho_max * v_free * cap_factor_next
                space_available = max(0, (rho_max - rho_prev[i]) * dx / 1000 * self.lanes)
                recv_flow[i] = min(space_available, q_max_next * dt / 3600)

            # Actual flow is min(send, recv)
            actual_flow = np.minimum(send_flow[:-1], recv_flow[1:])

            # Inflow boundary: first cell receives from upstream demand
            inflow = inflow_demand_veh_per_s * dt
            space_first = max(0, (rho_max - rho_prev[0]) * dx / 1000 * self.lanes)
            actual_inflow = min(inflow, space_first)

            # Outflow boundary: last cell sends to junction (assumed free)
            actual_outflow = send_flow[-1]

            # Update densities
            # Cell 0: inflow - flow_to_1
            rho[0] += (actual_inflow - actual_flow[0]) / (dx / 1000 * self.lanes)
            # Cells 1 to n-2: flow_from_prev - flow_to_next
            for i in range(1, n - 1):
                rho[i] += (actual_flow[i - 1] - actual_flow[i]) / (dx / 1000 * self.lanes)
            # Last cell: flow_from_prev - outflow
            rho[n - 1] += (actual_flow[n - 2] - actual_outflow) / (dx / 1000 * self.lanes)

            # Clamp densities
            rho = np.clip(rho, 0, rho_max)

            # Check convergence: max change < 1%
            if np.max(np.abs(rho - rho_prev) / (rho_prev + 1e-6)) < 0.01:
                break

        return rho

    def simulate_junction(
        self,
        violations_df: pd.DataFrame,
        junction_name: str,
        junction_lat: float,
        junction_lon: float,
        hour: int,
        time_bin: pd.Timestamp,
        road_width: float = 7.0,
    ) -> TrafficState:
        """
        Simulate traffic at a single junction for a single time window.

        Args:
            violations_df: Violations at this junction in this time window
            junction_name: Junction identifier
            junction_lat: Junction latitude
            junction_lon: Junction longitude
            hour: Hour of day (0-23)
            time_bin: Time bin timestamp
            road_width: Road width in meters

        Returns:
            TrafficState with simulated speed, queue, density
        """
        n_violations = len(violations_df)
        n_cells = self.n_cells

        # Initialise cells: low density (free flow)
        base_density = 10.0  # veh/km — light traffic baseline
        cells_density = np.full(n_cells, base_density)

        # Compute blockage per cell from violations
        cells_blocked_pct = np.zeros(n_cells)

        if n_violations > 0:
            # Determine road type
            avg_distance = violations_df.get('junction_distance', pd.Series([50.0])).mean()
            top_violation = violations_df['single_violation'].mode().iloc[0] if 'single_violation' in violations_df.columns else ''
            road_type = classify_road_type(avg_distance, top_violation)
            road_width_m = ROAD_WIDTHS.get(road_type, road_width)

            for _, v in violations_df.iterrows():
                v_lat = v.get('latitude', junction_lat)
                v_lon = v.get('longitude', junction_lon)

                # Distance from junction (approximate along road)
                dist_m = np.sqrt((v_lat - junction_lat)**2 + (v_lon - junction_lon)**2) * 111000
                dist_m = min(dist_m, self.road_segment_m)

                # Which cell does this fall into?
                cell_idx = min(int(dist_m / self.cell_length_m), n_cells - 1)

                # How much width does this vehicle block?
                vehicle_type = v.get('vehicle_type', 'CAR')
                v_width = DEFAULT_VEHICLE_WIDTHS.get(vehicle_type, 1.8)
                violation = str(v.get('single_violation', ''))
                if violation == 'DOUBLE PARKING':
                    v_width *= 1.8
                elif violation == 'PARKING IN A MAIN ROAD':
                    v_width *= 1.3

                blocked = min(100.0, (v_width / road_width_m) * 100)
                cells_blocked_pct[cell_idx] = min(100.0, cells_blocked_pct[cell_idx] + blocked)
        else:
            road_type = 'main_road'

        cells_blocked_pct = np.clip(cells_blocked_pct, 0, 100)

        # Inflow demand
        demand_veh_per_s = get_inflow_demand(hour, road_type) / 3600.0

        # Simulate
        final_density = self.simulate_cells(cells_density, cells_blocked_pct)

        # Junction-adjacent cell (last cell, nearest to intersection) speed
        junction_cell_density = final_density[-1]
        simulated_speed = self.fundamental_diagram_speed(junction_cell_density)

        # Queue length: cells with density > 0.8 * jam_density
        queue_cells = np.sum(final_density > 0.8 * self.jam_density_vpk)
        queue_length = queue_cells * self.cell_length_m

        # Flow
        flow = self.fundamental_diagram_flow(junction_cell_density)

        # Avg capacity loss across all cells
        avg_capacity_loss = float(np.mean(cells_blocked_pct))

        # Operational status
        remaining = 100 - avg_capacity_loss
        if remaining > 70:
            status = 'GREEN'
        elif remaining > 50:
            status = 'YELLOW'
        else:
            status = 'RED'

        return TrafficState(
            junction=junction_name,
            time_bin=time_bin,
            simulated_speed_kmh=round(simulated_speed, 1),
            queue_length_m=round(queue_length, 0),
            density_veh_per_km=round(junction_cell_density, 1),
            flow_veh_per_hour=round(flow, 0),
            road_type=road_type,
            violations_present=n_violations,
            capacity_loss_pct=round(avg_capacity_loss, 1),
            operational_status=status,
        )

    def run_batch(
        self,
        df: pd.DataFrame,
        junction_coords: dict,
        time_bin_minutes: int = 15,
        road_width: float = 7.0,
    ) -> pd.DataFrame:
        """
        Run CTM for all junctions across all time bins.

        Args:
            df: Violations DataFrame (must have mapped_junction, latitude, longitude,
                created_datetime, vehicle_type, single_violation)
            junction_coords: Dict of {junction_name: [lat, lon]}
            time_bin_minutes: Size of time bins
            road_width: Default road width

        Returns:
            DataFrame with TrafficState for each (junction, time_bin) pair
        """
        print("=" * 60)
        print("Traffic Simulation: Cell-Transmission Model")
        print("=" * 60)

        df = df.copy()
        df['time_bin'] = df['created_datetime'].dt.floor(f'{time_bin_minutes}min')
        df['hour'] = df['created_datetime'].dt.hour

        results = []
        grouped = df.groupby(['mapped_junction', 'time_bin'])

        total_groups = len(grouped)
        for idx, ((junction, tb), group) in enumerate(grouped):
            if junction not in junction_coords:
                continue

            if idx % 500 == 0 and idx > 0:
                print(f"  Simulated {idx}/{total_groups} junction-time bins")

            lat, lon = junction_coords[junction]
            hour = tb.hour

            state = self.simulate_junction(
                violations_df=group,
                junction_name=junction,
                junction_lat=lat,
                junction_lon=lon,
                hour=hour,
                time_bin=tb,
                road_width=road_width,
            )
            results.append(state)

        result_df = pd.DataFrame([
            {
                'junction': r.junction,
                'time_bin': r.time_bin,
                'simulated_speed_kmh': r.simulated_speed_kmh,
                'queue_length_m': r.queue_length_m,
                'density_veh_per_km': r.density_veh_per_km,
                'flow_veh_per_hour': r.flow_veh_per_hour,
                'road_type': r.road_type,
                'violations_present': r.violations_present,
                'capacity_loss_pct': r.capacity_loss_pct,
                'operational_status': r.operational_status,
            }
            for r in results
        ])

        print(f"\n  Total junction-time bins simulated: {len(result_df)}")
        if len(result_df) > 0:
            avg_speed = result_df['simulated_speed_kmh'].mean()
            avg_queue = result_df['queue_length_m'].mean()
            print(f"  Avg simulated speed: {avg_speed:.1f} km/h")
            print(f"  Avg queue length: {avg_queue:.0f} m")
            print(f"  RED junctions: {(result_df['operational_status'] == 'RED').sum()}")
            print(f"  GREEN junctions: {(result_df['operational_status'] == 'GREEN').sum()}")

        print("Traffic Simulation complete.")
        print("=" * 60)

        return result_df


def add_simulated_speed_to_pipeline(
    df: pd.DataFrame,
    junction_coords: dict,
    time_bin_minutes: int = 15,
    road_width: float = 7.0,
) -> pd.DataFrame:
    """
    Run CTM and merge simulated speed back into the violation DataFrame.

    This adds simulated_speed_kmh and queue_length_m columns to each violation
    based on the traffic state at that junction and time.
    """
    model = CellTransmissionModel()
    sim_df = model.run_batch(df, junction_coords, time_bin_minutes, road_width)

    if len(sim_df) == 0:
        df['simulated_speed_kmh'] = 40.0
        df['queue_length_m'] = 0.0
        return df

    df = df.copy()
    df['time_bin'] = df['created_datetime'].dt.floor(f'{time_bin_minutes}min')

    merged = df.merge(
        sim_df[['junction', 'time_bin', 'simulated_speed_kmh', 'queue_length_m']],
        left_on=['mapped_junction', 'time_bin'],
        right_on=['junction', 'time_bin'],
        how='left',
    )

    # Fill any unmatched rows with default free-flow speed
    merged['simulated_speed_kmh'] = merged['simulated_speed_kmh'].fillna(40.0)
    merged['queue_length_m'] = merged['queue_length_m'].fillna(0.0)
    merged.drop(columns=['junction'], inplace=True)

    return merged


if __name__ == '__main__':
    import json
    from data_pipeline import run_pipeline

    print("Testing Cell-Transmission Model...\n")

    with open('data/external/junction_coords.json', 'r', encoding='utf-8') as f:
        coords = json.load(f)

    df = run_pipeline('jan to may police violation_anonymized791b166.csv', junction_coords=coords)
    df = add_simulated_speed_to_pipeline(df, coords, time_bin_minutes=15)

    print(f"\nShape: {df.shape}")
    print(f"Simulated speed range: {df['simulated_speed_kmh'].min():.1f} - {df['simulated_speed_kmh'].max():.1f} km/h")
    print(f"Queue length range: {df['queue_length_m'].min():.0f} - {df['queue_length_m'].max():.0f} m")

    # Show worst junctions
    worst = df.nsmallest(10, 'simulated_speed_kmh')[['mapped_junction', 'simulated_speed_kmh', 'queue_length_m', 'congestion_cost']]
    print("\nWorst 10 junctions by simulated speed:")
    for _, r in worst.iterrows():
        print(f"  {r['mapped_junction']}: {r['simulated_speed_kmh']:.1f} km/h, queue={r['queue_length_m']:.0f}m, cost={r['congestion_cost']:.1f}")
