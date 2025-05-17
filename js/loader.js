// loader.js — загрузка HTML-секций
export async function loadSection(url, containerId) {
  const resp = await fetch(url);
  const html = await resp.text();
  document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
} 