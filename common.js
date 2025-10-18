const SITE_NAME = "ÇİÇEK TEMİZLİK";

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.querySelector('.site-logo');
    if (logoEl) {
        logoEl.textContent = SITE_NAME;
    }
});

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
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