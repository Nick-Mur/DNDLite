import logging
from typing import Dict, List, Optional
from fastapi import WebSocket
from server.src.map import MapState, Wall
from pydantic import BaseModel
import random

logger = logging.getLogger("dnd-lite")

class Token(BaseModel):
    id: str
    x: int
    y: int
    name: str = ""
    color: str = "#000000"
    initiative: Optional[int] = None

class DiceRoll(BaseModel):
    user: str
    formula: str
    result: int
    details: str = ""

class GameSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.connections: List[WebSocket] = []
        self.map = MapState()  # Состояние карты
        self.tokens: Dict[str, Token] = {}  # id -> Token
        self.dice_history: List[DiceRoll] = []
        self.turn_order: List[str] = []  # Список id токенов по инициативе
        self.current_turn: int = 0
        self.state = {}  # Здесь будет храниться остальное состояние игры (инициатива и т.д.)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)
        logger.info(f"WebSocket подключён к сессии {self.session_id}: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)
            logger.info(f"WebSocket отключён от сессии {self.session_id}: {websocket.client}")

    async def broadcast(self, message: str):
        for connection in self.connections:
            await connection.send_text(message)

    def add_wall(self, wall_data: dict):
        wall = Wall(**wall_data)
        self.map.add_wall(wall)
        logger.info(f"Добавлена стена в сессию {self.session_id}: {wall}")

    def remove_wall(self, wall_index: int):
        self.map.remove_wall(wall_index)
        logger.info(f"Удалена стена #{wall_index} в сессии {self.session_id}")

    def get_map(self):
        return self.map.to_dict()

    def add_token(self, token_data: dict):
        token = Token(**token_data)
        self.tokens[token.id] = token
        logger.info(f"Добавлен токен {token.id} в сессию {self.session_id}")

    def move_token(self, token_id: str, x: int, y: int):
        if token_id in self.tokens:
            self.tokens[token_id].x = x
            self.tokens[token_id].y = y
            logger.info(f"Токен {token_id} перемещён в сессии {self.session_id}")

    def remove_token(self, token_id: str):
        if token_id in self.tokens:
            del self.tokens[token_id]
            logger.info(f"Токен {token_id} удалён из сессии {self.session_id}")

    def get_tokens(self):
        return [t.dict() for t in self.tokens.values()]

    def roll_dice(self, user: str, formula: str) -> DiceRoll:
        # Поддержка формата NdM (+K), например 2d6+1
        import re
        match = re.fullmatch(r"(\d*)d(\d+)([+-]\d+)?", formula.replace(" ", ""))
        if not match:
            raise ValueError("Invalid dice formula")
        n = int(match.group(1) or 1)
        m = int(match.group(2))
        k = int(match.group(3) or 0)
        rolls = [random.randint(1, m) for _ in range(n)]
        result = sum(rolls) + k
        details = f"Броски: {rolls}, модификатор: {k}"
        dice_roll = DiceRoll(user=user, formula=formula, result=result, details=details)
        self.dice_history.append(dice_roll)
        logger.info(f"Бросок кубиков {formula} ({user}) = {result} [{details}] в сессии {self.session_id}")
        return dice_roll

    def get_dice_history(self):
        return [d.dict() for d in self.dice_history]

    # --- Initiative & Turn Management ---
    def set_initiative(self, token_id: str, initiative: int):
        if token_id in self.tokens:
            self.tokens[token_id].initiative = initiative
            logger.info(f"Токен {token_id} получил инициативу {initiative} в сессии {self.session_id}")

    def start_turns(self):
        # Сортировка по инициативе (по убыванию)
        tokens_with_init = [t for t in self.tokens.values() if t.initiative is not None]
        tokens_with_init.sort(key=lambda t: t.initiative, reverse=True)
        self.turn_order = [t.id for t in tokens_with_init]
        self.current_turn = 0
        logger.info(f"Пошаговый режим начат в сессии {self.session_id}. Порядок: {self.turn_order}")

    def next_turn(self):
        if self.turn_order:
            self.current_turn = (self.current_turn + 1) % len(self.turn_order)
            logger.info(f"Следующий ход: {self.get_current_token_id()} (сессия {self.session_id})")

    def get_current_token_id(self) -> Optional[str]:
        if self.turn_order:
            return self.turn_order[self.current_turn]
        return None

    def get_turn_state(self):
        return {
            "turn_order": self.turn_order,
            "current_turn": self.current_turn,
            "current_token_id": self.get_current_token_id(),
            "initiatives": {tid: self.tokens[tid].initiative for tid in self.turn_order}
        }

class GameSessionManager:
    def __init__(self):
        self.sessions: Dict[str, GameSession] = {}

    def get_or_create(self, session_id: str) -> GameSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = GameSession(session_id)
            logger.info(f"Создана новая игровая сессия: {session_id}")
        return self.sessions[session_id]

    def remove(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Удалена игровая сессия: {session_id}") 