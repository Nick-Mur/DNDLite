async function loadSection(url, containerId) {
  const resp = await fetch(url);
  const html = await resp.text();
  document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

// Загружаем все секции после загрузки DOM
window.addEventListener('DOMContentLoaded', async () => {
  // Основные секции
  await loadSection('tokens.html', 'main-content');
  await loadSection('dice.html', 'main-content');
  await loadSection('tools.html', 'main-content');
  await loadSection('field.html', 'main-content');
  // Модальные окна
  await loadSection('token-modal.html', 'modals');

  // ======= STATE =======
  let tokens = [];
  let currentTokenId = null;
  let selectedTool = 'brush';
  let selectedColor = document.getElementById('color-picker').value;
  let brushSize = 1;
  let gridSize = parseInt(document.getElementById('grid-size').value);
  let painting = false;
  const cellColors = new Map();

  // ======= DOM =======
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

  // ======= GRID =======
  function key(x, y) { return `${x}_${y}`; }

  function isOccupied(x, y, exclude = null) {
    return tokens.some(t => t.x === x && t.y === y && t.id !== exclude);
  }

  function setActiveTool(tool) {
    selectedTool = tool;
    brushBtn.classList.toggle('bg-blue-200', tool === 'brush');
    eraserBtn.classList.toggle('bg-red-200', tool === 'eraser');
    handBtn.classList.toggle('bg-yellow-200', tool === 'hand');
    gameGrid.style.cursor = (tool === 'brush' || tool === 'eraser') ? 'crosshair' : 'default';
  }

  function buildGrid() {
    // сохранить текущие цвета
    cellColors.clear();
    document.querySelectorAll('.grid-cell').forEach(c => {
      const bg = c.style.background;
      if (bg) { cellColors.set(key(c.dataset.x, c.dataset.y), bg); }
    });
    // очистить
    gameGrid.innerHTML = '';
    gameGrid.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    gameGrid.style.gridAutoRows = 'var(--cell-size)';
    gameGrid.style.display = 'inline-grid';
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        const saved = cellColors.get(key(x, y));
        if (saved) cell.style.background = saved;
        gameGrid.appendChild(cell);
      }
    }
    // clamp tokens
    tokens.forEach(t => { t.x = Math.min(gridSize - 1, t.x); t.y = Math.min(gridSize - 1, t.y); });
    redrawTokens();
  }

  function paintCell(cx, cy, color) {
    const cell = document.querySelector(`.grid-cell[data-x="${cx}"][data-y="${cy}"]`);
    if (!cell) return;
    cell.style.background = color;
    if (color) cellColors.set(key(cx, cy), color); else cellColors.delete(key(cx, cy));
  }

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

  // ======= TOKENS =======
  function redrawTokens() {
    document.querySelectorAll('.token').forEach(e => e.remove());
    tokens.forEach(placeToken);
  }
  function placeToken(t) {
    document.querySelector(`.token[data-id="${t.id}"]`)?.remove();
    const cell = document.querySelector(`.grid-cell[data-x="${t.x}"][data-y="${t.y}"]`);
    if (!cell) return;
    const el = document.createElement('div');
    el.className = 'token';
    el.dataset.id = t.id;
    el.style.background = t.color;
    el.textContent = t.name[0].toUpperCase();
    el.draggable = true;
    el.addEventListener('dragstart', ev => {
      if (selectedTool !== 'hand') { ev.preventDefault(); return; }
      ev.dataTransfer.setData('text/plain', t.id);
    });
    cell.appendChild(el);
  }
  gameGrid.addEventListener('dragover', e => { if (selectedTool === 'hand') e.preventDefault(); });
  gameGrid.addEventListener('drop', e => {
    if (selectedTool !== 'hand') return; e.preventDefault();
    const id = e.dataTransfer.getData('text/plain'); const tok = tokens.find(t => t.id === id);
    const cell = e.target.closest('.grid-cell'); if (!(tok && cell)) return;
    const newX = parseInt(cell.dataset.x); const newY = parseInt(cell.dataset.y);
    if (isOccupied(newX, newY, id)) { alert('В этой клетке уже есть фишка'); return; }
    tok.x = newX; tok.y = newY;
    redrawTokens(); refreshTokenList();
  });

  // ======= TOKEN MODAL =======
  function openTokenModal(tok=null) {
    if (tok) {
      currentTokenId = tok.id;
      tokenNameInput.value = tok.name;
      tokenColorInput.value = tok.color;
      tokenDescInput.value = tok.description;
      tokenXInput.value = tok.x;
      tokenYInput.value = tok.y;
      deleteTokenBtn.classList.remove('hidden');
    } else {
      currentTokenId = null;
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
  function closeTokenModal(){ tokenModal.classList.add('hidden'); tokenModal.classList.remove('flex'); }

  saveTokenBtn.addEventListener('click', () => {
    const name = tokenNameInput.value.trim();
    if (!name) return alert('Введите имя');
    const color = tokenColorInput.value;
    const x = parseInt(tokenXInput.value), y = parseInt(tokenYInput.value);
    if (x<0||y<0||x>=gridSize||y>=gridSize) return alert('Вне поля');
    if (isOccupied(x, y, currentTokenId)) return alert('В этой клетке уже есть фишка');
    const desc = tokenDescInput.value.trim();
    if (currentTokenId) {
      Object.assign(tokens.find(t=>t.id===currentTokenId),{name,color,description:desc,x,y});
    } else {
      tokens.push({id:Date.now().toString(),name,color,description:desc,x,y});
    }
    redrawTokens();
    refreshTokenList();
    closeTokenModal();
  });
  deleteTokenBtn.addEventListener('click',()=>{
    tokens = tokens.filter(t=>t.id!==currentTokenId);
    redrawTokens(); refreshTokenList(); closeTokenModal();
  });
  cancelTokenBtn.addEventListener('click',closeTokenModal);
  createTokenBtn.addEventListener('click',()=>openTokenModal());

  function refreshTokenList() {
    tokenList.innerHTML='';
    tokens.forEach(tok=>{
      const div=document.createElement('div');
      div.className='flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer';
      div.innerHTML=`<span class='inline-block w-4 h-4 rounded-full mr-2' style='background:${tok.color}'></span>${tok.name}`;
      div.addEventListener('click',()=>openTokenModal(tok));
      tokenList.appendChild(div);
    });
  }

  // ======= DICE =======
  function rollDice(){
    const sides=parseInt(diceSelect.value); const res=Math.floor(Math.random()*sides)+1;
    diceFace.textContent='…'; diceFace.style.transform='rotate(360deg) scale(1.2)';
    setTimeout(()=>{diceFace.style.transform='rotate(0) scale(1)'; diceFace.textContent=res; diceResult.textContent=`Выпало: ${res}`;},500);
  }
  diceFace.addEventListener('click',rollDice);
  diceSelect.addEventListener('change',()=>{diceFace.textContent='?'; diceResult.textContent='';});

  // ======= TOOLBAR EVENTS =======
  brushBtn.addEventListener('click',()=>setActiveTool('brush'));
  eraserBtn.addEventListener('click',()=>setActiveTool('eraser'));
  handBtn.addEventListener('click',()=>setActiveTool('hand'));
  colorPicker.addEventListener('input',e=>selectedColor=e.target.value);
  brushSizeSelect.addEventListener('change',e=>brushSize=parseInt(e.target.value));
  clearGridBtn.addEventListener('click',()=>{document.querySelectorAll('.grid-cell').forEach(c=>c.style.background='');cellColors.clear();});
  gridSizeInput.addEventListener('change',()=>{gridSize=Math.max(1,Math.min(50,parseInt(gridSizeInput.value)||1));buildGrid();});

  // ======= INIT =======
  setActiveTool('brush');
  buildGrid();

  // demo tokens
  tokens=[{id:'1',name:'Игрок 1',color:'#3b82f6',description:'Воин',x:5,y:5},{id:'2',name:'Игрок 2',color:'#ef4444',description:'Маг',x:7,y:5}];
  redrawTokens();
  refreshTokenList();
}); 