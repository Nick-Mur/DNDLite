import os
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
from server.src.session import GameSessionManager
import json
import uuid
import hashlib
import random

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dnd-lite")

session_manager = GameSessionManager()

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '../../assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# --- Глобальный чат лог (500 строк) ---
chat_log = []

@app.get("/")
def read_root():
    logger.info("GET / запрос получен")
    return {"message": "Добро пожаловать в D&D-Lite backend!"}

@app.websocket("/ws/game/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    # Ждём client_id первым сообщением
    data = await websocket.receive_text()
    logger.info(f"[DEBUG] Получено первое сообщение: {data}")
    try:
        hello = json.loads(data)
        client_id = hello.get("client_id")
        if not client_id:
            await websocket.send_text(json.dumps({"error": "client_id required"}))
            await websocket.close()
            return
    except Exception:
        await websocket.send_text(json.dumps({"error": "Invalid hello"}))
        await websocket.close()
        return
    session = session_manager.get_or_create(session_id)
    if session.is_kicked(client_id):
        await websocket.send_text(json.dumps({"error": "kicked"}))
        await websocket.close()
        return
    await session.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"[DEBUG] Получено сообщение в цикле: {data}")
            logger.info(f"[{session_id}] Получено сообщение: {data}")
            try:
                msg = json.loads(data)
                action = msg.get("action")
                payload = msg.get("payload", {})
            except Exception as e:
                await websocket.send_text(json.dumps({"error": "Invalid JSON", "details": str(e)}))
                continue

            if action == "get_players":
                await websocket.send_text(json.dumps({"action": "players_state", "payload": session.get_players()}))
            elif action == "update_player_info":
                session.update_player_info(client_id, payload)
                await session.broadcast(json.dumps({"action": "players_state", "payload": session.get_players()}))
            elif action == "kick_player":
                # Только ГМ может кикать
                if session.gm_id == client_id:
                    to_kick = payload.get("client_id")
                    if to_kick and to_kick != client_id:
                        session.kick_player(to_kick)
                        await session.broadcast(json.dumps({"action": "players_state", "payload": session.get_players()}))
                        await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Only GM can kick"}))
            elif action == "get_map":
                await websocket.send_text(json.dumps({"action": "map_state", "payload": session.get_map()}))
            elif action == "add_wall":
                session.add_wall(payload)
                await session.broadcast(json.dumps({"action": "map_state", "payload": session.get_map()}))
                await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
            elif action == "remove_wall":
                idx = payload.get("index")
                if isinstance(idx, int):
                    session.remove_wall(idx)
                    await session.broadcast(json.dumps({"action": "map_state", "payload": session.get_map()}))
                    await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Invalid wall index"}))
            elif action == "get_tokens":
                await websocket.send_text(json.dumps({"action": "tokens_state", "payload": session.get_tokens()}))
            elif action == "add_token":
                session.add_token(payload)
                await session.broadcast(json.dumps({"action": "tokens_state", "payload": session.get_tokens()}))
                await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
            elif action == "move_token":
                tid = payload.get("id")
                x = payload.get("x")
                y = payload.get("y")
                if tid and isinstance(x, int) and isinstance(y, int):
                    session.move_token(tid, x, y)
                    await session.broadcast(json.dumps({"action": "tokens_state", "payload": session.get_tokens()}))
                    await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Invalid token move data"}))
            elif action == "remove_token":
                tid = payload.get("id")
                if tid:
                    session.remove_token(tid)
                    await session.broadcast(json.dumps({"action": "tokens_state", "payload": session.get_tokens()}))
                    await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Invalid token id"}))
            elif action == "chat.msg":
                msg_obj = {"user": payload.get("user", "Гость"), "text": payload.get("text", "")}
                chat_log.append(msg_obj)
                if len(chat_log) > 500:
                    chat_log.pop(0)
                await session.broadcast(json.dumps({"action": "chat.msg", "payload": msg_obj}))
            elif action == "roll_dice":
                user = payload.get("user", "player")
                formula = payload.get("formula")
                if not formula:
                    await websocket.send_text(json.dumps({"error": "No dice formula"}))
                    return
                # Генерируем salt и бросаем кубики
                salt = str(random.randint(1, 1_000_000))
                try:
                    dice_roll = session.roll_dice(user, formula)
                except Exception as e:
                    await websocket.send_text(json.dumps({"error": f"Dice error: {str(e)}"}))
                    return
                commit = hashlib.sha256((salt + str(dice_roll.result)).encode()).hexdigest()
                # Сначала отправляем hash всем
                await session.broadcast(json.dumps({"action": "dice.commit", "payload": {"user": user, "commit": commit}}))
                # Затем результат и salt
                display = f"{user} бросил {formula}: {dice_roll.result} ({dice_roll.details})"
                await session.broadcast(json.dumps({"action": "dice.result", "payload": {"user": user, "formula": formula, "result": dice_roll.result, "details": dice_roll.details, "salt": salt, "commit": commit, "display": display}}))
            elif action == "get_dice_history":
                await websocket.send_text(json.dumps({"action": "dice_history", "payload": session.get_dice_history()}))
            elif action == "get_log":
                await websocket.send_text(json.dumps({"action": "log_state", "payload": session.get_log()}))
            elif action == "set_initiative":
                tid = payload.get("id")
                initiative = payload.get("initiative")
                if tid and isinstance(initiative, int):
                    session.set_initiative(tid, initiative)
                    await session.broadcast(json.dumps({"action": "tokens_state", "payload": session.get_tokens()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Invalid initiative data"}))
            elif action == "start_turns":
                session.start_turns()
                await session.broadcast(json.dumps({"action": "turn_state", "payload": session.get_turn_state()}))
            elif action == "next_turn":
                session.next_turn()
                await session.broadcast(json.dumps({"action": "turn_state", "payload": session.get_turn_state()}))
            elif action == "get_turn_state":
                await websocket.send_text(json.dumps({"action": "turn_state", "payload": session.get_turn_state()}))
            elif action == "add_shading":
                if session.gm_id == client_id:
                    x, y = payload.get("x"), payload.get("y")
                    if isinstance(x, int) and isinstance(y, int):
                        session.map.add_shading(x, y)
                        await session.broadcast(json.dumps({"action": "map_state", "payload": session.get_map()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Only GM can edit shading"}))
            elif action == "remove_shading":
                if session.gm_id == client_id:
                    x, y = payload.get("x"), payload.get("y")
                    if isinstance(x, int) and isinstance(y, int):
                        session.map.remove_shading(x, y)
                        await session.broadcast(json.dumps({"action": "map_state", "payload": session.get_map()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Only GM can edit shading"}))
            elif action == "clear_shading":
                if session.gm_id == client_id:
                    session.map.clear_shading()
                    await session.broadcast(json.dumps({"action": "map_state", "payload": session.get_map()}))
                else:
                    await websocket.send_text(json.dumps({"error": "Only GM can edit shading"}))
            elif action == "map.setCurrent":
                url = payload.get("url")
                if url:
                    session.state["map_url"] = url
                    await session.broadcast(json.dumps({"action": "map.setCurrent", "payload": {"url": url}}))
            elif action == "fog.update":
                lines = payload.get("lines")
                if isinstance(lines, list):
                    session.state["fog_lines"] = lines
                    await session.broadcast(json.dumps({"action": "fog.update", "payload": {"lines": lines}}))
            else:
                await websocket.send_text(json.dumps({"error": "Unknown action"}))
    except WebSocketDisconnect:
        session.disconnect(websocket)
        await session.broadcast(json.dumps({"action": "info", "payload": f"[{session_id}] Игрок отключился"}))
        if not session.connections:
            session_manager.remove(session_id)

@app.post("/rooms")
def create_room():
    session_id = str(uuid.uuid4())[:8]
    session_manager.get_or_create(session_id)
    logger.info(f"Создана новая комната: {session_id}")
    return JSONResponse(content={"slug": session_id})

@app.post("/assets")
async def upload_asset(file: UploadFile = File(...)):
    if file.content_type not in ["image/png", "image/jpeg"]:
        raise HTTPException(status_code=400, detail="Только PNG и JPG поддерживаются")
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 20 МБ)")
    ext = ".png" if file.content_type == "image/png" else ".jpg"
    filename = str(uuid.uuid4()) + ext
    path = os.path.join(ASSETS_DIR, filename)
    with open(path, "wb") as f:
        f.write(contents)
    url = f"/assets/{filename}"
    logger.info(f"Загружен файл: {filename}")
    return {"url": url} 