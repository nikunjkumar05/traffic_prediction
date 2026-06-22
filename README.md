# ClearLane - Gridlock 2.0 Hackathon

ClearLane shifts the paradigm from "counting cars" to measuring **capacity loss**. Built for the BTP (Bengaluru Traffic Police), this solution leverages historical lag analysis, anomaly detection, and Flipkart Scout crowdsourcing to detect hidden congestion and prevent cascading gridlock.

## 🚀 Quick Start (Judge's Guide)

To run this project locally, you will need two terminal windows.

### Terminal 1: Backend (FastAPI + SQLite)
```bash
# 1. Navigate to the project directory
cd project

# 2. Install dependencies (if not already installed)
pip install -r requirements.txt

# 3. Start the FastAPI server
uvicorn backend.api:app --reload
```
*The backend will be running at `http://127.0.0.1:8000`*

### Terminal 2: Frontend (React + Vite)
```bash
# 1. Navigate to the frontend directory
cd project/frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
*The frontend will be running at `http://localhost:5173`*

---

## 🧹 Pre-Pitch Setup

Before beginning your live demo for the judges, ensure you run the reset script to clear any test reports and reset offline cameras to a clean state:

```bash
python scripts/reset_demo.py
```

---

## 🔐 Environment Variables

The system operates securely out-of-the-box using **Local Dispatch Mode** (saving API keys and preventing spam). To connect real SMS/WhatsApp webhooks for production, duplicate the `.env.example` file to `.env` and configure your credentials.
