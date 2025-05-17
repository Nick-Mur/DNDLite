// toolbar.js — логика панели инструментов
export function setActiveTool(tool, brushBtn, eraserBtn, handBtn, gameGrid) {
  brushBtn.classList.toggle('bg-blue-200', tool === 'brush');
  eraserBtn.classList.toggle('bg-red-200', tool === 'eraser');
  handBtn.classList.toggle('bg-yellow-200', tool === 'hand');
  gameGrid.style.cursor = (tool === 'brush' || tool === 'eraser') ? 'crosshair' : 'default';
} 