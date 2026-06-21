"""
PhantomBlockageAI — Phantom Risk Score Calculator
Predicts congestion 15 minutes before blockage using parking violation logs.
"""

import math
import pandas as pd
import numpy as np


# ── Constants ───────────────────────────────────────────────────────────────
EARTH_RADIUS_M = 6_371_000  # meters
FEEDER_RADIUS_M = 500       # feeder must be within this distance of a seed


# ── Haversine ───────────────────────────────────────────────────────────────
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in meters between two lat/lon points."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


# ── Core risk score ─────────────────────────────────────────────────────────
def calculate_phantom_risk_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate Phantom Risk Score for every Feeder Node in each time_block.
    Uses vectorized haversine for speed.
    """
    seed_mask = df["junction_node"] != "FEEDER"
    seeds = df[seed_mask].copy()
    feeders = df[~seed_mask].copy()

    if seeds.empty or feeders.empty:
        return pd.DataFrame()

    results = []
    for tb, feeder_group in feeders.groupby("time_block"):
        if tb not in seeds["time_block"].values:
            continue
        seed_group = seeds[seeds["time_block"] == tb]
        if seed_group.empty or feeder_group.empty:
            continue

        f_lats = feeder_group["latitude"].values
        f_lons = feeder_group["longitude"].values
        s_lats = seed_group["latitude"].values
        s_lons = seed_group["longitude"].values

        for i in range(len(feeder_group)):
            lat1 = math.radians(f_lats[i])
            lon1 = math.radians(f_lons[i])
            lat2 = np.radians(s_lats)
            lon2 = np.radians(s_lons)
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
            dists = 2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(a))
            mask = dists <= FEEDER_RADIUS_M
            if not mask.any():
                continue
            nearby = dists[mask]
            avg_dist = float(np.mean(nearby))
            seed_count = int(len(nearby))
            weight = feeder_group.iloc[i]["weight"]

            results.append({
                "time_block": tb,
                "latitude": f_lats[i],
                "longitude": f_lons[i],
                "vehicle_type": feeder_group.iloc[i]["vehicle_type"],
                "weight": weight,
                "junction_node": feeder_group.iloc[i]["junction_node"],
                "nearby_seed_count": seed_count,
                "avg_distance_to_seeds": round(avg_dist, 2),
                "phantom_risk_score": round((avg_dist / seed_count) * weight, 2),
            })

    if not results:
        return pd.DataFrame()

    risk_df = pd.DataFrame(results)
    risk_df = risk_df.sort_values("phantom_risk_score", ascending=False).reset_index(drop=True)
    return risk_df


# ── CLI ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from preprocess import preprocess

    df = preprocess()
    risk_df = calculate_phantom_risk_score(df)

    if not risk_df.empty:
        print(f"\nTop 10 Phantom Blockage Risks:")
        print(risk_df.head(10).to_string(index=False))
        risk_df.to_parquet("phantom_risk_scores.parquet", index=False)
        print(f"\nSaved to phantom_risk_scores.parquet")
