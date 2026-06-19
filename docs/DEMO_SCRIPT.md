# ParkIntel v2 — 3-Minute Demo Script

## Setup (Before Recording)
1. Run `pip install -r requirements.txt`
2. Run `streamlit run dashboard.py`
3. Open browser to `http://localhost:8501`
4. Start screen recording (OBS/QuickTime)

---

## Minute 1: The Problem + Counter-Intuitive Insight (0:00 - 1:00)

### Scene 1: Title Card (0:00 - 0:10)
**[Show title slide or say]**
> "ParkIntel v2 — AI Parking Enforcement System for Bengaluru Traffic Police"

### Scene 2: The Problem (0:10 - 0:30)
**[Show Tab 1: Hotspot Heatmap]**
> "Bengaluru has 298,000 parking violations in 5 months. Police use count-based heatmaps to find hotspots. But this is misleading."

### Scene 3: Counter-Intuitive Demo (0:30 - 1:00)
**[Scroll to bottom of Tab 1 — show counter-intuitive insight]**
> "Look at this. Zone A has 50 scooter violations — wrong parking. Zone B has 12 tanker violations at a junction. Zone B causes 182x more delay than Zone A. But a count-based heatmap shows Zone A as the bigger problem. This is wrong."

**[Point to the numbers]**
> "Zone A: 50 violations = 0.3 vehicle-minutes delay. Zone B: 12 violations = 54.8 vehicle-minutes delay. Our CongestionCost™ formula captures this difference."

---

## Minute 2: The Solution — Live Dashboard (1:00 - 2:00)

### Scene 4: CongestionCost™ Map (1:00 - 1:20)
**[Switch to Tab 2: CongestionCost™ Map]**
> "This is our CongestionCost™ map. It shows actual traffic impact, not just violation count. Red circles are high-impact junctions. Green are low-impact."

**[Hover over a red circle]**
> "Look at Doopanahalli Bus Stop — 2.2 million vehicle-minutes of delay from parking violations. This is where enforcement should focus."

### Scene 5: Prediction Forecasts (1:20 - 1:40)
**[Switch to Tab 3: Prediction Forecasts]**
> "Our XGBoost model predicts hotspots for any hour. Let's see 6 PM — evening rush."

**[Slide to hour 18]**
> "The model predicts these junctions will have the highest congestion at 6 PM. Police can pre-position tow trucks before violations happen."

### Scene 6: Dispatch Routes (1:40 - 2:00)
**[Switch to Tab 4: Dispatch Routes]**
> "Here's the optimized tow truck route. OR-tools VRP solves the vehicle routing problem in real-time. Two trucks, 30 km max distance, 15 stops total."

**[Show the route lines]**
> "The blue and red lines show the optimized paths. This reduces patrol time by 40%."

---

## Minute 3: Impact + Closing (2:00 - 3:00)

### Scene 7: One-Deployment Impact (2:00 - 2:30)
**[Switch to Tab 7: One-Deployment Impact]**
> "Here's the impact if BTP deploys this at ONE junction for ONE month."

**[Show the numbers]**
> "Doopanahalli Bus Stop: 2,949 hours of commuter time saved per month. Rs 88,494 fuel saved per month. 40% patrol hours optimized."

**[Show scalability]**
> "If deployed across all 168 junctions: 495,000 hours saved per month. Rs 14.9 million fuel saved per month."

### Scene 8: Validation (2:30 - 2:45)
**[Switch to Tab 6: Validation Results]**
> "Our model is validated. XGBoost R² = 0.9982. Speed correlation = -0.43 (negative = correct direction). Silk Board case study shows 1,000+ violations at Bengaluru's worst bottleneck."

### Scene 9: Closing (2:45 - 3:00)
**[Return to title or show all tabs]**
> "ParkIntel v2 replaces 'where are most violations' with 'where is most delay caused'. This is how we make parking enforcement data-driven. Thank you."

**[Stop recording]**

---

## Key Phrases to Use
- "182x difference" (counter-intuitive insight)
- "CongestionCost™" (our innovation)
- "vehicle-minutes of delay" (the unit)
- "OR-tools VRP" (routing optimization)
- "XGBoost R² = 0.9982" (model performance)
- "40% patrol hours optimized" (impact)
- "Rs 88,494/month fuel saved" (ROI)

## Files to Have Open During Demo
1. `http://localhost:8501` (Streamlit dashboard)
2. Terminal (for running commands)
3. Text editor (for showing code snippets if needed)

## Tips
- Speak slowly and clearly
- Pause after key numbers (182x, 2,949 hours, Rs 88,494)
- Use mouse to highlight key areas on the map
- Keep energy high — this is a competition!
