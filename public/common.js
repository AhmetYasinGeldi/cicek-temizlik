const LOGO_URL = "/uploads/logo.png";

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.querySelector('.site-logo');
    if (logoEl) {
        const logoImg = document.createElement('img');
        logoImg.src = LOGO_URL;
        logoImg.alt = "Çiçek Temizlik Logosu";
        logoEl.appendChild(logoImg);
        
        // Logo'ya tıklanınca ana sayfaya gitsin
        logoEl.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/';
        });
    }
    
    // Hamburger menüyü başlat
    initHamburgerMenu();
    
    // Hamburger butonuna event listener ekle
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleSidePanel);
    }
    
    // Footer linkleri düzelt
    fixFooterLinks();
    
    // Mobilde bildirim badge'ini kontrol et
    updateMobileNotificationBadge();
});

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

// Hamburger menü fonksiyonları
function initHamburgerMenu() {
    const token = localStorage.getItem('token');
    let user = null;
    if (token) user = parseJwt(token);
    
    // Side panel HTML'ini oluştur
    if (!document.getElementById('side-panel')) {
        const sidePanelHTML = `
            <div class="side-panel-overlay" id="side-panel-overlay"></div>
            <div class="side-panel" id="side-panel">
                <div class="side-panel-header">
                    <h3>Menü</h3>
                    <button class="side-panel-close" id="side-panel-close">&times;</button>
                </div>
                <ul class="side-panel-menu" id="side-panel-menu">
                    <!-- Dinamik olarak doldurulacak -->
                </ul>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', sidePanelHTML);
        
        // Event listener'ları ekle
        document.getElementById('side-panel-overlay').addEventListener('click', closeSidePanel);
        document.getElementById('side-panel-close').addEventListener('click', closeSidePanel);
    }
    
    // Menü içeriğini güncelle
    updateSidePanelMenu(user);
    
    // Header controls'i kur
    setupUserControls(user);
}

function setupUserControls(user) {
    const container = document.getElementById('user-controls-container');
    if (!container) return;
    
    let controlsHTML = `
        <div class="theme-toggle-group">
            <button id="theme-light-btn" class="theme-toggle-btn" data-theme="light">
                <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            </button>
            <button id="theme-dark-btn" class="theme-toggle-btn" data-theme="dark">
                <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>
        </div>
        <a href="/cart.html" class="btn btn-primary" id="cart-button">
            Sepetim<span id="cart-count" style="margin-left: 4px;"></span>
        </a>
    `;
    
    if (!user) {
        // Giriş yapmamış kullanıcı için
        controlsHTML += `
            <div class="user-login-link">
                <a href="/login.html">Giriş Yap</a>
            </div>
        `;
    }
    
    container.innerHTML = controlsHTML;
    setupThemeToggle();
    updateCartBadge();
}

function setupThemeToggle() {
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');
    if (!lightBtn || !darkBtn) return;

    const docElement = document.documentElement;

    function updateButtons() {
        if (docElement.classList.contains('dark-mode')) {
            darkBtn.classList.add('active');
            lightBtn.classList.remove('active');
        } else {
            lightBtn.classList.add('active');
            darkBtn.classList.remove('active');
        }
    }

    lightBtn.addEventListener('click', () => {
        docElement.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        updateButtons();
    });

    darkBtn.addEventListener('click', () => {
        docElement.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateButtons();
    });

    updateButtons();
}

function updateSidePanelMenu(user) {
    const menu = document.getElementById('side-panel-menu');
    if (!menu) return;
    
    let menuItems = '';
    
    if (user && user.role === 'admin') {
        // Admin menüsü - Daha güzel ikonlar
        menuItems = `
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Ana Sayfa</a></li>
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Ürünler</a></li>
            <li><a href="/categories.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Kategoriler</a></li>
            <li><a href="/orders.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>Siparişler</a></li>
            <li><a href="/notifications.html" id="notifications-menu-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>Bildirimler</a></li>
            <li><a href="/admin-settings.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path><path d="M17 7l-5 5m0 0l-5-5m5 5l5 5m-5-5l-5 5"></path></svg>Site Ayarları</a></li>
            <li><a href="/admin-profile.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Profil Ayarları</a></li>
            <li><a href="#" class="logout-link" onclick="event.preventDefault(); localStorage.removeItem('token'); window.location.href='/login.html';"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Çıkış Yap</a></li>
        `;
    } else if (user) {
        // Kullanıcı menüsü - Daha güzel ikonlar
        menuItems = `
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Ana Sayfa</a></li>
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Ürünler</a></li>
            <li><a href="#" id="categories-menu-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Kategoriler</a></li>
            <li><a href="/my-orders.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>Siparişlerim</a></li>
            <li><a href="/cart.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>Sepetim</a></li>
            <li><a href="/favorites.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>Favorilerim</a></li>
            <li><a href="/notifications.html" id="notifications-menu-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>Bildirimler</a></li>
            <li><a href="/my-addresses.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>Adreslerim</a></li>
            <li><a href="/my-cards.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>Kartlarım</a></li>
            <li><a href="/user-settings.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Kullanıcı Ayarları</a></li>
            <li><a href="#" class="logout-link" onclick="event.preventDefault(); localStorage.removeItem('token'); window.location.href='/login.html';"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Çıkış Yap</a></li>
        `;
        
        setTimeout(() => loadCategoriesForMenu(), 100);
    } else {
        // Giriş yapmamış kullanıcı menüsü - Daha güzel ikonlar
        menuItems = `
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Ana Sayfa</a></li>
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Ürünler</a></li>
            <li><a href="#" id="categories-menu-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Kategoriler</a></li>
            <li><a href="/cart.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>Sepetim</a></li>
            <li><a href="/login.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Giriş Yap</a></li>
            <li><a href="/register.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>Kayıt Ol</a></li>
        `;
        
        setTimeout(() => loadCategoriesForMenu(), 100);
    }
    
    menu.innerHTML = menuItems;
    
    // Bildirim sayısını yükle ve güncelle
    if (user) {
        updateNotificationBadge();
    }
}

async function loadCategoriesForMenu() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) return;
        
        const categories = await response.json();
        const categoriesMenuItem = document.getElementById('categories-menu-item');
        
        if (!categoriesMenuItem || categories.length === 0) return;
        
        // Kategoriler menü öğesini tıklanabilir yap ve alt menü ekle
        const parentLi = categoriesMenuItem.parentElement;
        parentLi.style.position = 'relative';
        
        let subMenu = parentLi.querySelector('.sub-menu');
        if (!subMenu) {
            subMenu = document.createElement('ul');
            subMenu.className = 'sub-menu';
            subMenu.style.cssText = 'list-style: none; padding-left: 40px; margin: 0; display: none;';
            parentLi.appendChild(subMenu);
        }
        
        subMenu.innerHTML = categories.map(cat => 
            `<li><a href="/category.html?id=${cat.id}" style="display: block; padding: 10px 20px; color: var(--color-text); text-decoration: none; font-size: 0.95rem;">${cat.name}</a></li>`
        ).join('');
        
        categoriesMenuItem.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = subMenu.style.display === 'block';
            subMenu.style.display = isOpen ? 'none' : 'block';
            categoriesMenuItem.innerHTML = (isOpen ? 
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7v7H4z"></path><path d="M13 4h7v7h-7z"></path><path d="M4 13h7v7H4z"></path><path d="M13 13h7v7h-7z"></path></svg>Kategoriler' :
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7v7H4z"></path><path d="M13 4h7v7h-7z"></path><path d="M4 13h7v7H4z"></path><path d="M13 13h7v7h-7z"></path></svg>Kategoriler ▼'
            );
        });
    } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error);
    }
}

function openSidePanel() {
    document.getElementById('side-panel').classList.add('open');
    document.getElementById('side-panel-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeSidePanel() {
    const panel = document.getElementById('side-panel');
    const overlay = document.getElementById('side-panel-overlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (hamburger) hamburger.classList.remove('open');
    document.body.style.overflow = 'auto';
}

function toggleSidePanel() {
    const panel = document.getElementById('side-panel');
    const overlay = document.getElementById('side-panel-overlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (panel && panel.classList.contains('open')) {
        closeSidePanel();
    } else {
        openSidePanel();
    }
    
    // Hamburger animasyonu
    if (hamburger) {
        hamburger.classList.toggle('open');
    }
}

// Footer linkleri düzelt
function fixFooterLinks() {
    const footerLinks = document.querySelectorAll('.site-footer .footer-links a');
    footerLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === '#') {
            const text = link.textContent.trim();
            if (text === 'Yardım') link.setAttribute('href', '/help.html');
            else if (text === 'Sıkça Sorulan Sorular') link.setAttribute('href', '/faq.html');
            else if (text === 'Hakkımızda') link.setAttribute('href', '/about.html');
            else if (text === 'İletişim') link.setAttribute('href', '/contact.html');
        }
    });
}

// Bildirim badge güncelleme fonksiyonları
async function updateNotificationBadge() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/notifications?unreadOnly=true', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const unreadCount = data.unreadCount || 0;
        
        // Hamburger menü badge'i (mobil)
        updateMobileNotificationBadge(unreadCount);
        
        // Side panel menü badge'i
        const notifMenuItem = document.querySelector('#notifications-menu-item');
        if (notifMenuItem && unreadCount > 0) {
            let badge = notifMenuItem.querySelector('.menu-item-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'menu-item-badge';
                notifMenuItem.appendChild(badge);
            }
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else if (notifMenuItem) {
            const badge = notifMenuItem.querySelector('.menu-item-badge');
            if (badge) badge.remove();
        }
    } catch (error) {
        console.error('Bildirim sayısı yüklenemedi:', error);
    }
}

function updateMobileNotificationBadge(count) {
    const hamburger = document.querySelector('.hamburger-menu');
    if (!hamburger) return;
    
    // Eğer masaüstündeyse badge'i gösterme
    if (window.innerWidth >= 769) {
        const existingBadge = hamburger.querySelector('.hamburger-notification-badge');
        if (existingBadge) existingBadge.remove();
        return;
    }
    
    let badge = hamburger.querySelector('.hamburger-notification-badge');
    
    if (count && count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'hamburger-notification-badge';
            hamburger.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : count;
    } else if (badge) {
        badge.remove();
    }
}

// Her 30 saniyede bir bildirim sayısını güncelle
setInterval(() => {
    const token = localStorage.getItem('token');
    if (token) {
        updateNotificationBadge();
    }
}, 30000);

// Sepet badge güncelleme
async function updateCartBadge() {
    const token = localStorage.getItem('token');
    const cartCount = document.getElementById('cart-count');
    
    if (!cartCount) return;
    
    let itemCount = 0;
    
    if (token) {
        // Giriş yapmış kullanıcı - Backend'den al
        try {
            const response = await fetch('/api/cart', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (response.ok) {
                const data = await response.json();
                itemCount = data.totalQuantity || 0;
            }
        } catch (error) {
            console.error('Sepet sayısı alınamadı:', error);
        }
    } else {
        // Giriş yapmamış kullanıcı - localStorage'dan al
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
        itemCount = guestCart.reduce((total, item) => total + item.quantity, 0);
    }
    
    if (itemCount > 0) {
        cartCount.textContent = `(${itemCount})`;
    } else {
        cartCount.textContent = '';
    }
}

// Sayfa yüklendiğinde ve her sepet değişikliğinde badge'i güncelle
window.addEventListener('storage', (e) => {
    if (e.key === 'guestCart') {
        updateCartBadge();
    }
});

let toastTimeout;
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Toast container not found!');
        return;
    }
    clearTimeout(toastTimeout);
    toastContainer.textContent = message;
    toastContainer.className = `show ${type}`;
    toastTimeout = setTimeout(() => {
        toastContainer.className = toastContainer.className.replace('show', '');
    }, 3000);
}

function showConfirm(message) {
    return new Promise(resolve => {
        let confirmModalOverlay = document.getElementById('confirm-modal-overlay');
        if (!confirmModalOverlay) {
            const modalHTML = `
                <div class="confirm-modal-overlay" id="confirm-modal-overlay">
                    <div class="confirm-modal">
                        <p id="confirm-message"></p>
                        <div class="confirm-modal-buttons">
                            <button id="confirm-yes">Evet</button>
                            <button id="confirm-no">Hayır</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            confirmModalOverlay = document.getElementById('confirm-modal-overlay');
        }

        const messageEl = document.getElementById('confirm-message');
        const btnYes = document.getElementById('confirm-yes');
        const btnNo = document.getElementById('confirm-no');

        messageEl.textContent = message;

        const close = (value) => {
            confirmModalOverlay.classList.remove('visible');
            btnYes.onclick = null; 
            btnNo.onclick = null;
            resolve(value);
        };

        btnYes.onclick = () => close(true);
        btnNo.onclick = () => close(false);

        confirmModalOverlay.classList.add('visible');
    });
}

// Loading animation helper
function showLoadingAnimation(message = 'Yükleniyor...') {
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        const overlayHTML = `
            <div class="loading-overlay" id="loading-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div id="loading-animation" class="lottie-animation"></div>
                <p id="loading-message" style="color: white; font-size: 1.2rem; margin-top: 20px;"></p>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        loadingOverlay = document.getElementById('loading-overlay');
        
        // Check if lottie is available
        if (typeof lottie !== 'undefined') {
            lottie.loadAnimation({
                container: document.getElementById('loading-animation'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: '/animations/loading.json'
            });
        }
    }
    
    document.getElementById('loading-message').textContent = message;
    loadingOverlay.style.display = 'flex';
}

function hideLoadingAnimation() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// ==================== FAVORİ FONKSİYONLARI ====================
let userFavorites = [];

// Kullanıcının favorilerini yükle
async function loadUserFavorites() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/favorites', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Product ID'leri array'e al
            userFavorites = data.map(item => item.id);
        }
    } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
    }
}

// Favori buton HTML'i oluştur
function createFavoriteButton(productId, page = 'default') {
    const token = localStorage.getItem('token');
    if (!token) return ''; // Giriş yapmamışsa gösterme

    const isFavorite = userFavorites.includes(productId);
    
    return `
        <button 
            class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" 
            data-product-id="${productId}"
            data-page="${page}"
            aria-label="${isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}"
            title="${isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}">
            <div class="favorite-animation" id="favorite-animation-${page}-${productId}"></div>
        </button>
    `;
}

// Favori butonunu başlat
function initializeFavoriteButton(productId, page = 'default') {
    const btn = document.querySelector(`[data-product-id="${productId}"][data-page="${page}"]`);
    if (!btn) return;

    const animContainer = document.getElementById(`favorite-animation-${page}-${productId}`);
    if (!animContainer) return;

    const isFavorite = btn.classList.contains('is-favorite');

    // Lottie animasyonunu yükle
    const animation = lottie.loadAnimation({
        container: animContainer,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/animations/favorites.json'
    });

    let isInitialized = false;
    
    const setInitialFrame = () => {
        if (isInitialized) return;
        isInitialized = true;
        
        try {
            const totalFrames = animation.totalFrames;
            const targetFrame = isFavorite ? totalFrames - 1 : 0;
            
            animation.goToAndStop(targetFrame, true);
        } catch (e) {
            console.error('Frame set hatası:', e);
            // Fallback: SVG yıldız ekle
            if (isFavorite) {
                animContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#FF6B6B" stroke="#FF6B6B" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
            } else {
                animContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
            }
        }
    };

    animation.addEventListener('DOMLoaded', setInitialFrame);
    animation.addEventListener('data_ready', setInitialFrame);
    animation.addEventListener('config_ready', setInitialFrame);
    
    // Fallback - animasyon 1 saniye içinde yüklenmediyse SVG göster
    setTimeout(() => {
        if (!isInitialized) {
            setInitialFrame();
        }
    }, 1000);

    // Click event
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Favorilere eklemek için giriş yapmalısınız', 'error');
            setTimeout(() => window.location.href = '/login.html', 1500);
            return;
        }

        const currentlyFavorite = btn.classList.contains('is-favorite');
        
        try {
            if (currentlyFavorite) {
                // Favorilerden çıkar
                const response = await fetch(`/api/favorites/${productId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Favorilerden çıkarılamadı');
                
                btn.classList.remove('is-favorite');
                btn.setAttribute('aria-label', 'Favorilere ekle');
                btn.setAttribute('title', 'Favorilere ekle');
                userFavorites = userFavorites.filter(id => id !== productId);
                
                // Animasyonu tersine oynat
                animation.setDirection(-1);
                animation.play();
                
                showToast('Favorilerden çıkarıldı');
            } else {
                // Favorilere ekle
                const response = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ productId })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Favori ekleme hatası:', errorData);
                    throw new Error(errorData.error || errorData.message || 'Favorilere eklenemedi');
                }
                
                btn.classList.add('is-favorite');
                btn.setAttribute('aria-label', 'Favorilerden çıkar');
                btn.setAttribute('title', 'Favorilerden çıkar');
                
                // userFavorites array'ine ekle
                if (!userFavorites.includes(productId)) {
                    userFavorites.push(productId);
                }
                
                // Animasyonu düz oynat
                animation.setDirection(1);
                animation.play();
                
                showToast('Favorilere eklendi! ❤️');
            }
        } catch (error) {
            console.error('Favori işlemi hatası:', error);
            showToast(error.message, 'error');
        }
    });
}