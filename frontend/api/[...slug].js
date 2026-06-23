// Catch-all Vercel serverless function: maps /api/* to pre-computed JSON
import fs from "fs";
import path from "path";

function findDataDir() {
  // Try paths in order of likelihood
  const candidates = [
    path.join(process.cwd(), "api_data"),
    path.join(__dirname, "..", "api_data"),
    path.join(__dirname, "..", "..", "api_data"),
    path.resolve("/var/task/api_data"),
    path.resolve("/var/task/user/api_data"),
  ];
  for (const dir of candidates) {
    try {
      if (fs.statSync(dir).isDirectory()) return dir;
    } catch {}
  }
  return candidates[0];
}
const DATA_DIR = findDataDir();

const FILE_MAP = {
  "/api/overview": "overview.json",
  "/api/auth/login": "auth-login.json",
  "/api/capacity-status": "capacity-status.json",
  "/api/stations": "stations.json",
  "/api/causal-impact": "causal-impact.json",
  "/api/cascade": "cascade.json",
  "/api/impact-summary": "impact-summary.json",
  "/api/flipkart-logistics": "flipkart-logistics.json",
  "/api/map-data": "map-data.json",
  "/api/spillover-zones": "spillover-zones.json",
  "/api/early-warning-system": "early-warning-system.json",
  "/api/anomaly-scores": "anomaly-scores.json",
  "/api/flipkart-scouts/leaderboard": "flipkart-scouts-leaderboard.json",
  "/api/recent-events": "overview.json",
  "/api/simulator": "capacity-status.json",
  "/api/priority-queue/ALL": "priority-queue-ALL-top10.json",
  "/api/flipkart-scouts/reports": "flipkart-scouts-leaderboard.json",
  "/api/junctions/action": "overview.json",
  "/api/errors": "overview.json",
  "/api/shift-briefing": "overview.json",
  "/api/llm/query": "overview.json",
};

function findFile(urlPath) {
  // Direct match
  if (FILE_MAP[urlPath]) return FILE_MAP[urlPath];

  // Handle /api/priority-queue/{station}
  let m = urlPath.match(/^\/api\/priority-queue\/(.+)$/);
  if (m) {
    const station = m[1].replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_()]/g, "");
    const file = `priority-queue-${station}.json`;
    if (fs.existsSync(path.join(DATA_DIR, file))) return file;
    return FILE_MAP["/api/priority-queue/ALL"];
  }

  // Handle /api/evidence-packet/{id}
  m = urlPath.match(/^\/api\/evidence-packet\/(.+)$/);
  if (m) {
    const file = `evidence-packet-${m[1]}.json`;
    if (fs.existsSync(path.join(DATA_DIR, file))) return file;
    return "evidence-packet-0.json";
  }

  // Handle /api/temporal-profile/{junction}
  m = urlPath.match(/^\/api\/temporal-profile\/(.+)$/);
  if (m) {
    const junc = m[1].replace(/[^a-zA-Z0-9_\-,. ]/g, "");
    const file = `temporal-profile-${junc}.json`;
    if (fs.existsSync(path.join(DATA_DIR, file))) return file;
    return "capacity-status.json";
  }

  // Handle /api/cause-attribution/{junction} or court-readiness/{junction}
  m = urlPath.match(/^\/api\/(?:cause-attribution|court-readiness|flipkart-scouts\/verify)\/.+$/);
  if (m) return "overview.json";

  return null;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const queryString = url.search;

  let file = findFile(pathname);

  // If no match, try stripping query string and matching again
  if (!file) {
    // Handle query-based endpoints
    if (queryString) {
      const q = new URLSearchParams(queryString);
      if (pathname === "/api/priority-queue/ALL") {
        file = "priority-queue-ALL-top10.json";
      } else if (pathname === "/api/repeat-offenders") {
        file = "repeat-offenders-min_violations-3.json";
      } else if (pathname === "/api/dispatch") {
        file = "dispatch-num_trucks-2.json";
      } else if (pathname === "/api/alerts") {
        file = "alerts-count-15.json";
      } else if (pathname === "/api/violations") {
        file = "violations-top_n-10.json";
      }
    }
  }

  if (!file) {
    res.status(404).json({ error: "Not found", path: req.url });
    return;
  }

  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Data file not found", file });
    return;
  }

  const data = fs.readFileSync(filePath, "utf-8");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).end(data);
}
