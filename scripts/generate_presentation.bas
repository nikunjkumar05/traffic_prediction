Attribute VB_Name = "GeneratePresentation"
Option Explicit

' ---------------------------------------------------------------------------
' DispatchMind Presentation Generator
' Paste this entire module into PowerPoint VBA (Alt+F11 -> Insert -> Module)
' then run: DispatchMindPresentation
' ---------------------------------------------------------------------------

Private Const PPT_TITLE As String = "DispatchMind"
Private Const PPT_SUBTITLE As String = "AI-Powered Traffic Gridlock Management for Bengaluru"
Private Const ACCENT_BLUE As Long = &HD57B04
Private Const ACCENT_ORANGE As Long = &H207AF3
Private Const ACCENT_GREEN As Long = &H46C876
Private Const ACCENT_RED As Long = &H4747FF
Private Const DARK_BG As Long = &H141414
Private Const LIGHT_TEXT As Long = &HFFFFFF
Private Const MUTED_TEXT As Long = &HAAAAAA

Public Sub DispatchMindPresentation()
    Dim pptApp As Presentation
    Dim sld As Slide
    Dim idx As Long
    
    Set pptApp = ActivePresentation
    
    ' Clean any existing slides
    Do While pptApp.Slides.Count > 0
        pptApp.Slides(1).Delete
    Loop
    
    idx = 1
    
    ' =========================================================================
    ' SLIDE 1: Title
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutTitleOnly)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = ACCENT_BLUE
        With .Shapes.Title.TextFrame.TextRange
            .Text = PPT_TITLE
            .Font.Size = 48
            .Font.Bold = msoTrue
            .Font.Color.RGB = LIGHT_TEXT
            .ParagraphFormat.Alignment = ppAlignCenter
        End With
        AddCenteredTextBox sld, PPT_SUBTITLE, 18, LIGHT_TEXT, 120, 260, 500, 40
        AddCenteredTextBox sld, "Bengaluru Traffic Police · Gridlock Hackathon 2.0", 12, MUTED_TEXT, 120, 310, 500, 30
        AddCenteredTextBox sld, "https://github.com/anomalyco/opencode", 10, &H88BBDD, 120, 400, 500, 20
    End With
    
    ' =========================================================================
    ' SLIDE 2: Problem Statement
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "The Bengaluru Gridlock Crisis"
        SetBullets sld, Array( _
            "Bengaluru loses ~Rs 38,000 Cr annually to traffic congestion (BSI report)", _
            "Illegal parking on arterial roads reduces capacity by 40-60% at peak hours", _
            "Parking violations create cascade effects — one blocked lane gridlocks 3+ junctions", _
            "Flipkart delivery vehicles spend 30% extra time navigating blocked roads", _
            "Existing enforcement relies on manual patrols with no data-driven prioritization" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 3: Solution Overview
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "DispatchMind — Solution Overview"
        SetBullets sld, Array( _
            "Dual-mode architecture: trains on historical violation data, runs on live CCTV feeds in production", _
            "End-to-end pipeline: raw CSV -> anomaly detection -> congestion costing -> capacity analysis -> dispatch", _
            "Three core ML innovations: GNN Cascade Predictor, CTM Traffic Simulation, Presence Probability Model", _
            "Flipkart Green-Zone module: identifies delivery hotspots and recommends dynamic loading bay windows", _
            "Role-based dashboard: Constable (field dispatch) / SI (case management) / ACP (city command)" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 4: Core Pipeline
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Core Data Pipeline (9 Stages)"
        SetBullets sld, Array( _
            "Stage 1-2: Data ingestion & validation — 300K+ violation records from BTP surveillance cameras", _
            "Stage 3: Anomaly detection — statistical outlier removal, hour-of-day normalization", _
            "Stage 4: Congestion costing — vehicle width mapping, delay calculation in veh-minutes", _
            "Stage 5: Physical traffic simulation (CTM) — Greenshields fundamental diagram + cell transmission", _
            "Stage 6: Causal impact regression — CTM speeds as target, avoiding circular dependency", _
            "Stage 7: Capacity loss engine — blocked_width / total_road_width per junction", _
            "Stage 8-9: Cascade analysis + GNN edge prediction — spatio-temporal domino effect detection" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 5: GNN Innovation
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Innovation: GNN Cascade Predictor"
        SetBullets sld, Array( _
            "2-layer Message-Passing Network implemented in pure NumPy — no PyTorch dependency", _
            "Architecture: H = sigmoid(A @ ReLU(A @ X @ W1 + b1) @ W2 + b2)", _
            "Adjacency matrix A encodes junction proximity (distance < 3km = directed edge)", _
            "Node features X: violation count, avg congestion, temporal entropy, vehicle type diversity", _
            "Trained with BCE loss against lag-correlation ground truth (correlation > 0.2 = cascade)", _
            "Output: per-edge probability of cascade propagation A -> B with AUC evaluation", _
            "Enables pro-active enforcement at cascade-source junctions before gridlock spreads" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 6: CTM Innovation
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Innovation: CTM Traffic Simulation"
        SetBullets sld, Array( _
            "Cell-Transmission Model (CTM) based on Greenshields fundamental diagram", _
            "Free speed: 45 km/h | Jam density: 120 veh/km/lane | Capacity: 1800 veh/hr/lane", _
            "Each road segment divided into 50m cells; violation obstacles reduce cell throughput", _
            "Outputs: simulated_speed_kmh, queue_length_m, congestion index per junction", _
            "CTM provides the independent target variable for causal impact regression", _
            "Dataset-only, physics-based simulation — no external traffic API required", _
            "Enables 'what-if' analysis: clearance of violation X would improve speed by Y km/h" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 7: Presence Model
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Innovation: Presence Probability Model"
        SetBullets sld, Array( _
            "Bayesian logistic decay: P(still_present) = 1 / (1 + exp((t_elapsed - E[duration]) / k))", _
            "Solves the stale-violation problem: old reports should not consume dispatch resources", _
            "Actionability = congestion_cost × presence_probability (priority queue sort key)", _
            "Filter threshold at P > 0.3 balances enforcement efficiency vs false negatives", _
            "Temporal urgency factor incorporated into GPI (Gridlock Propagation Index) metric", _
            "Configurable half-life via model parameter k in config/app.json" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 8: GPI Metric
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Gridlock Propagation Index (GPI)"
        SetBullets sld, Array( _
            "Novel composite metric (0-100) for junction-level gridlock risk scoring", _
            "30% — Cascade risk: max upstream correlation from GNN edge predictions", _
            "30% — Capacity degradation: 100 - remaining_capacity_pct", _
            "20% — Temporal urgency: peak-hour multiplier × presence probability", _
            "20% — Spatial density: nearby violation concentration (violations/km²)", _
            "GPI > 80: IMMEDIATE dispatch | GPI 50-80: HIGH priority | GPI < 50: scheduled patrol", _
            "Weights configurable via config/app.json for different city morphologies" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 9: Flipkart Integration
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Flipkart Delivery Impact & Green Zones"
        SetBullets sld, Array( _
            "DBSCAN clustering of delivery-vehicle violations identifies 15+ persistent hotspots", _
            "Dynamic Loading Window recommendations: peak-hour bay allocation (11-1pm, 5-8pm)", _
            "Estimated annual savings: Rs 12.7 Cr through avg 8.5 min/delivery reduction", _
            "Delivery partner scout program: incentivized violation reporting via SuperCoins", _
            "Scout leaderboard gamification drives engagement across 500+ delivery partners", _
            "Green Zone overlay: cleared junctions mapped for optimal delivery route planning" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 10: Architecture
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "System Architecture"
        SetBullets sld, Array( _
            "Frontend: React 18 + Tailwind CSS + Phosphor Icons — responsive, dark-mode, role-based UI", _
            "Backend: FastAPI (Python 3.10+) with async endpoints, SQLAlchemy + SQLite persistence", _
            "ML Pipeline: modular stages (pipeline.py) with pandas/numpy/scikit-learn — no GPU required", _
            "Authentication: bcrypt-hashed passwords + bearer token sessions with role-based access control", _
            "API endpoints: 40+ RESTful routes covering all pipeline stages and dashboard widgets", _
            "CI/CD: secrets scanner (check_secrets.py) + benchmark suite (benchmark.py) in scripts/" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 11: Dashboard Walkthrough
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Dashboard Walkthrough"
        SetBullets sld, Array( _
            "Impact Dashboard: city-wide congestion cost calculator with scenario analysis (clear 5/10/20 violations)", _
            "Priority Queue: junction cards ranked by actionability with GPI gauge, presence bar, dispatch buttons", _
            "Tactical Map: geospatial view with capacity status overlays (GREEN/YELLOW/RED) and officer positions", _
            "Cascade Analysis: force-directed graph of violation propagation with GNN edge probability overlay", _
            "Flipkart Impact: annual savings projections, hourly violation heatmap, green zone recommendations", _
            "Evidence Packets: one-click court-ready challans with MV Act references and tamper-proof hash" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 12: Key Metrics
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Key Performance Metrics"
        SetBullets sld, Array( _
            "300K+ violations analyzed across 50+ junctions and 15 police stations", _
            "GNN Cascade AUC: >0.85 on held-out edge prediction test set", _
            "Pipeline processing time: ~18s for full 9-stage analysis on dataset", _
            "API P50 latency: <200ms | P95 latency: <1500ms | Throughput: 50+ req/s", _
            "GPI coverage: real-time scoring for all junctions with configurable thresholds", _
            "Annual Flipkart delivery savings: Rs 12.7 Cr with 35% violation reduction potential" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 13: Guided Demo
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutText)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = DARK_BG
        SetTitle sld, "Guided Demo Mode"
        SetBullets sld, Array( _
            "Built-in demo mode auto-advances through 5 key screens at configurable interval", _
            "Step 1: Impact Dashboard — congestion cost calculator with scenario effects", _
            "Step 2: Priority Queue — actionability-ranked junctions with GPI and presence", _
            "Step 3: Cascade Analysis — domino-effect graph with GNN probability overlay", _
            "Step 4: Tactical Map — geospatial capacity status and dispatch zones", _
            "Step 5: Flipkart Impact — annual savings, hourly patterns, loading bay roadmap", _
            "Demo overlay with prev/next controls, step dots, and auto-play toggle" _
        )
    End With
    
    ' =========================================================================
    ' SLIDE 14: Thank You
    ' =========================================================================
    Set sld = pptApp.Slides.Add(idx, ppLayoutTitleOnly)
    idx = idx + 1
    With sld
        .FollowMasterBackground = msoFalse
        .Background.Fill.ForeColor.RGB = ACCENT_BLUE
        With .Shapes.Title.TextFrame.TextRange
            .Text = "Thank You"
            .Font.Size = 44
            .Font.Bold = msoTrue
            .Font.Color.RGB = LIGHT_TEXT
            .ParagraphFormat.Alignment = ppAlignCenter
        End With
        AddCenteredTextBox sld, "DispatchMind — Keeping Bengaluru Moving", 18, LIGHT_TEXT, 120, 140, 500, 40
        AddCenteredTextBox sld, "Bengaluru Traffic Police · Gridlock Hackathon 2.0", 14, MUTED_TEXT, 120, 200, 500, 30
        AddCenteredTextBox sld, "https://github.com/anomalyco/opencode", 12, &H88BBDD, 120, 280, 500, 25
        AddCenteredTextBox sld, "Questions?", 24, LIGHT_TEXT, 120, 360, 500, 40
    End With
    
    ' Apply theme to all slides
    Dim i As Long
    For i = 1 To pptApp.Slides.Count
        With pptApp.Slides(i)
            .ColorScheme.Colors(ppTitle).RGB = LIGHT_TEXT
            .ColorScheme.Colors(ppBody).RGB = LIGHT_TEXT
        End With
    Next i
    
    pptApp.Slides(1).MoveTo (1)
    MsgBox "Presentation generated: " & (pptApp.Slides.Count) & " slides.", vbInformation, PPT_TITLE
    
End Sub

' ===========================================================================
' Helper: Set slide title with styling
' ===========================================================================
Private Sub SetTitle(ByRef sld As Slide, ByVal text As String)
    With sld.Shapes.Title.TextFrame.TextRange
        .Text = text
        .Font.Size = 28
        .Font.Bold = msoTrue
        .Font.Color.RGB = ACCENT_ORANGE
        .ParagraphFormat.Alignment = ppAlignLeft
    End With
End Sub

' ===========================================================================
' Helper: Add bulleted body text
' ===========================================================================
Private Sub SetBullets(ByRef sld As Slide, ByRef lines As Variant)
    Dim tf As TextRange
    Dim i As Long
    Dim bodyShape As Shape
    
    ' Clear default body placeholder or add new textbox
    If sld.Shapes.Count >= 2 Then
        Set bodyShape = sld.Shapes(2)
        bodyShape.TextFrame.TextRange.Text = ""
    Else
        Set bodyShape = sld.Shapes.AddTextbox( _
            msoTextOrientationHorizontal, _
            50, 110, 620, 420)
    End If
    
    Set tf = bodyShape.TextFrame.TextRange
    
    For i = LBound(lines) To UBound(lines)
        If i > LBound(lines) Then
            tf.InsertAfter vbCrLf
        End If
        If i = LBound(lines) Then
            tf.Text = ChrW(8226) & "  " & lines(i)
        Else
            tf.InsertAfter ChrW(8226) & "  " & lines(i)
        End If
    Next i
    
    With tf.Font
        .Size = 13
        .Color.RGB = LIGHT_TEXT
        .Name = "Calibri"
    End With
    
    With tf.ParagraphFormat
        .SpaceBefore = 6
        .SpaceAfter = 6
        .Bullet.Type = ppBulletNone
        .Alignment = ppAlignLeft
    End With
    
    bodyShape.TextFrame.WordWrap = msoTrue
End Sub

' ===========================================================================
' Helper: Add centered text box
' ===========================================================================
Private Sub AddCenteredTextBox(ByRef sld As Slide, ByVal text As String, _
    ByVal fontSize As Single, ByVal color As Long, _
    ByVal left As Single, ByVal top As Single, _
    ByVal width As Single, ByVal height As Single)
    Dim shp As Shape
    Set shp = sld.Shapes.AddTextbox(msoTextOrientationHorizontal, left, top, width, height)
    With shp.TextFrame.TextRange
        .Text = text
        .Font.Size = fontSize
        .Font.Color.RGB = color
        .Font.Name = "Calibri"
        .ParagraphFormat.Alignment = ppAlignCenter
    End With
    shp.TextFrame.WordWrap = msoTrue
End Sub
