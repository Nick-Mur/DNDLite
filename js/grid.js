// grid.js — логика игрового поля
export const MAX_GRID_SIZE = 50;
export let gridInitialized = false;
export const cellColors = new Map();

export function key(x, y) { return `${x}_${y}`; }

export function buildGrid(gameGrid, gridSize, redrawTokens) {
  if (!gridInitialized) {
    gameGrid.innerHTML = '';
    for (let y = 0; y < MAX_GRID_SIZE; y++) {
      for (let x = 0; x < MAX_GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        gameGrid.appendChild(cell);
      }
    }
    gridInitialized = true;
  }
  for (let y = 0; y < MAX_GRID_SIZE; y++) {
    for (let x = 0; x < MAX_GRID_SIZE; x++) {
      const cell = gameGrid.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
      if (x < gridSize && y < gridSize) {
        cell.style.display = '';
      } else {
        cell.style.display = 'none';
      }
    }
  }
  gameGrid.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
  gameGrid.style.gridAutoRows = 'var(--cell-size)';
  gameGrid.style.display = 'inline-grid';
  redrawTokens();
}

export function paintCell(cx, cy, color) {
  const cell = document.querySelector(`.grid-cell[data-x="${cx}"][data-y="${cy}"]`);
  if (!cell) return;
  cell.style.background = color;
  if (color) cellColors.set(key(cx, cy), color); else cellColors.delete(key(cx, cy));
} 