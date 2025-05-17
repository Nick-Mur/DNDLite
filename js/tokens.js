// tokens.js — логика фишек
import { showGlobalTokenTooltip, hideGlobalTokenTooltip } from './tokenTooltip.js';

export let tokens = [];
export let currentTokenId = null;

export function isOccupied(x, y, exclude = null) {
  return tokens.some(t => t.x === x && t.y === y && t.id !== exclude);
}

export function redrawTokens(gridSize, placeToken) {
  document.querySelectorAll('.token').forEach(e => e.remove());
  tokens.forEach(t => placeToken(t, gridSize));
}

export function placeToken(t, gridSize) {
  if (t.x >= gridSize || t.y >= gridSize) return;
  document.querySelector(`.token[data-id="${t.id}"]`)?.remove();
  const cell = document.querySelector(`.grid-cell[data-x="${t.x}"][data-y="${t.y}"]`);
  if (!cell) return;
  const el = document.createElement('div');
  el.className = 'token';
  el.dataset.id = t.id;
  el.style.background = t.color;
  el.textContent = Array.from(t.name)[0]?.toUpperCase?.() || '';
  el.draggable = true;
  cell.appendChild(el);
  el.addEventListener('dragstart', ev => {
    if (window.selectedTool !== 'hand') { ev.preventDefault(); return; }
    ev.dataTransfer.setData('text/plain', t.id);
  });
  el.addEventListener('mouseenter', function(e) {
    if(window.selectedTool==='hand') {
      const rect = el.getBoundingClientRect();
      const graphemes = Array.from(t.name);
      const tooltipText = graphemes.slice(0, 20).join('');
      const tooltipHeight = 28;
      let top = rect.top - tooltipHeight - 6;
      if (top < 0) {
        top = rect.bottom + 6;
      }
      showGlobalTokenTooltip(tooltipText, rect.left + rect.width/2, top);
      document.getElementById('global-token-tooltip').style.transform = 'translate(-50%, 0)';
    }
  });
  el.addEventListener('mouseleave', function() {
    hideGlobalTokenTooltip();
  });
}

export function refreshTokenList(tokenList, openTokenModal, highlightTokenOnField) {
  tokenList.innerHTML = '';
  tokens.forEach(tok => {
    const row = document.createElement('div');
    row.className = 'flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer';
    row.innerHTML = `<span class='inline-block w-4 h-4 rounded-full mr-2' style='background:${tok.color}'></span>${tok.name}`;
    row.addEventListener('click', () => openTokenModal(tok));
    row.addEventListener('mouseenter', () => highlightTokenOnField(tok.id, true));
    row.addEventListener('mouseleave', () => highlightTokenOnField(tok.id, false));
    tokenList.appendChild(row);
  });
}

export function highlightTokenOnField(tokenId, highlight) {
  const tokenEl = document.querySelector(`.token[data-id="${tokenId}"]`);
  if (tokenEl) {
    if (highlight) {
      tokenEl.classList.add('highlight');
    } else {
      tokenEl.classList.remove('highlight');
    }
  }
}

export function enableTokenDragAndDrop(gameGrid, tokens, gridSize, redrawTokens, refreshTokenList) {
  // Drag&Drop только в режиме 'рука'
  gameGrid.addEventListener('dragover', e => {
    if (window.selectedTool === 'hand') e.preventDefault();
  });
  gameGrid.addEventListener('drop', e => {
    if (window.selectedTool !== 'hand') return; e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const tok = tokens.find(t => t.id === id);
    const cell = e.target.closest('.grid-cell');
    if (!(tok && cell)) return;
    const newX = parseInt(cell.dataset.x);
    const newY = parseInt(cell.dataset.y);
    if (isOccupied(newX, newY, id)) { alert('В этой клетке уже есть фишка'); return; }
    tok.x = newX; tok.y = newY;
    redrawTokens(gridSize, placeToken);
    refreshTokenList();
  });
}

// Остальные функции: placeToken, openTokenModal, closeTokenModal, refreshTokenList, highlightTokenOnField и т.д. будут добавлены далее. 