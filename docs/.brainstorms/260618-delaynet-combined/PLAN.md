# ParkImpact AI — Implementation Plan (Final)

**Date:** 2026-06-20
**Theme:** Poor Visibility on Parking-Induced Congestion
**Duration:** 7 days (Solo)
**Final Score:** 38/40 (Competition Winner)

---

## What Changed From Original Plan

| Original | Current | Why |
|----------|---------|-----|
| 7-tab dashboard | 3-page dashboard | Officers use phones, not laptops. Simplify. |
| Simulated speed correlation | Historical lag analysis (r=0.978) | Provable from dataset, no external APIs |
| No cascade detection | Adjacency graph + lag correlation + chains | Innovation 9→10 |
| Vague pilot | Rs 14K, 2 weeks, 294x ROI | Concrete numbers beat vague promises |
| SHAP in dashboard | SHAP removed from dashboard | Too technical for judges |
| CurbFlex in dashboard | CurbFlex removed from dashboard | Requires BBMP coordination |
| Dispatch in dashboard | Dispatch removed from dashboard | Officers don't need routing in demo |

---

## Project Structure (Current)

```
traffic_prediction/
├── data/
│   ├── raw/violations.csv                    # 298,450 rows
│   ├── processed/violations_scored.csv       # 348,455 rows (not in git)
│   └── external/junction_coords.json         # 168 junctions
├── src/
│   ├── data_pipeline.py                      # Stage 1: parse, explode, map (125 lines)
│   ├── congestion_cost.py                    # Stage 2: delay formula (121 lines)
│   ├── prediction.py                         # Stage 3: XGBoost + LightGBM (116 lines)
│   ├── dispatch.py                           # Stage 4: OR-tools VRP (168 lines, not in dashboard)
│   ├── curbflex.py                           # Stage 5: chronic zones (119 lines, not in dashboard)
│   ├── validation.py                         # Stage 6: backtest + cascade (151 lines)
│   ├── cascade.py                            # Cascade: adjacency + lag + chains (175 lines)
│   └── shap_explain.py                       # SHAP: feature importance (146 lines, not in dashboard)
├── dashboard.py                              # 3-page Streamlit app (289 lines)
├── docs/
│   ├── IDEAS_BANK.md                         # Ideas, judge evaluation, demo script
│   └── DEMO_SCRIPT.md                        # 3-minute demo narrative
├── outputs/models/                           # Trained models (.pkl)
├── requirements.txt
└── run_dashboard.bat / run_dashboard.sh
```

---

## Stage 1: Data Pipeline (`src/data_pipeline.py`)

**What it does:** Load CSV → parse timestamps → explode JSON violation_type → estimate duration → classify severity → map junctions.

**Key decisions:**
- `closed_datetime` is 100% null → estimate duration from violation_type × vehicle_type lookup tables
- JSON arrays in `violation_type` → explode into individual rows (298K → 348K)
- ~50% of records have `junction_name = 'No Junction'` → map to nearest of 168 junctions using Euclidean distance (batched 50K)

**Output:** DataFrame with `duration_minutes`, `severity` (1-3), `mapped_junction`

---

## Stage 2: Congestion Damage Score (`src/congestion_cost.py`)

**What it does:** Quantify actual congestion impact per violation.

**Formula:**
```
congestion_cost = duration × lane_block × peak × junction_mult × vehicle_mult × severity
```

**Components:**
- `lane_block`: vehicle_width / (road_width / 2), capped at 1.0
- `peak`: 2.0 (rush hour), 1.0 (normal), 0.5 (night)
- `junction_mult`: 3.0 (<10m), 2.0 (<30m), 1.5 (<50m), 1.0 (>50m)
- `vehicle_mult`: 2.5 (tanker/bus), 1.8 (car/van), 1.0 (scooter)
- `severity`: 3 (double parking), 2 (footpath/crossing), 1 (standard)

**Gridlock Score:** Normalized 0-100 from congestion_cost.

**Counter-intuitive proof:** 12 tankers = 54.8 veh-min vs 50 scooters = 0.3 veh-min (182x difference).

---

## Stage 3: Prediction Engine (`src/prediction.py`)

**What it does:** Train XGBoost + LightGBM to predict congestion cost per violation.

**Features (18):** latitude, longitude, hour, day_of_week, month, duration_minutes, severity, vehicle_type_encoded, violation_type_encoded, is_junction, junction_distance, is_morning_rush, is_evening_rush, is_weekend, hour_sin, hour_cos, day_sin, day_cos

**Temporal split:** Train on Nov-Jan, test on Feb.

**Results:** XGBoost R²=0.9982, MAE=0.3489

---

## Stage 4: Dispatch Engine (`src/dispatch.py`)

**What it does:** OR-tools VRP for tow truck routing with nearest-neighbor fallback.

**Note:** Built but NOT in dashboard. Officers don't need routing in the demo. Available as proof of engineering depth.

---

## Stage 5: CurbFlex (`src/curbflex.py`)

**What it does:** Chronic zone detection, policy recommendations, enforcement equity analysis.

**Note:** Built but NOT in dashboard. Requires BBMP coordination for infrastructure recommendations. Available as proof of analysis depth.

---

## Stage 6: Validation (`src/validation.py`)

**What it does:** Backtest + cascade evidence + case study + one-deployment impact.

**Components:**
- `run_backtest`: XGBoost on held-out Feb data (R²=0.9982)
- `run_cascade_validation`: Historical lag analysis between junction pairs
- `run_silk_board_case_study`: Top congestion junction analysis (Doopanahalli)
- `generate_one_deployment_example`: "If BTP deploys at ONE junction for ONE month..."

---

## Cascade Detection (`src/cascade.py`)

**What it does:** Prove that parking violations at one junction predict violations at nearby junctions within 15-30 minutes.

**Components:**
1. `build_adjacency_graph`: 168 junctions, 7,330 directed edges (max 3km), Haversine with cos_lat correction
2. `compute_lag_correlation`: For each edge A→B, correlate violation spikes at T vs T+lag
3. `detect_cascades`: BFS chain detection (A→B→C) with path-based cycle check
4. `simulate_cascade`: Propagate violation through graph step by step

**Results:**
- 2,532 junction pairs tested
- 359 significant (r>0.2)
- Top pair: Lalbagh → Mysore Bank r=0.978 (2,175m apart)
- Longest chain: Central Street → RRMR → Shivananda Circle (r=0.739)
- 1,194 cascade chains detected

---

## Dashboard (`dashboard.py`)

**Structure:** 3 pages (was 7, simplified for officers)

### Page 1: Officer Screen ("GO HERE NOW")
- ONE junction at top, big text
- Congestion Damage | Gridlock Score | Top Vehicle | Urgency
- Action box: "Clear the tanker parked on the east side"
- SMS Alert button (mock)
- Top 5 enforcement priorities table

### Page 2: Commissioner View
- Section 1: "The 7% Rule" — Pareto chart + insight
- Section 2: "Cascade Proof" — Top 5 pairs + circularity caveat
- Section 3: "Pilot Plan" — Rs 14K, 2 weeks, 294x ROI + map

### Page 3: Validation
- Backtest R² + MAE
- Cascade evidence (pairs tested, significant, max correlation)
- Case study (Doopanahalli)
- One deployment impact

---

## Performance

| Metric | Before Rewrite | After Rewrite |
|--------|---------------|---------------|
| Total pipeline time | 194s | 42s |
| Dashboard pages | 7 | 3 |
| Total code lines | 1,439 | 983 |
| Cascade pairs | 355 | 359 |

---

## Success Criteria (All Met)

- [x] JSON explosion: 298,450 → 348,455 violation events
- [x] Duration estimation: no nulls in duration_minutes
- [x] CongestionCost: delay formula implemented
- [x] JunctionGuard: distance-based multipliers working
- [x] Gridlock Score: 0-100 normalized
- [x] Counter-intuitive examples: 182x difference documented
- [x] XGBoost: R²=0.9982 on held-out data
- [x] Cascade detection: r=0.978, 359 significant pairs
- [x] Officer screen: ONE junction, ONE action, SMS alert
- [x] Pilot plan: Rs 14K, 2 weeks, 294x ROI
- [x] 3-page dashboard: Officer, Commissioner, Validation
- [x] Full pipeline: 42 seconds
- [x] Code review: all critical bugs fixed

---

## Score Projection (Final)

| Criterion | Original | Final | Change |
|-----------|----------|-------|--------|
| Feasibility | 9/10 | 10/10 | +1 (historical lag replaces simulated speed) |
| Relevance | 8/10 | 9/10 | +1 (officer screen + BBMP advisory framing) |
| Innovation | 9/10 | 10/10 | +1 (cascade detection from timestamps) |
| Impact | 8/10 | 9/10 | +1 (pilot design + concrete ROI) |
| **Total** | **34/40** | **38/40** | **+4** |
