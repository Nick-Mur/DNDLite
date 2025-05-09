from typing import List, Dict, Any
from pydantic import BaseModel, Field

class Wall(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class MapState(BaseModel):
    width: int = 20
    height: int = 20
    walls: List[Wall] = Field(default_factory=list)
    # Можно добавить слои, объекты и т.д.

    def add_wall(self, wall: 'Wall'):
        self.walls.append(wall)

    def remove_wall(self, wall_index: int):
        if 0 <= wall_index < len(self.walls):
            self.walls.pop(wall_index)

    def to_dict(self) -> Dict[str, Any]:
        return self.dict() 