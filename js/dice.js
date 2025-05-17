// dice.js — логика кубика
export function renderD6Pips(diceFace, value) {
  diceFace.querySelectorAll('.dice-pip').forEach(e=>e.remove());
  const pos = [
    [20,20],[50,20],[80,20],
    [20,50],[50,50],[80,50],
    [20,80],[50,80],[80,80]
  ];
  const pipMap = {
    1: [4], 2: [0,8], 3: [0,4,8], 4: [0,2,6,8], 5: [0,2,4,6,8], 6: [0,2,3,5,6,8]
  };
  (pipMap[value]||[]).forEach(idx=>{
    const pip = document.createElement('div');
    pip.className = 'dice-pip';
    pip.style.left = `calc(${pos[idx][0]}% - 9px)`;
    pip.style.top  = `calc(${pos[idx][1]}% - 9px)`;
    diceFace.appendChild(pip);
  });
}

export function renderDiceFace(diceFace, diceSelect, value = '?') {
  const type = diceSelect.value;
  const typeClass = {
    '4': 'dice-face--d4', '6': 'dice-face--d6', '8': 'dice-face--d8',
    '10': 'dice-face--d10', '12': 'dice-face--d12', '20': 'dice-face--d20', '100': 'dice-face--d100',
  }[type] || '';
  diceFace.className = 'dice-face';
  if (typeClass) diceFace.classList.add(typeClass);
  if(type==='6' && value!=='?') {
    diceFace.innerHTML = '<span></span>';
    renderD6Pips(diceFace, Number(value));
  } else {
    diceFace.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font:900 44px/1.1 'Segoe UI',system-ui,sans-serif;">${value}</span>`;
    diceFace.querySelectorAll('.dice-pip').forEach(e=>e.remove());
  }
}

export function rollDice(diceFace, diceSelect, diceResult, renderDiceFace) {
  const sides=parseInt(diceSelect.value); const res=Math.floor(Math.random()*sides)+1;
  diceFace.textContent='…'; diceFace.style.transform='rotate(360deg) scale(1.2)';
  setTimeout(()=>{
    diceFace.style.transform='rotate(0) scale(1)';
    renderDiceFace(diceFace, diceSelect, res);
    diceResult.textContent=`Выпало: ${res}`;
  },500);
} 