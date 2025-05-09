from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional, Dict

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(BaseModel):
    username: str
    hashed_password: str

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.hashed_password)

# Простое in-memory хранилище пользователей (username -> User)
users_db: Dict[str, User] = {}

class CharacterTemplate(BaseModel):
    id: str
    name: str
    description: str = ""
    color: str = "#000000"
    owner: str  # username

# Простое in-memory хранилище шаблонов персонажей (id -> CharacterTemplate)
character_templates_db: Dict[str, CharacterTemplate] = {} 