// Bildirim dropdown fonksiyonları

async function loadNotificationCount() {
    const token = localStorage.getItem('token');

    console.log('🔔 Dropdown yükleniyor...');
    console.log('🔑 Kullanılan Token:', token ? token.substring(0, 10) + '...' : 'YOK');

    if (!token) {
        console.error('❌ Token bulunamadı!');
        return;
    }
    
    if (!token) return;
    
    try {
        const response = await fetch('/api/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('notification-badge');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count > 99 ? '99+' : data.count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Bildirim sayısı yüklenemedi:', error);
    }
}

function setupNotificationDropdown() {
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');
    
    if (!notificationBell || !notificationDropdown) return;

    notificationBell.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isOpen = notificationDropdown.classList.contains('show');
        
        if (!isOpen) {
            notificationDropdown.classList.add('show');
            await loadNotificationDropdown();
        } else {
            notificationDropdown.classList.remove('show');
        }
    });

    window.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });
}

async function loadNotificationDropdown() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const dropdownBody = document.getElementById('notification-dropdown-body');
    if (!dropdownBody) return;

    try {
        const response = await fetch('/api/notifications?limit=5', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Bildirimler yüklenemedi');

        const data = await response.json();
        const notifications = data.notifications;

        if (notifications.length === 0) {
            dropdownBody.innerHTML = `
                <div class="notification-dropdown-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <h4>Şimdilik bildiriminiz yok</h4>
                    <p>Yeni bildirimler burada görünecek</p>
                </div>
            `;
            return;
        }

        dropdownBody.innerHTML = notifications.map(notification => {
            const unreadClass = notification.is_read ? '' : 'unread';
            const time = formatNotificationTime(notification.created_at);
            const link = notification.link || '/notifications.html';

            return `
                <div class="notification-dropdown-item ${unreadClass}" onclick="handleNotificationClick(${notification.id}, '${link}')">
                    <h5 class="notification-dropdown-title">${notification.title}</h5>
                    <p class="notification-dropdown-message">${notification.message}</p>
                    <span class="notification-dropdown-time">${time}</span>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Bildirimler yüklenirken hata:', error);
        dropdownBody.innerHTML = `
            <div class="notification-dropdown-empty">
                <p style="color: var(--color-danger);">Bildirimler yüklenemedi</p>
            </div>
        `;
    }
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
}

async function handleNotificationClick(notificationId, link) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        await loadNotificationCount();
    } catch (error) {
        console.error('Bildirim okundu işaretlenemedi:', error);
    }

    window.location.href = link;
}
