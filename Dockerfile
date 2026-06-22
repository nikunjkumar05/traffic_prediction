# =============================================================================
# DispatchMind v2.0 — Production Dockerfile
# Multi-stage: Python backend + Node frontend → single deployable image (nginx)
# =============================================================================

# ---- Stage 1: Python Backend ----
FROM python:3.12-slim AS backend

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY src/ src/
COPY config/ config/
COPY phantom_risk.py preprocess.py tipping_points.py ./
COPY "jan to may police violation_anonymized791b166.csv" ./
COPY data/external/ data/external/

EXPOSE 8000
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]


# ---- Stage 2: Frontend build ----
FROM node:20-slim AS frontend

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev

COPY frontend/ .
RUN npx vite build


# ---- Stage 3: Production runtime ----
FROM nginx:alpine AS production

# Copy backend
COPY --from=backend /app /app

# Copy frontend build
COPY --from=frontend /app/dist /usr/share/nginx/html

# Nginx config: serve frontend + proxy /api to backend
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # API proxy — pass /api requests to the Python backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

EOF

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/api/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
