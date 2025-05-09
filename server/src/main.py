import os
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import logging
from server.src.session import GameSessionManager
import json

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dnd-lite")

session_manager = GameSessionManager()

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
            elif action == "roll_dice":
                user = payload.get("user", "player")
                formula = payload.get("formula")
                if formula:
                    try:
                        dice_roll = session.roll_dice(user, formula)
                        await session.broadcast(json.dumps({"action": "dice_result", "payload": dice_roll.dict()}))
                        await session.broadcast(json.dumps({"action": "log_state", "payload": session.get_log()}))
                    except Exception as e:
                        await websocket.send_text(json.dumps({"error": f"Dice error: {str(e)}"}))
                else:
                    await websocket.send_text(json.dumps({"error": "No dice formula"}))
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
            else:
                await websocket.send_text(json.dumps({"error": "Unknown action"}))
    except WebSocketDisconnect:
        session.disconnect(websocket)
        await session.broadcast(json.dumps({"action": "info", "payload": f"[{session_id}] Игрок отключился"}))
        if not session.connections:
            session_manager.remove(session_id) 