const LOGO_URL = "/uploads/logo.png"; // Logo dosyanızın yolu

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.querySelector('.site-logo');
    if (logoEl) {
        const logoImg = document.createElement('img');
        logoImg.src = LOGO_URL;
        logoImg.alt = "Çiçek Temizlik Logosu";
        logoEl.appendChild(logoImg);
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