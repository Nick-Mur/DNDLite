# D&D-Lite

Веб-приложение для проведения настольных ролевых игр (D&D и аналогов) с поддержкой карт, фигур, бросков кубиков и синхронизации в реальном времени.

## Архитектура

- **Frontend:** React (TypeScript, Vite), Zustand/Redux, socket.io-client, Konva.js/PixiJS
- **Backend:** NestJS (TypeScript), MongoDB (Mongoose), socket.io, class-validator
- **Real-time:** WebSocket (socket.io)

## Структура проекта

- `client/` — фронтенд
- `server/` — бэкенд

## Быстрый старт

1. Установите зависимости:
   - `cd client && npm install`
   - `cd ../server && npm install`
2. Запустите backend:
   - `cd server && npm run start:dev`
3. Запустите frontend:
   - `cd client && npm run dev`

---

## Этапы разработки

1. Базовая структура и настройка
2. Ядро backend (сервер, WebSocket)
3. Ядро frontend (SPA, WebSocket)
4. Карта, токены, кубики, инициатива
5. Тесты и документация 