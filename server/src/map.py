from typing import List, Dict, Any, Tuple
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
    shading: List[Tuple[int, int]] = Field(default_factory=list)  # список (x, y) заштрихованных клеток
    # Можно добавить слои, объекты и т.д.

    def add_wall(self, wall: 'Wall'):
        self.walls.append(wall)

    def remove_wall(self, wall_index: int):
        if 0 <= wall_index < len(self.walls):
            self.walls.pop(wall_index)

    def add_shading(self, x: int, y: int):
        if (x, y) not in self.shading:
            self.shading.append((x, y))

    def remove_shading(self, x: int, y: int):
        if (x, y) in self.shading:
            self.shading.remove((x, y))

    def clear_shading(self):
        self.shading.clear()

    def to_dict(self) -> Dict[str, Any]:
        d = self.dict()
        d['shading'] = [list(cell) for cell in self.shading]  # для удобства фронта
        return d 