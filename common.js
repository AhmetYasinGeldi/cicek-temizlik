const LOGO_URL = "/uploads/logo.png"; // Logo dosyanızın yolu

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.querySelector('.site-logo');
    if (logoEl) {
        const logoImg = document.createElement('img');
        logoImg.src = LOGO_URL;
        logoImg.alt = "Çiçek Temizlik Logosu";
        logoEl.appendChild(logoImg);
    }
    
    // Hamburger menüyü başlat
    initHamburgerMenu();
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
}

function updateSidePanelMenu(user) {
    const menu = document.getElementById('side-panel-menu');
    if (!menu) return;
    
    let menuItems = '';
    
    if (user && user.role === 'admin') {
        // Admin menüsü
        menuItems = `
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Ana Sayfa</a></li>
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Ürünler</a></li>
            <li><a href="/categories.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7v7H4z"></path><path d="M13 4h7v7h-7z"></path><path d="M4 13h7v7H4z"></path><path d="M13 13h7v7h-7z"></path></svg>Kategoriler</a></li>
            <li><a href="/orders.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6h6V2H9zm0 14v6h6v-6H9z"/><path d="M2 9v6h6V9H2zm14 0v6h6V9h-6z"/><rect x="5" y="5" width="14" height="14" rx="2"/></svg>Siparişler</a></li>
            <li><a href="/notifications.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>Bildirimler</a></li>
            <li><a href="/admin-settings.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m5.196-14.196l-4.242 4.242m0 5.908l4.242 4.242m5.958-9.192l-6 0m-6 0l-6 0m14.196 5.196l-4.242-4.242m0-5.908l4.242-4.242"></path></svg>Site Ayarları</a></li>
            <li><a href="/admin-profile.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Profil Ayarları</a></li>
            <li><a href="#" class="logout-link" onclick="event.preventDefault(); localStorage.removeItem('token'); window.location.href='/login.html';"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Çıkış Yap</a></li>
        `;
    } else if (user) {
        // Kullanıcı menüsü
        menuItems = `
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Ana Sayfa</a></li>
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Ürünler</a></li>
            <li><a href="#" id="categories-menu-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7v7H4z"></path><path d="M13 4h7v7h-7z"></path><path d="M4 13h7v7H4z"></path><path d="M13 13h7v7h-7z"></path></svg>Kategoriler</a></li>
            <li><a href="/my-orders.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6h6V2H9zm0 14v6h6v-6H9z"/><path d="M2 9v6h6V9H2zm14 0v6h6V9h-6z"/><rect x="5" y="5" width="14" height="14" rx="2"/></svg>Siparişlerim</a></li>
            <li><a href="/cart.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>Sepetim</a></li>
            <li><a href="/notifications.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>Bildirimler</a></li>
            <li><a href="/my-addresses.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>Adreslerim</a></li>
            <li><a href="/my-cards.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>Kartlarım</a></li>
            <li><a href="/user-settings.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Kullanıcı Ayarları</a></li>
            <li><a href="#" class="logout-link" onclick="event.preventDefault(); localStorage.removeItem('token'); window.location.href='/login.html';"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Çıkış Yap</a></li>
        `;
        
        // Kategoriler menüsü için alt kategoriler yükle
        setTimeout(() => loadCategoriesForMenu(), 100);
    } else {
        // Giriş yapmamış kullanıcı menüsü
        menuItems = `
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Ana Sayfa</a></li>
            <li><a href="/"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>Ürünler</a></li>
            <li><a href="#" id="categories-menu-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7v7H4z"></path><path d="M13 4h7v7h-7z"></path><path d="M4 13h7v7H4z"></path><path d="M13 13h7v7h-7z"></path></svg>Kategoriler</a></li>
            <li><a href="/cart.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>Sepetim</a></li>
            <li><a href="/login.html"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Giriş Yap</a></li>
        `;
        
        setTimeout(() => loadCategoriesForMenu(), 100);
    }
    
    menu.innerHTML = menuItems;
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
    document.getElementById('side-panel').classList.remove('open');
    document.getElementById('side-panel-overlay').classList.remove('open');
    document.body.style.overflow = 'auto';
}

function toggleSidePanel() {
    const panel = document.getElementById('side-panel');
    if (panel.classList.contains('open')) {
        closeSidePanel();
    } else {
        openSidePanel();
    }
}

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