# DND_Platform

## Backend (FastAPI)

```bash
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

Сборка фронтенда:
```bash
npm run build
```

Собранные файлы будут в папке `dist`, FastAPI раздаёт их как статику. 