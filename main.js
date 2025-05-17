// Функция для загрузки HTML-секции по URL и вставки в указанный контейнер
async function loadSection(url, containerId) {
  const resp = await fetch(url); // Загружаем содержимое файла по URL
  const html = await resp.text(); // Получаем текстовое содержимое
  document.getElementById(containerId).insertAdjacentHTML('beforeend', html); // Вставляем HTML в контейнер
}

// После загрузки DOM загружаем все секции интерфейса
window.addEventListener('DOMContentLoaded', async () => {
  await loadSection('tools.html', 'tools-section'); // Инструменты
  await loadSection('dice.html', 'dice-section'); // Кубик
  await loadSection('tokens.html', 'main-content'); // Список фишек
  await loadSection('field.html', 'main-content'); // Игровое поле
  await loadSection('token-modal.html', 'modals'); // Модальное окно для фишек

  // ======= ГЛОБАЛЬНОЕ СОСТОЯНИЕ =======
  let tokens = []; // Массив всех фишек на поле
  let currentTokenId = null; // ID текущей редактируемой фишки
  let selectedTool = 'brush'; // Выбранный инструмент (кисть, ластик, рука)
  let selectedColor = document.getElementById('color-picker').value; // Текущий цвет кисти
  let brushSize = 1; // Размер кисти
  let gridSize = parseInt(document.getElementById('grid-size').value); // Размер сетки (количество клеток)
  let painting = false; // Флаг: идёт ли сейчас рисование
  const cellColors = new Map(); // Карта цветов клеток (ключ — координаты, значение — цвет)
  const MAX_GRID_SIZE = 50; // Максимальный размер сетки
  let gridInitialized = false; // Флаг: инициализирована ли сетка

  // ======= ССЫЛКИ НА DOM-ЭЛЕМЕНТЫ =======
  const gameGrid = document.getElementById('game-grid'); // Контейнер сетки
  const gridSizeInput = document.getElementById('grid-size'); // Поле ввода размера сетки
  const clearGridBtn = document.getElementById('clear-grid-btn'); // Кнопка очистки поля
  const brushBtn = document.getElementById('brush-btn'); // Кнопка "Кисть"
  const eraserBtn = document.getElementById('eraser-btn'); // Кнопка "Ластик"
  const handBtn = document.getElementById('hand-btn'); // Кнопка "Рука"
  const colorPicker = document.getElementById('color-picker'); // Палитра цветов
  const brushSizeSelect = document.getElementById('brush-size'); // Выбор размера кисти
  const diceSelect = document.getElementById('dice-select'); // Выбор типа кубика
  const diceFace = document.getElementById('dice-face'); // Визуализация кубика
  const diceResult = document.getElementById('dice-result'); // Результат броска
  const tokenModal = document.getElementById('token-modal'); // Модальное окно фишки
  const createTokenBtn = document.getElementById('create-token-btn'); // Кнопка создания фишки
  const tokenNameInput = document.getElementById('token-name'); // Поле имени фишки
  const tokenColorInput = document.getElementById('token-color'); // Цвет фишки
  const tokenDescInput = document.getElementById('token-description'); // Описание фишки
  const tokenXInput = document.getElementById('token-x'); // X-координата фишки
  const tokenYInput = document.getElementById('token-y'); // Y-координата фишки
  const deleteTokenBtn = document.getElementById('delete-token-btn'); // Кнопка удаления фишки
  const cancelTokenBtn = document.getElementById('cancel-token-btn'); // Кнопка отмены
  const saveTokenBtn = document.getElementById('save-token-btn'); // Кнопка сохранения
  const tokenList = document.getElementById('token-list'); // Список фишек

  // ======= ЛОГИКА СЕТКИ =======
  // Генерируем ключ для координат клетки
  function key(x, y) { return `${x}_${y}`; }

  // Проверяем, занята ли клетка фишкой (кроме указанной)
  function isOccupied(x, y, exclude = null) {
    return tokens.some(t => t.x === x && t.y === y && t.id !== exclude);
  }

  // Устанавливаем активный инструмент и меняем стили кнопок
  function setActiveTool(tool) {
    selectedTool = tool;
    brushBtn.classList.toggle('bg-blue-200', tool === 'brush');
    eraserBtn.classList.toggle('bg-red-200', tool === 'eraser');
    handBtn.classList.toggle('bg-yellow-200', tool === 'hand');
    gameGrid.style.cursor = (tool === 'brush' || tool === 'eraser') ? 'crosshair' : 'default';
  }

  // Строим сетку (создаём клетки, скрываем лишние)
  function buildGrid() {
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
    // Показываем или скрываем клетки в зависимости от размера поля
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
    // Обновляем стили сетки
    gameGrid.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;
    gameGrid.style.gridAutoRows = 'var(--cell-size)';
    gameGrid.style.display = 'inline-grid';
    redrawTokens(); // Перерисовываем фишки
  }

  // Закрашиваем клетку и сохраняем цвет
  function paintCell(cx, cy, color) {
    const cell = document.querySelector(`.grid-cell[data-x="${cx}"][data-y="${cy}"]`);
    if (!cell) return;
    cell.style.background = color;
    if (color) cellColors.set(key(cx, cy), color); else cellColors.delete(key(cx, cy));
  }

  // Применяем инструмент (кисть/ластик) к области вокруг клетки
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

  // Обработчик нажатия мыши по сетке (начало рисования)
  gameGrid.addEventListener('mousedown', e => {
    if (selectedTool === 'hand') return;
    const cell = e.target.closest('.grid-cell'); if (!cell) return;
    painting = true;
    applyTool(parseInt(cell.dataset.x), parseInt(cell.dataset.y));
  });
  // Обработчик движения мыши по сетке (рисование при зажатой кнопке)
  gameGrid.addEventListener('mousemove', e => {
    if (!painting) return; const cell = e.target.closest('.grid-cell'); if (!cell) return;
    applyTool(parseInt(cell.dataset.x), parseInt(cell.dataset.y));
  });
  // Обработчик отпускания кнопки мыши (завершение рисования)
  document.addEventListener('mouseup', () => painting = false);

  // ======= ФИШКИ =======
  // Перерисовываем все фишки на поле
  function redrawTokens() {
    document.querySelectorAll('.token').forEach(e => e.remove());
    tokens.forEach(placeToken);
  }

  // === Глобальный tooltip для фишек ===
  let globalTokenTooltip = document.getElementById('global-token-tooltip');
  if (!globalTokenTooltip) {
    globalTokenTooltip = document.createElement('div');
    globalTokenTooltip.id = 'global-token-tooltip';
    globalTokenTooltip.style.position = 'fixed';
    globalTokenTooltip.style.zIndex = '1000';
    globalTokenTooltip.style.background = 'rgba(0,0,0,0.8)';
    globalTokenTooltip.style.color = '#fff';
    globalTokenTooltip.style.padding = '4px 8px';
    globalTokenTooltip.style.borderRadius = '4px';
    globalTokenTooltip.style.fontSize = '12px';
    globalTokenTooltip.style.whiteSpace = 'nowrap';
    globalTokenTooltip.style.opacity = '0';
    globalTokenTooltip.style.pointerEvents = 'none';
    globalTokenTooltip.style.transition = 'opacity 0.2s';
    document.body.appendChild(globalTokenTooltip);
  }

  // Показываем tooltip с именем фишки
  function showGlobalTokenTooltip(text, x, y) {
    globalTokenTooltip.textContent = text;
    globalTokenTooltip.style.left = x + 'px';
    globalTokenTooltip.style.top = y + 'px';
    globalTokenTooltip.style.opacity = '1';
  }
  // Скрываем tooltip
  function hideGlobalTokenTooltip() {
    globalTokenTooltip.style.opacity = '0';
  }

  // Размещаем фишку на поле
  function placeToken(t) {
    // Не рендерим фишку, если она вне видимой области
    if (t.x >= gridSize || t.y >= gridSize) return;
    document.querySelector(`.token[data-id="${t.id}"]`)?.remove(); // Удаляем старую фишку с тем же id
    const cell = document.querySelector(`.grid-cell[data-x="${t.x}"][data-y="${t.y}"]`);
    if (!cell) return;
    const el = document.createElement('div');
    el.className = 'token';
    el.dataset.id = t.id;
    el.style.background = t.color;
    el.textContent = t.name[0].toUpperCase(); // Первая буква имени
    el.draggable = true;
    // Обработка начала перетаскивания
    el.addEventListener('dragstart', ev => {
      if (selectedTool !== 'hand') { ev.preventDefault(); return; }
      ev.dataTransfer.setData('text/plain', t.id);
    });
    // Глобальный tooltip для руки
    el.addEventListener('mouseenter', function(e) {
      if(selectedTool==='hand') {
        const rect = el.getBoundingClientRect();
        const tooltipText = t.name.slice(0, 20);
        const tooltipHeight = 28; // примерно
        // По умолчанию — сверху
        let top = rect.top - tooltipHeight - 6;
        // Если не помещается сверху — снизу
        if (top < 0) {
          top = rect.bottom + 6;
        }
        showGlobalTokenTooltip(tooltipText, rect.left + rect.width/2, top);
        globalTokenTooltip.style.transform = 'translate(-50%, 0)';
      }
    });
    el.addEventListener('mouseleave', function() {
      hideGlobalTokenTooltip();
    });
    cell.appendChild(el);
  }
  // Разрешаем drag&drop только в режиме "рука"
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

  // Подсветка фишки на поле при наведении на строку в списке
  function highlightTokenOnField(tokenId, highlight) {
    const tokenEl = document.querySelector(`.token[data-id="${tokenId}"]`);
    if (tokenEl) {
      if (highlight) {
        tokenEl.classList.add('highlight');
      } else {
        tokenEl.classList.remove('highlight');
      }
    }
  }

  function refreshTokenList() {
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

  // ======= DICE =======
  function renderDiceFace(value = '?') {
    const type = diceSelect.value;
    const typeClass = {
      '4': 'dice-face--d4',
      '6': 'dice-face--d6',
      '8': 'dice-face--d8',
      '10': 'dice-face--d10',
      '12': 'dice-face--d12',
      '20': 'dice-face--d20',
      '100': 'dice-face--d100',
    }[type] || '';
    // Удаляем все dice-face--* классы
    diceFace.className = 'dice-face bg-blue-100 text-blue-800';
    if (typeClass) diceFace.classList.add(typeClass);
    diceFace.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font:700 36px/1 system-ui;color:#1d4ed8;">${value}</span>`;
  }

  function rollDice(){
    const sides=parseInt(diceSelect.value); const res=Math.floor(Math.random()*sides)+1;
    diceFace.textContent='…'; diceFace.style.transform='rotate(360deg) scale(1.2)';
    setTimeout(()=>{diceFace.style.transform='rotate(0) scale(1)'; renderDiceFace(res); diceResult.textContent=`Выпало: ${res}`;},500);
  }
  diceFace.addEventListener('click',()=>rollDice());
  diceSelect.addEventListener('change',()=>{renderDiceFace('?'); diceResult.textContent='';});

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
  renderDiceFace('?');

  // demo tokens
  tokens=[{id:'1',name:'Игрок 1',color:'#3b82f6',description:'Воин',x:5,y:5},{id:'2',name:'Игрок 2',color:'#ef4444',description:'Маг',x:7,y:5}];
  redrawTokens();
  refreshTokenList();
}); 