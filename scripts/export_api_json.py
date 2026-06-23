"""Generate pre-computed API JSON files for Vercel static deployment."""
import json, os, sys, time, traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pandas as pd
import numpy as np
from collections import defaultdict

OUT = Path("frontend/public/api")
OUT.mkdir(parents=True, exist_ok=True)

SEP = "=" * 60


def save(name: str, data):
    path = OUT / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    size = os.path.getsize(path)
    print(f"  {name}.json  ({size/1024:.1f} KB)")


def main():
    print(SEP)
    print("  Exporting API JSON for Vercel static deployment")
    print(SEP)

    # ------ Load data ------
    print("\n1. Loading data...")
    df = pd.read_parquet("data/processed/demo_sample.parquet")
    with open("data/external/junction_coords.json", "r") as f:
        junction_coords = json.load(f)
    print(f"   {len(df):,} rows, {len(junction_coords)} junctions")

    # Standardize dates
    if "created_datetime" not in df.columns and "created_date" in df.columns:
        df["created_datetime"] = pd.to_datetime(df["created_date"], errors="coerce")

    # ------ 2. Overview ------
    print("\n2. Overview...")
    try:
        overview = {
            "total_violations": int(len(df)),
            "unique_junctions": int(df["mapped_junction"].nunique()),
            "violation_types": int(df["violation_type"].nunique()),
            "vehicle_types": int(df["vehicle_type"].nunique()),
            "date_range": {
                "start": str(df["created_datetime"].min()),
                "end": str(df["created_datetime"].max()),
            },
            "severity_distribution": df["severity"].value_counts().to_dict() if "severity" in df.columns else {},
            "peak_hours_violations": int(df[df["peak"] == 1].shape[0]) if "peak" in df.columns else 0,
            "avg_duration_minutes": float(df["duration_minutes"].mean()) if "duration_minutes" in df.columns else 0,
            "total_economic_loss_inr": float(df["economic_loss_inr"].sum()) if "economic_loss_inr" in df.columns else 0,
            "total_co2_kg": float(df["co2_kg"].sum()) if "co2_kg" in df.columns else 0,
            "total_person_hours_blocked": float(df["person_hours_blocked"].sum()) if "person_hours_blocked" in df.columns else 0,
        }
        save("overview", overview)
    except Exception as e:
        print(f"  [SKIP] Overview: {e}")
        traceback.print_exc()

    # ------ 3. Capacity Status ------
    print("\n3. Capacity Status...")
    try:
        if "congestion_cost" in df.columns:
            junctions = []
            for junc in df["mapped_junction"].unique():
                jdf = df[df["mapped_junction"] == junc]
                junctions.append({
                    "junction": junc,
                    "violation_count": int(len(jdf)),
                    "avg_congestion_cost": float(jdf["congestion_cost"].mean()),
                    "avg_gridlock_score": float(jdf["gridlock_score"].mean()) if "gridlock_score" in jdf.columns else 0,
                    "total_economic_loss": float(jdf["economic_loss_inr"].sum()) if "economic_loss_inr" in jdf.columns else 0,
                    "impact_tier": jdf["impact_tier"].mode().iloc[0] if "impact_tier" in jdf.columns else "N/A",
                })
            junctions.sort(key=lambda x: x["avg_congestion_cost"], reverse=True)
            tier_counts = df["impact_tier"].value_counts().to_dict() if "impact_tier" in df.columns else {}
            status = {
                "junctions": junctions[:50],
                "total_junctions": len(junctions),
                "tier_summary": tier_counts,
                "high_risk_count": sum(1 for j in junctions if j["avg_gridlock_score"] >= 70) if len(junctions) > 0 else 0,
            }
            save("capacity-status", status)
    except Exception as e:
        print(f"  [SKIP] Capacity: {e}")
        traceback.print_exc()

    # ------ 4. Stations ------
    print("\n4. Stations...")
    try:
        stations = sorted(df["police_station"].dropna().unique().tolist())
        save("stations", stations)
    except Exception as e:
        print(f"  [SKIP] Stations: {e}")

    # ------ 5. Priority Queue ------
    print("\n5. Priority Queue (ALL)...")
    try:
        if "congestion_cost" in df.columns:
            from presence_model import compute_presence_series
            presences = compute_presence_series(df)
            df["presence_probability"] = presences

            # Compute actionability
            from capacity_loss import compute_gpi
            if "gridlock_score" in df.columns:
                df["actionability_score"] = (
                    0.3 * (df["congestion_cost"] - df["congestion_cost"].min()) / max(df["congestion_cost"].max() - df["congestion_cost"].min(), 1) +
                    0.3 * (df["gridlock_score"] / 100) +
                    0.2 * df["presence_probability"] +
                    0.2 * (df["duration_minutes"] / df["duration_minutes"].max()) if "duration_minutes" in df.columns else 0
                )
            else:
                df["actionability_score"] = df["presence_probability"]

            queue = df.nlargest(50, "actionability_score")
            records = []
            for _, row in queue.iterrows():
                records.append({
                    "id": row.get("id", ""),
                    "vehicle_number": row.get("vehicle_number", "N/A"),
                    "vehicle_type": row.get("vehicle_type", "N/A"),
                    "violation_type": row.get("violation_type", "N/A"),
                    "location": row.get("location", ""),
                    "mapped_junction": row.get("mapped_junction", ""),
                    "police_station": row.get("police_station", "N/A"),
                    "congestion_cost": float(row["congestion_cost"]),
                    "gridlock_score": float(row.get("gridlock_score", 0)),
                    "impact_tier": row.get("impact_tier", "N/A"),
                    "actionability_score": float(row["actionability_score"]),
                    "presence_probability": float(row["presence_probability"]),
                    "duration_minutes": float(row.get("duration_minutes", 0)),
                    "severity": row.get("severity", "N/A"),
                    "economic_loss_inr": float(row.get("economic_loss_inr", 0)),
                })
            save("priority-queue-ALL-top10", records[:10])
            save("priority-queue-ALL-top5", records[:5])

            # Per-station queues
            for station in df["police_station"].dropna().unique():
                sdf = df[df["police_station"] == station].nlargest(10, "actionability_score")
                if len(sdf) == 0:
                    continue
                srecs = []
                for _, row in sdf.iterrows():
                    srecs.append({
                        "id": row.get("id", ""),
                        "vehicle_number": row.get("vehicle_number", "N/A"),
                        "vehicle_type": row.get("vehicle_type", "N/A"),
                        "violation_type": row.get("violation_type", "N/A"),
                        "location": row.get("location", ""),
                        "mapped_junction": row.get("mapped_junction", ""),
                        "congestion_cost": float(row["congestion_cost"]),
                        "gridlock_score": float(row.get("gridlock_score", 0)),
                        "impact_tier": row.get("impact_tier", "N/A"),
                        "actionability_score": float(row["actionability_score"]),
                        "presence_probability": float(row["presence_probability"]),
                    })
                safe = station.replace(" ", "_").replace("/", "_")
                save(f"priority-queue-{safe}", srecs)
    except Exception as e:
        print(f"  [SKIP] PriorityQueue: {e}")
        traceback.print_exc()

    # ------ 6. Cascade ------
    print("\n6. Cascade...")
    try:
        if "congestion_cost" in df.columns:
            from gnn_cascade import run_gnn_cascade
            gnn = run_gnn_cascade(df, junction_coords)
            save("cascade", gnn)
    except Exception as e:
        print(f"  [SKIP] Cascade: {e}")
        traceback.print_exc()

    # ------ 7. Causal Impact ------
    print("\n7. Causal Impact...")
    try:
        if "simulated_speed_kmh" not in df.columns:
            from traffic_sim import add_simulated_speed_to_pipeline
            df = add_simulated_speed_to_pipeline(df, junction_coords)
        from causal_impact import run_causal_impact
        causal = run_causal_impact(df)
        save("causal-impact", causal)
    except Exception as e:
        print(f"  [SKIP] CausalImpact: {e}")
        traceback.print_exc()

    # ------ 8. Flipkart Logistics ------
    print("\n8. Flipkart Logistics...")
    try:
        if "congestion_cost" in df.columns:
            from flipkart_logistics import run_flipkart_logistics
            flipkart = run_flipkart_logistics(df)
            save("flipkart-logistics", flipkart)
            impact = flipkart.get("impact", {})
            save("impact-summary", {
                "total_violations_analyzed": int(len(df)),
                "delivery_vehicle_violations": int(flipkart.get("n_delivery_vehicles", 0)),
                "annual_savings_inr": float(impact.get("annual_savings_inr", 0)),
                "hours_saved": float(impact.get("hours_saved", 0)),
                "fuel_liters_saved": float(impact.get("fuel_liters_saved", 0)),
                "co2_kg_reduced": float(impact.get("co2_kg_reduced", 0)),
                "green_zones": len(flipkart.get("recommendations", [])),
                "clusters": flipkart.get("cluster_count", 0),
            })
    except Exception as e:
        print(f"  [SKIP] Flipkart: {e}")
        traceback.print_exc()

    # ------ 9. Repeat Offenders ------
    print("\n9. Repeat Offenders...")
    try:
        if "vehicle_number" in df.columns:
            repeats = df["vehicle_number"].value_counts()
            multi = repeats[repeats > 1]
            offenders = []
            for plate, cnt in multi.head(20).items():
                vdf = df[df["vehicle_number"] == plate]
                types = vdf["violation_type"].unique().tolist()
                stations = vdf["police_station"].dropna().unique().tolist()
                junctions = vdf["mapped_junction"].value_counts().head(5).to_dict()
                offenders.append({
                    "vehicle_number": plate,
                    "violation_count": int(cnt),
                    "vehicle_type": vdf["vehicle_type"].mode().iloc[0] if "vehicle_type" in vdf.columns else "N/A",
                    "violation_types": types[:5],
                    "police_stations": stations[:3],
                    "top_junctions": junctions,
                    "total_economic_loss": float(vdf["economic_loss_inr"].sum()) if "economic_loss_inr" in vdf.columns else 0,
                    "avg_gridlock_score": float(vdf["gridlock_score"].mean()) if "gridlock_score" in vdf.columns else 0,
                })
            save("repeat-offenders-min_violations-3", offenders)
    except Exception as e:
        print(f"  [SKIP] RepeatOff: {e}")
        traceback.print_exc()

    # ------ 10. Dispatch ------
    print("\n10. Dispatch...")
    try:
        if "congestion_cost" in df.columns:
            from dispatch import run_dispatch
            dispatch = run_dispatch(df, junction_coords, num_trucks=2)
            save("dispatch-num_trucks-2", dispatch)
    except Exception as e:
        print(f"  [SKIP] Dispatch: {e}")
        traceback.print_exc()

    # ------ 11. Map Data ------
    print("\n11. Map Data...")
    try:
        junctions_list = []
        for junc, coords_list in junction_coords.items():
            jdf = df[df["mapped_junction"] == junc]
            if len(jdf) > 0:
                junctions_list.append({
                    "junction": junc,
                    "lat": coords_list[0] if len(coords_list) > 0 else 0,
                    "lng": coords_list[1] if len(coords_list) > 1 else 0,
                    "violation_count": int(len(jdf)),
                    "avg_congestion_cost": float(jdf["congestion_cost"].mean()) if "congestion_cost" in jdf.columns else 0,
                    "avg_gridlock_score": float(jdf["gridlock_score"].mean()) if "gridlock_score" in jdf.columns else 0,
                    "top_violation": jdf["violation_type"].mode().iloc[0] if "violation_type" in jdf.columns else "N/A",
                    "impact_tier": jdf["impact_tier"].mode().iloc[0] if "impact_tier" in jdf.columns else "N/A",
                })
        save("map-data", junctions_list)
        save("spillover-zones", junctions_list[:10])
    except Exception as e:
        print(f"  [SKIP] MapData: {e}")
        traceback.print_exc()

    # ------ 12. Alerts ------
    print("\n12. Alerts...")
    try:
        if "severity" in df.columns:
            high_sev = df[df["severity"] == "HIGH"].head(15) if "HIGH" in df["severity"].values else df.head(15)
        else:
            high_sev = df.head(15)
        alerts = []
        for _, row in high_sev.iterrows():
            alerts.append({
                "id": row.get("id", ""),
                "vehicle_number": row.get("vehicle_number", "N/A"),
                "violation_type": row.get("violation_type", "N/A"),
                "mapped_junction": row.get("mapped_junction", ""),
                "severity": row.get("severity", "N/A"),
                "congestion_cost": float(row.get("congestion_cost", 0)),
                "gridlock_score": float(row.get("gridlock_score", 0)),
                "created_datetime": str(row.get("created_datetime", "")),
                "presence_probability": float(row.get("presence_probability", 0)) if "presence_probability" in row else 0,
            })
        save("alerts-count-15", alerts)
    except Exception as e:
        print(f"  [SKIP] Alerts: {e}")
        traceback.print_exc()

    # ------ 13. Early Warning System ------
    print("\n13. Early Warning System...")
    try:
        if "gridlock_score" in df.columns:
            jstats = df.groupby("mapped_junction").agg({
                "gridlock_score": "mean",
                "congestion_cost": "mean",
                "economic_loss_inr": "sum",
                "vehicle_number": "count",
            }).reset_index()
            jstats.columns = ["junction", "avg_gridlock", "avg_congestion", "total_loss", "violation_count"]
            jstats = jstats.sort_values("avg_gridlock", ascending=False)
            warnings = []
            for _, row in jstats.head(15).iterrows():
                warnings.append({
                    "junction": row["junction"],
                    "risk_score": float(row["avg_gridlock"]),
                    "avg_congestion_cost": float(row["avg_congestion"]),
                    "violation_count": int(row["violation_count"]),
                    "total_loss_inr": float(row["total_loss"]),
                    "recommendation": "Immediate dispatch recommended" if row["avg_gridlock"] >= 70 else "Schedule patrol" if row["avg_gridlock"] >= 50 else "Monitor",
                })
            save("early-warning-system", {"warnings": warnings, "total_high_risk": sum(1 for w in warnings if w["risk_score"] >= 70)})

            # Anomaly scores
            if "duration_minutes" in df.columns:
                means = df.groupby("hour")["duration_minutes"].mean()
                stds = df.groupby("hour")["duration_minutes"].std()
                anomalies = []
                for h in range(24):
                    hdf = df[df["hour"] == h]
                    if len(hdf) > 0:
                        anomalies.append({
                            "hour": h,
                            "mean_duration": float(means.get(h, 0)),
                            "std_duration": float(stds.get(h, 0)),
                            "violation_count": int(len(hdf)),
                            "anomaly_score": float(abs(hdf["duration_minutes"].mean() - means.mean()) / max(stds.mean(), 1)),
                        })
                save("anomaly-scores", anomalies)
    except Exception as e:
        print(f"  [SKIP] EarlyWarning: {e}")
        traceback.print_exc()

    # ------ 14. Violations ------
    print("\n14. Violations...")
    try:
        top = df.nlargest(10, "congestion_cost") if "congestion_cost" in df.columns else df.head(10)
        vrecs = []
        for _, row in top.iterrows():
            vrecs.append({
                "id": row.get("id", ""),
                "vehicle_number": row.get("vehicle_number", "N/A"),
                "vehicle_type": row.get("vehicle_type", "N/A"),
                "violation_type": row.get("violation_type", "N/A"),
                "location": row.get("location", ""),
                "mapped_junction": row.get("mapped_junction", ""),
                "congestion_cost": float(row.get("congestion_cost", 0)),
                "gridlock_score": float(row.get("gridlock_score", 0)),
                "impact_tier": row.get("impact_tier", "N/A"),
                "economic_loss_inr": float(row.get("economic_loss_inr", 0)),
                "created_datetime": str(row.get("created_datetime", "")),
                "severity": row.get("severity", "N/A"),
            })
        save("violations-top_n-10", vrecs)
    except Exception as e:
        print(f"  [SKIP] Violations: {e}")
        traceback.print_exc()

    # ------ 15. Evidence Packet (sample) ------
    print("\n15. Evidence Packet (sample)...")
    try:
        sample_row = df.iloc[0]
        evidence = {
            "id": str(sample_row.get("id", "sample-001")),
            "vehicle_number": str(sample_row.get("vehicle_number", "KA-01-AB-1234")),
            "vehicle_type": str(sample_row.get("vehicle_type", "CAR")),
            "violation_type": str(sample_row.get("violation_type", "WRONG PARKING")),
            "description": str(sample_row.get("description", "")),
            "location": str(sample_row.get("location", "Unknown")),
            "mapped_junction": str(sample_row.get("mapped_junction", "J001")),
            "latitude": float(sample_row.get("latitude", 12.97)),
            "longitude": float(sample_row.get("longitude", 77.59)),
            "created_datetime": str(sample_row.get("created_datetime", "")),
            "duration_minutes": float(sample_row.get("duration_minutes", 0)),
            "severity": str(sample_row.get("severity", "MEDIUM")),
            "congestion_cost": float(sample_row.get("congestion_cost", 0)),
            "gridlock_score": float(sample_row.get("gridlock_score", 0)),
            "economic_loss_inr": float(sample_row.get("economic_loss_inr", 0)),
            "vehicles_blocked_hr": float(sample_row.get("vehicles_blocked_hr", 0)),
            "co2_kg": float(sample_row.get("co2_kg", 0)),
            "mv_act_section": str(sample_row.get("mv_act_section", "")),
            "mv_act_penalty": str(sample_row.get("mv_act_penalty", "")),
            "police_station": str(sample_row.get("police_station", "")),
            "impact_tier": str(sample_row.get("impact_tier", "C")),
        }
        save("evidence-packet-0", evidence)
    except Exception as e:
        print(f"  [SKIP] Evidence: {e}")
        traceback.print_exc()

    # ------ 16. Temporal Profile ------
    print("\n16. Temporal Profile...")
    try:
        if "hour" in df.columns:
            for junc in df["mapped_junction"].unique()[:5]:
                jdf = df[df["mapped_junction"] == junc]
                profile = []
                for h in range(24):
                    hdf = jdf[jdf["hour"] == h]
                    profile.append({
                        "hour": h,
                        "violation_count": int(len(hdf)),
                        "avg_congestion_cost": float(hdf["congestion_cost"].mean()) if len(hdf) > 0 and "congestion_cost" in hdf.columns else 0,
                        "avg_duration": float(hdf["duration_minutes"].mean()) if len(hdf) > 0 and "duration_minutes" in hdf.columns else 0,
                    })
                safe = junc.replace(" ", "_").replace("/", "_")
                save(f"temporal-profile-{safe}", profile)
    except Exception as e:
        print(f"  [SKIP] TemporalProfile: {e}")
        traceback.print_exc()

    # ------ 17. Scout Leaderboard ------
    print("\n17. Scout Leaderboard...")
    try:
        save("flipkart-scouts-leaderboard", {
            "leaderboard": [
                {"rank": i+1, "name": f"Scout {chr(65+i)}", "reports": 42-i*3, "verified": 38-i*4, "score": 95-i*5}
                for i in range(10)
            ],
            "total_active_scouts": 25,
            "reports_this_week": 120,
        })
    except Exception as e:
        print(f"  [SKIP] ScoutLB: {e}")

    # ------ 18. Auth (mock) ------
    print("\n18. Auth (mock)...")
    save("auth-login", {"token": "demo-token-123", "user": {"name": "Demo User", "role": "inspector", "station": "ALL"}})

    # ------ Summary ------
    total_files = len(list(OUT.glob("*.json")))
    total_size = sum(f.stat().st_size for f in OUT.glob("*.json"))
    print(f"\n{SEP}")
    print(f"  Done! {total_files} JSON files, {total_size/1024:.1f} KB total")
    print(f"  Output: {OUT}")
    print(SEP)


if __name__ == "__main__":
    main()
