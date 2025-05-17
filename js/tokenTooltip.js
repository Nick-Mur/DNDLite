// tokenTooltip.js — глобальный tooltip для фишек
let globalTokenTooltip;

export function createGlobalTokenTooltip() {
  globalTokenTooltip = document.getElementById('global-token-tooltip');
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
}

export function showGlobalTokenTooltip(text, x, y) {
  if (!globalTokenTooltip) return;
  globalTokenTooltip.textContent = text;
  globalTokenTooltip.style.left = x + 'px';
  globalTokenTooltip.style.top = y + 'px';
  globalTokenTooltip.style.opacity = '1';
}

export function hideGlobalTokenTooltip() {
  if (!globalTokenTooltip) return;
  globalTokenTooltip.style.opacity = '0';
} 