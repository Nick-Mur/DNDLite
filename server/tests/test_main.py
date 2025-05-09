import sys
import os
import pytest
from fastapi.testclient import TestClient
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from server.src.main import app
from server.src.session import GameSessionManager

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Добро пожаловать в D&D-Lite backend!"}

def test_websocket_echo():
    with client.websocket_connect("/ws/game/testsession1") as ws:
        ws.send_text(json.dumps({"action": "get_map"}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["action"] == "map_state"
        assert "width" in msg["payload"]
        ws.send_text(json.dumps({"action": "add_wall", "payload": {"x1": 1, "y1": 2, "x2": 3, "y2": 4}}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["action"] == "map_state"
        assert len(msg["payload"]["walls"]) == 1
        ws.send_text(json.dumps({"action": "remove_wall", "payload": {"index": 0}}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert len(msg["payload"]["walls"]) == 0
        ws.close()

def test_token_lifecycle():
    with client.websocket_connect("/ws/game/tokentest") as ws:
        # Добавить токен
        ws.send_text(json.dumps({"action": "add_token", "payload": {"id": "t1", "x": 1, "y": 2, "name": "Hero", "color": "#ff0000"}}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["action"] == "tokens_state"
        assert len(msg["payload"]) == 1
        # Переместить токен
        ws.send_text(json.dumps({"action": "move_token", "payload": {"id": "t1", "x": 5, "y": 6}}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["payload"][0]["x"] == 5 and msg["payload"][0]["y"] == 6
        # Получить токены
        ws.send_text(json.dumps({"action": "get_tokens"}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert len(msg["payload"]) == 1
        # Удалить токен
        ws.send_text(json.dumps({"action": "remove_token", "payload": {"id": "t1"}}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert len(msg["payload"]) == 0
        ws.close()

def test_dice_roll():
    with client.websocket_connect("/ws/game/dicetest") as ws:
        ws.send_text(json.dumps({"action": "roll_dice", "payload": {"user": "testuser", "formula": "2d6+1"}}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["action"] == "dice_result"
        assert msg["payload"]["user"] == "testuser"
        assert msg["payload"]["formula"] == "2d6+1"
        assert isinstance(msg["payload"]["result"], int)
        ws.send_text(json.dumps({"action": "get_dice_history"}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["action"] == "dice_history"
        assert len(msg["payload"]) >= 1
        ws.close()

def test_websocket_isolation():
    with client.websocket_connect("/ws/game/sessionA") as wsA, \
         client.websocket_connect("/ws/game/sessionB") as wsB:
        wsA.send_text(json.dumps({"action": "add_wall", "payload": {"x1": 0, "y1": 0, "x2": 1, "y2": 1}}))
        dataA = wsA.receive_text()
        wsB.send_text(json.dumps({"action": "get_map"}))
        dataB = wsB.receive_text()
        msgB = json.loads(dataB)
        assert len(msgB["payload"]["walls"]) == 0  # Изоляция сессий
        wsA.close()
        wsB.close()

def test_session_manager():
    manager = GameSessionManager()
    s1 = manager.get_or_create("abc")
    s2 = manager.get_or_create("abc")
    s3 = manager.get_or_create("def")
    assert s1 is s2
    assert s1 is not s3
    manager.remove("abc")
    assert "abc" not in manager.sessions

def test_turns():
    with client.websocket_connect("/ws/game/turntest") as ws:
        # Добавить два токена
        ws.send_text(json.dumps({"action": "add_token", "payload": {"id": "t1", "x": 0, "y": 0}}))
        ws.receive_text()
        ws.send_text(json.dumps({"action": "add_token", "payload": {"id": "t2", "x": 1, "y": 1}}))
        ws.receive_text()
        # Установить инициативу
        ws.send_text(json.dumps({"action": "set_initiative", "payload": {"id": "t1", "initiative": 15}}))
        ws.receive_text()
        ws.send_text(json.dumps({"action": "set_initiative", "payload": {"id": "t2", "initiative": 20}}))
        ws.receive_text()
        # Старт пошагового режима
        ws.send_text(json.dumps({"action": "start_turns"}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["action"] == "turn_state"
        assert msg["payload"]["turn_order"] == ["t2", "t1"]
        # Следующий ход
        ws.send_text(json.dumps({"action": "next_turn"}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["payload"]["current_token_id"] == "t1"
        # Получить состояние очереди
        ws.send_text(json.dumps({"action": "get_turn_state"}))
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["payload"]["turn_order"] == ["t2", "t1"]
        ws.close() 