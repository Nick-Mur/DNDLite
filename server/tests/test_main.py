import sys
import os
import pytest
import json
import uuid
import pytest_asyncio
import websockets
import asyncio
import httpx
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from server.src.main import app

# Оставлены только асинхронные тесты

@pytest.mark.asyncio
async def test_async_ws_get_players():
    session_id = str(uuid.uuid4())
    client_id = 'async_test_user'
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        await ws.send(json.dumps({"action": "get_players"}))
        data = await asyncio.wait_for(ws.recv(), timeout=5)
    msg = json.loads(data)
    assert msg["action"] == "players_state"
    assert any(p["client_id"] == client_id for p in msg["payload"])

@pytest.mark.asyncio
async def test_async_token_lifecycle():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    client_id = 'async_token_user'
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        # Добавить токен
        await ws.send(json.dumps({"action": "add_token", "payload": {"id": "t1", "x": 1, "y": 2, "name": "Hero", "color": "#ff0000"}}))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
        assert msg["action"] == "tokens_state"
        assert any(t["id"] == "t1" for t in msg["payload"])
        # Переместить токен
        await ws.send(json.dumps({"action": "move_token", "payload": {"id": "t1", "x": 5, "y": 6}}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "tokens_state":
                break
        t1 = next(t for t in msg["payload"] if t["id"] == "t1")
        assert t1["x"] == 5 and t1["y"] == 6
        # Получить токены
        await ws.send(json.dumps({"action": "get_tokens"}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "tokens_state":
                break
        assert any(t["id"] == "t1" for t in msg["payload"])
        # Удалить токен
        await ws.send(json.dumps({"action": "remove_token", "payload": {"id": "t1"}}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "tokens_state":
                break
        assert not any(t["id"] == "t1" for t in msg["payload"])

@pytest.mark.asyncio
async def test_async_dice_roll():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    client_id = 'async_dice_user'
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        await ws.send(json.dumps({"action": "roll_dice", "payload": {"user": "testuser", "formula": "2d6+1"}}))
        # Ждём dice.result (может быть несколько сообщений)
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "dice.result":
                break
        assert msg["payload"]["user"] == "testuser"
        assert msg["payload"]["formula"] == "2d6+1"
        assert isinstance(msg["payload"]["result"], int)
        await ws.send(json.dumps({"action": "get_dice_history"}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "dice_history":
                break
        assert msg["action"] == "dice_history"
        assert len(msg["payload"]) >= 1

@pytest.mark.asyncio
async def test_async_websocket_isolation():
    sessionA = str(uuid.uuid4())
    sessionB = str(uuid.uuid4())
    urlA = f"ws://127.0.0.1:8000/ws/game/{sessionA}"
    urlB = f"ws://127.0.0.1:8000/ws/game/{sessionB}"
    async with websockets.connect(urlA) as wsA, websockets.connect(urlB) as wsB:
        await wsA.send(json.dumps({"client_id": "A"}))
        await wsB.send(json.dumps({"client_id": "B"}))
        await wsA.send(json.dumps({"action": "add_wall", "payload": {"x1": 0, "y1": 0, "x2": 1, "y2": 1}}))
        msgA = json.loads(await asyncio.wait_for(wsA.recv(), timeout=5))
        await wsB.send(json.dumps({"action": "get_map"}))
        msgB = json.loads(await asyncio.wait_for(wsB.recv(), timeout=5))
        assert len(msgB["payload"]["walls"]) == 0  # Изоляция сессий

@pytest.mark.asyncio
async def test_async_gm_and_kick():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    gm_id = 'gm1_async'
    player_id = 'player2_async'
    async with websockets.connect(url) as ws_gm:
        await ws_gm.send(json.dumps({"client_id": gm_id}))
        # ГМ подключается первым и становится ГМ
        async with websockets.connect(url) as ws_player:
            await ws_player.send(json.dumps({"client_id": player_id}))
            # Даем серверу время обработать подключение второго игрока
            await asyncio.sleep(0.2)
            # Явно запрашиваем список игроков после подключения второго игрока
            await ws_gm.send(json.dumps({"action": "get_players"}))
            for _ in range(10):
                msg = json.loads(await asyncio.wait_for(ws_gm.recv(), timeout=5))
                if msg["action"] == "players_state":
                    break
            assert any(p["client_id"] == gm_id and p["is_gm"] for p in msg["payload"])
            assert any(p["client_id"] == player_id for p in msg["payload"])
            # ГМ кикает игрока
            await ws_gm.send(json.dumps({"action": "kick_player", "payload": {"client_id": player_id}}))
            # Ждём обновления списка игроков у ГМа
            for _ in range(10):
                msg_gm = json.loads(await asyncio.wait_for(ws_gm.recv(), timeout=5))
                if msg_gm["action"] == "players_state":
                    break
            assert not any(p["client_id"] == player_id for p in msg_gm["payload"])
            # Попытка вернуться — kicked
            async with websockets.connect(url) as ws_player2:
                await ws_player2.send(json.dumps({"client_id": player_id}))
                kicked_msg = await asyncio.wait_for(ws_player2.recv(), timeout=5)
                assert "kicked" in kicked_msg
        await ws_gm.close()
        await ws_player.close()

@pytest.mark.asyncio
async def test_async_action_log():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    client_id = 'log_test_user'
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        # Получить пустой лог
        await ws.send(json.dumps({"action": "get_log"}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "log_state":
                break
        assert isinstance(msg["payload"], list)
        log_len = len(msg["payload"])
        # Добавить токен
        await ws.send(json.dumps({"action": "add_token", "payload": {"id": "tlog1", "x": 1, "y": 2, "name": "LogHero", "color": "#00ff00"}}))
        for _ in range(20):
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "log_state":
                break
        else:
            assert False, "Не пришёл log_state после add_token"
        assert any(e.get("type") == "add_token" and e.get("token", {}).get("id") == "tlog1" for e in msg["payload"])
        # Бросок кубика
        await ws.send(json.dumps({"action": "roll_dice", "payload": {"user": client_id, "formula": "1d6"}}))
        # Явно запрашиваем log_state
        await ws.send(json.dumps({"action": "get_log"}))
        for _ in range(20):
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if msg["action"] == "log_state":
                break
        else:
            assert False, "Не пришёл log_state после roll_dice"
        assert any(e.get("type") == "dice" and e.get("user") == client_id for e in msg["payload"])

def test_create_room():
    with httpx.Client(base_url="http://127.0.0.1:8000") as client:
        response = client.post("/rooms")
        assert response.status_code == 200
        data = response.json()
        assert "slug" in data
        assert len(data["slug"]) >= 6

def test_upload_asset(tmp_path):
    # Создаём временный PNG-файл
    png_path = tmp_path / "test.png"
    with open(png_path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + b"0" * 100)  # минимальный PNG
    with httpx.Client(base_url="http://127.0.0.1:8000") as client:
        with open(png_path, "rb") as f:
            files = {"file": ("test.png", f, "image/png")}
            response = client.post("/assets", files=files)
            assert response.status_code == 200
            data = response.json()
            assert "url" in data
            assert data["url"].startswith("/assets/")

def test_dice_service_uniform():
    from server.src.session import GameSession
    session = GameSession("test")
    results = [session.roll_dice("u", "1d20").result for _ in range(1000)]
    # Проверяем, что все значения от 1 до 20 встречаются
    for i in range(1, 21):
        assert i in results
    # Проверяем edge: 100d1=100
    res = session.roll_dice("u", "100d1").result
    assert res == 100

def test_dice_result_consistency():
    import uuid, asyncio, websockets, json
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    async def run():
        async with websockets.connect(url) as ws1, websockets.connect(url) as ws2:
            await ws1.send(json.dumps({"client_id": "A"}))
            await ws2.send(json.dumps({"client_id": "B"}))
            await ws1.send(json.dumps({"action": "roll_dice", "payload": {"user": "A", "formula": "2d6+1"}}))
            result1 = None
            result2 = None
            for _ in range(20):
                if result1 is None:
                    msg1 = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
                    if msg1.get("action") == "dice.result":
                        result1 = msg1["payload"]["result"]
                if result2 is None:
                    msg2 = json.loads(await asyncio.wait_for(ws2.recv(), timeout=5))
                    if msg2.get("action") == "dice.result":
                        result2 = msg2["payload"]["result"]
                if result1 is not None and result2 is not None:
                    break
            assert result1 == result2
    asyncio.get_event_loop().run_until_complete(run())

@pytest.mark.asyncio
async def test_ws_invalid_action():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    client_id = 'invalid_action_user'
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        await ws.send(json.dumps({"action": "nonexistent_action", "payload": {}}))
        data = await asyncio.wait_for(ws.recv(), timeout=5)
        msg = json.loads(data)
        assert "error" in msg

@pytest.mark.asyncio
async def test_ws_move_nonexistent_token():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    client_id = 'move_token_user'
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        await ws.send(json.dumps({"action": "move_token", "payload": {"id": "not_exist", "x": 1, "y": 1}}))
        # Ожидаем ошибку или отсутствие изменений (сервер не падает)

@pytest.mark.asyncio
async def test_ws_roll_dice_invalid_formula():
    session_id = str(uuid.uuid4())
    url = f"ws://127.0.0.1:8000/ws/game/{session_id}"
    client_id = 'dice_invalid_user'
    async with websockets.connect(url) as ws:
        await ws.send(json.dumps({"client_id": client_id}))
        await ws.send(json.dumps({"action": "roll_dice", "payload": {"user": "test", "formula": "bad_formula"}}))
        data = await asyncio.wait_for(ws.recv(), timeout=5)
        msg = json.loads(data)
        assert "error" in msg

def test_upload_asset_invalid_format():
    with httpx.Client(base_url="http://127.0.0.1:8000") as client:
        file = io.BytesIO(b"notanimage")
        files = {"file": ("test.txt", file, "text/plain")}
        response = client.post("/assets", files=files)
        assert response.status_code == 400
        assert "Только PNG и JPG" in response.text

def test_upload_asset_too_large():
    with httpx.Client(base_url="http://127.0.0.1:8000") as client:
        file = io.BytesIO(b"0" * (21 * 1024 * 1024))
        files = {"file": ("big.png", file, "image/png")}
        response = client.post("/assets", files=files)
        assert response.status_code == 400
        assert "Файл слишком большой" in response.text 