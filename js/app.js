// app.js — точка входа, связывает все модули
import { loadSection } from './loader.js';
import { buildGrid, paintCell, MAX_GRID_SIZE, cellColors } from './grid.js';
import { tokens, isOccupied, redrawTokens, placeToken, refreshTokenList, highlightTokenOnField, enableTokenDragAndDrop } from './tokens.js';
import { renderDiceFace, rollDice } from './dice.js';
import { setActiveTool } from './toolbar.js';
import { createGlobalTokenTooltip } from './tokenTooltip.js';

window.addEventListener('DOMContentLoaded', async () => {
  await loadSection('html/settings.html', 'settings-section');
  await loadSection('html/dice.html', 'dice-section');
  await loadSection('html/tokens.html', 'tokens-section');
  await loadSection('html/tools.html', 'tools-section');
  await loadSection('html/field.html', 'field-section');
  await loadSection('html/token-modal.html', 'modals');

  initApp();
});

function initApp() {
  createGlobalTokenTooltip();
  // ======= ГЛОБАЛЬНОЕ СОСТОЯНИЕ =======
  let selectedTool = 'brush';
  let selectedColor = document.getElementById('color-picker').value;
  let brushSize = 1;
  let gridSize = parseInt(document.getElementById('grid-size').value);
  let painting = false;
  let globalTokenTooltip;

  // ======= ССЫЛКИ НА DOM-ЭЛЕМЕНТЫ =======
  const gameGrid = document.getElementById('game-grid');
  const gridSizeInput = document.getElementById('grid-size');
  const clearGridBtn = document.getElementById('clear-grid-btn');
  const brushBtn = document.getElementById('brush-btn');
  const eraserBtn = document.getElementById('eraser-btn');
  const handBtn = document.getElementById('hand-btn');
  const colorPicker = document.getElementById('color-picker');
  const brushSizeSelect = document.getElementById('brush-size');
  const diceSelect = document.getElementById('dice-select');
  const diceFace = document.getElementById('dice-face');
  const diceResult = document.getElementById('dice-result');
  const tokenModal = document.getElementById('token-modal');
  const createTokenBtn = document.getElementById('create-token-btn');
  const tokenNameInput = document.getElementById('token-name');
  const tokenColorInput = document.getElementById('token-color');
  const tokenDescInput = document.getElementById('token-description');
  const tokenXInput = document.getElementById('token-x');
  const tokenYInput = document.getElementById('token-y');
  const deleteTokenBtn = document.getElementById('delete-token-btn');
  const cancelTokenBtn = document.getElementById('cancel-token-btn');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const tokenList = document.getElementById('token-list');

  // ======= НАСТРОЙКИ: СОХРАНЕНИЕ/ЗАГРУЗКА/ВОЗВРАТ В МЕНЮ =======
  const saveGameBtn = document.getElementById('save-game-btn');
  const loadGameBtn = document.getElementById('load-game-btn');
  const loadGameInput = document.getElementById('load-game-input');
  const backToMenuBtn = document.getElementById('back-to-menu-btn');
  const menuScreen = document.getElementById('menu-screen');
  const mainApp = document.getElementById('main-app');

  // ======= ЛОГИКА СЕТКИ =======
  function applyTool(x, y) {
    const half = Math.floor(brushSize / 2);
    for (let dy = -half; dy < brushSize - half; dy++) {
      for (let dx = -half; dx < brushSize - half; dx++) {
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= gridSize || ty >= gridSize) continue;
        if (selectedTool === 'brush') paintCell(tx, ty, selectedColor);
        else if (selectedTool === 'eraser') paintCell(tx, ty, '');
      }
    }
  }

  gameGrid.addEventListener('mousedown', e => {
    if (selectedTool === 'hand') return;
    const cell = e.target.closest('.grid-cell'); if (!cell) return;
    painting = true;
    applyTool(parseInt(cell.dataset.x), parseInt(cell.dataset.y));
  });
  gameGrid.addEventListener('mousemove', e => {
    if (!painting) return; const cell = e.target.closest('.grid-cell'); if (!cell) return;
    applyTool(parseInt(cell.dataset.x), parseInt(cell.dataset.y));
  });
  document.addEventListener('mouseup', () => painting = false);

  // ======= TOOLBAR EVENTS =======
  brushBtn.addEventListener('click',()=>{
    selectedTool='brush';
    window.selectedTool = selectedTool;
    setActiveTool('brush', brushBtn, eraserBtn, handBtn, gameGrid);
  });
  eraserBtn.addEventListener('click',()=>{
    selectedTool='eraser';
    window.selectedTool = selectedTool;
    setActiveTool('eraser', brushBtn, eraserBtn, handBtn, gameGrid);
  });
  handBtn.addEventListener('click',()=>{
    selectedTool='hand';
    window.selectedTool = selectedTool;
    setActiveTool('hand', brushBtn, eraserBtn, handBtn, gameGrid);
  });
  colorPicker.addEventListener('input',e=>selectedColor=e.target.value);
  brushSizeSelect.addEventListener('change',e=>brushSize=parseInt(e.target.value));
  clearGridBtn.addEventListener('click',()=>{document.querySelectorAll('.grid-cell').forEach(c=>c.style.background='');cellColors.clear();});
  gridSizeInput.addEventListener('change',()=>{gridSize=Math.max(1,Math.min(50,parseInt(gridSizeInput.value)||1));buildGrid(gameGrid, gridSize, ()=>redrawTokens(gridSize, placeToken));});

  // ======= DICE =======
  diceFace.addEventListener('click',()=>rollDice(diceFace, diceSelect, diceResult, renderDiceFace));
  diceSelect.addEventListener('change',()=>{renderDiceFace(diceFace, diceSelect, '?'); diceResult.textContent='';});

  // ======= ФИШКИ =======
  function openTokenModal(tok = null) {
    if (tok) {
      window.currentTokenId = tok.id;
      tokenNameInput.value = tok.name;
      tokenColorInput.value = tok.color;
      tokenDescInput.value = tok.description;
      tokenXInput.value = tok.x;
      tokenYInput.value = tok.y;
      deleteTokenBtn.classList.remove('hidden');
    } else {
      window.currentTokenId = null;
      tokenNameInput.value = '';
      tokenColorInput.value = '#3b82f6';
      tokenDescInput.value = '';
      tokenXInput.value = 0;
      tokenYInput.value = 0;
      deleteTokenBtn.classList.add('hidden');
    }
    tokenModal.classList.remove('hidden');
    tokenModal.classList.add('flex');
  }
  function closeTokenModal() {
    tokenModal.classList.add('hidden');
    tokenModal.classList.remove('flex');
  }
  saveTokenBtn.addEventListener('click', () => {
    const name = tokenNameInput.value.trim();
    if (!name) return alert('Введите имя');
    const color = tokenColorInput.value;
    const x = parseInt(tokenXInput.value), y = parseInt(tokenYInput.value);
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return alert('Вне поля');
    if (isOccupied(x, y, window.currentTokenId)) return alert('В этой клетке уже есть фишка');
    const desc = tokenDescInput.value.trim();
    if (window.currentTokenId) {
      Object.assign(tokens.find(t => t.id === window.currentTokenId), { name, color, description: desc, x, y });
    } else {
      tokens.push({ id: Date.now().toString(), name, color, description: desc, x, y });
    }
    buildGrid(gameGrid, gridSize, ()=>redrawTokens(gridSize, placeToken));
    refreshTokenList(tokenList, openTokenModal, highlightTokenOnField);
    closeTokenModal();
  });
  deleteTokenBtn.addEventListener('click', () => {
    const idx = tokens.findIndex(t => t.id === window.currentTokenId);
    if (idx !== -1) tokens.splice(idx, 1);
    buildGrid(gameGrid, gridSize, ()=>redrawTokens(gridSize, placeToken));
    refreshTokenList(tokenList, openTokenModal, highlightTokenOnField);
    closeTokenModal();
  });
  cancelTokenBtn.addEventListener('click', closeTokenModal);
  createTokenBtn.addEventListener('click', () => openTokenModal());
  // Подсветка фишки на поле при наведении на строку в списке
  // (используем прямой импорт)
  // Инициализация списка фишек
  refreshTokenList(tokenList, openTokenModal, highlightTokenOnField);

  // ======= INIT =======
  if (tokens.length === 0) {
    tokens.push(
      {id:'1',name:'Игрок 1',color:'#3b82f6',description:'Воин',x:5,y:5},
      {id:'2',name:'Игрок 2',color:'#ef4444',description:'Маг',x:7,y:5}
    );
  }
  setActiveTool('brush', brushBtn, eraserBtn, handBtn, gameGrid);
  buildGrid(gameGrid, gridSize, ()=>redrawTokens(gridSize, placeToken));
  refreshTokenList(tokenList, openTokenModal, highlightTokenOnField);
  renderDiceFace(diceFace, diceSelect, '?');
  // Включаем drag&drop для фишек
  window.selectedTool = selectedTool;
  enableTokenDragAndDrop(gameGrid, tokens, gridSize, redrawTokens, () => refreshTokenList(tokenList, openTokenModal, highlightTokenOnField));

  // Сохранить игру
  if (saveGameBtn) {
    saveGameBtn.addEventListener('click', () => {
      const state = {
        gridSize,
        cellColors: Array.from(cellColors.entries()),
        tokens: JSON.parse(JSON.stringify(tokens)),
        dice: diceSelect.value,
        diceFaceValue: diceFace.textContent,
        selectedColor: colorPicker.value
      };
      const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dnd_game_state.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    });
  }

  // Загрузить игру
  if (loadGameBtn && loadGameInput) {
    loadGameBtn.addEventListener('click', () => loadGameInput.click());
    loadGameInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const state = JSON.parse(evt.target.result);
          if (typeof state.gridSize === 'number') {
            gridSizeInput.value = state.gridSize;
            gridSize = state.gridSize;
          }
          if (Array.isArray(state.cellColors)) {
            cellColors.clear();
            for (const [key, value] of state.cellColors) cellColors.set(key, value);
          }
          if (Array.isArray(state.tokens)) {
            tokens.length = 0;
            for (const t of state.tokens) tokens.push(t);
          }
          if (state.dice) diceSelect.value = state.dice;
          buildGrid(gameGrid, gridSize, ()=>{
            // Восстановление рисунков
            if (Array.isArray(state.cellColors)) {
              for (const [key, value] of state.cellColors) {
                const [x, y] = key.split('_').map(Number);
                paintCell(x, y, value);
              }
            }
            // После закраски — перерисовать фишки
            redrawTokens(gridSize, placeToken);
          });
          refreshTokenList(tokenList, openTokenModal, highlightTokenOnField);
          // Восстановление значения на кубике и его типа
          renderDiceFace(diceFace, diceSelect, state.diceFaceValue || '?');
          // Восстановление цвета кисти
          if (state.selectedColor) {
            colorPicker.value = state.selectedColor;
            selectedColor = state.selectedColor;
          }
        } catch (e) { alert('Ошибка загрузки файла!'); }
      };
      reader.readAsText(file);
    });
  }

  // Вернуться в меню
  if (backToMenuBtn && menuScreen && mainApp) {
    backToMenuBtn.addEventListener('click', () => {
      mainApp.style.display = 'none';
      menuScreen.style.display = '';
      document.body.classList.add('menu-bg');
    });
  }
}

function showGlobalTokenTooltip(text, x, y) {
  globalTokenTooltip.textContent = text;
  globalTokenTooltip.style.left = x + 'px';
  globalTokenTooltip.style.top = y + 'px';
  globalTokenTooltip.style.opacity = '1';
}

function hideGlobalTokenTooltip() {
  globalTokenTooltip.style.opacity = '0';
}

// Экспортируем функции для tokens.js
export { showGlobalTokenTooltip, hideGlobalTokenTooltip }; 