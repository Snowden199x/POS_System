// ─────────────────────────────────────────────────────────────────────────
// Twist & Roll POS — PWA Registration
// Place at: assets/js/pwa_register.js
// ─────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/service-worker.js')
                .then(reg => {
                    console.log('[PWA] Service Worker registered:', reg.scope);

                    // Check for updates every 60 seconds
                    setInterval(() => reg.update(), 60000);

                    // Notify user when a new version is available
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (
                                newWorker.state === 'installed' &&
                                navigator.serviceWorker.controller
                            ) {
                                showUpdateToast();
                            }
                        });
                    });
                })
                .catch(err => {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });
        });
    }

    // ── Install prompt (Android Chrome shows "Add to Home Screen") ────────
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideInstallBanner();
        console.log('[PWA] App installed successfully');
    });

    // ── Install banner ────────────────────────────────────────────────────
    function showInstallBanner() {
        if (document.getElementById('pwa-install-banner')) return;
        // Don't show if already in standalone mode (already installed)
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1C3924;
            color: #fff;
            padding: 12px 20px;
            border-radius: 999px;
            font-family: 'Poppins', sans-serif;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 99999;
            white-space: nowrap;
            animation: pwaSlideUp 0.3s ease;
        `;

        banner.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D8C36F" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Install Twist & Roll POS</span>
            <button id="pwa-install-btn" style="
                background: #D8C36F;
                color: #1C3924;
                border: none;
                border-radius: 999px;
                padding: 6px 14px;
                font-family: 'Poppins', sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            ">Install</button>
            <button id="pwa-dismiss-btn" style="
                background: none;
                border: none;
                color: rgba(255,255,255,0.6);
                font-size: 18px;
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            ">×</button>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pwaSlideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(banner);

        document.getElementById('pwa-install-btn').addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] Install outcome:', outcome);
            deferredPrompt = null;
            hideInstallBanner();
        });

        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            hideInstallBanner();
            // Don't show again for this session
            sessionStorage.setItem('pwa-banner-dismissed', '1');
        });
    }

    function hideInstallBanner() {
        document.getElementById('pwa-install-banner')?.remove();
    }

    // Don't show if dismissed this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    // ── Update toast ──────────────────────────────────────────────────────
    function showUpdateToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1C3924;
            color: #fff;
            padding: 14px 18px;
            border-radius: 14px;
            font-family: 'Poppins', sans-serif;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 99999;
        `;
        toast.innerHTML = `
            <span>New version available!</span>
            <button onclick="window.location.reload()" style="
                background: #D8C36F;
                color: #1C3924;
                border: none;
                border-radius: 999px;
                padding: 6px 14px;
                font-family: 'Poppins', sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            ">Refresh</button>
        `;
        document.body.appendChild(toast);
    }

})();