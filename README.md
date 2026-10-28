# AK Divine Public School ERP

School management ERP for AK Divine Public School.

## Project structure

- `frontend/` — React + Vite application
- `backend/` — Node.js + Express + MongoDB API

## Local development

1. Install backend dependencies: `cd backend && npm install`
2. Configure `backend/.env` locally using `backend/.env.example` as a reference. Never commit environment files or production credentials.
3. Start the backend using the script defined in `backend/package.json`.
4. Install frontend dependencies: `cd frontend && npm install`
5. Configure `frontend/.env.development` locally with the correct API base URL (this file is intentionally ignored by Git).
6. Start the frontend using `npm run dev`.

Use only the AK Divine development database and API credentials. Do not connect this project to another school's production environment.
