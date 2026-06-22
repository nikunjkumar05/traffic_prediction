@echo off
cd /d "C:\Users\sange\Downloads\project\frontend"
set PATH=C:\nvm4w\nodejs;%~dp0node_modules\.bin;%PATH%
echo Starting Vite with env from frontend\.env
vite --port 3000 --host 127.0.0.1
