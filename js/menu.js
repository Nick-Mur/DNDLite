document.addEventListener('DOMContentLoaded', () => {
    const menuScreen = document.getElementById('menu-screen');
    const mainApp = document.getElementById('main-app');
    const createBtn = document.getElementById('create-room-btn');
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutBtn = document.getElementById('close-about-btn');
    const closeAboutBtn2 = document.getElementById('close-about-btn2');
    // Показываем только меню при старте
    if (menuScreen && mainApp) {
        menuScreen.style.display = '';
        mainApp.style.display = 'none';
        document.body.classList.add('menu-bg');
    }
    // Переход в комнату
    if (createBtn && menuScreen && mainApp) {
        createBtn.addEventListener('click', () => {
            menuScreen.style.display = 'none';
            mainApp.style.display = '';
            document.body.classList.remove('menu-bg');
        });
    }
    // О платформе — открыть модалку
    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
        });
    }
    // О платформе — закрыть модалку (крестик и кнопка)
    if (closeAboutBtn && aboutModal) {
        closeAboutBtn.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });
    }
    if (closeAboutBtn2 && aboutModal) {
        closeAboutBtn2.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });
    }
    // Клик вне модалки — закрыть
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.add('hidden');
            }
        });
    }
    // Здесь можно добавить другие обработчики для меню
}); 