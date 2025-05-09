from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
import datetime

DATABASE_URL = "sqlite+aiosqlite:///./dndlite.db"

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

class Room(Base):
    __tablename__ = "rooms"
    id = Column(String, primary_key=True, index=True)
    created_at = Column(Float, default=lambda: datetime.datetime.utcnow().timestamp())

class Asset(Base):
    __tablename__ = "assets"
    id = Column(String, primary_key=True, index=True)
    filename = Column(String)
    url = Column(String)
    content_type = Column(String)
    size = Column(Integer)
    uploaded_at = Column(Float, default=lambda: datetime.datetime.utcnow().timestamp())

class RoomState(Base):
    __tablename__ = "room_states"
    id = Column(String, primary_key=True, index=True)
    created_at = Column(Float, default=lambda: datetime.datetime.utcnow().timestamp(), index=True)
    state = Column(JSON)

class RollLog(Base):
    __tablename__ = "roll_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    user = Column(String)
    formula = Column(String)
    result = Column(Integer)
    details = Column(Text)
    timestamp = Column(Float, default=lambda: datetime.datetime.utcnow().timestamp())

# Функция для создания таблиц
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) 