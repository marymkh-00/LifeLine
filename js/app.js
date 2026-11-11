// js/app.js
console.log("✅ LifeLine App Started!");

import { navigate } from './router.js';

// 🛡️ محافظ: منتظر DOMContentLoaded بمان
function whenReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
        fn();
    }
}

// 🛡️ محافظ: بررسی کتابخانه‌ها
function assertDeps() {
    if (typeof window.Dexie === 'undefined') {
        throw new Error('Dexie is not loaded. Check script order in index.html.');
    }
    if (typeof window.jalaali === 'undefined') {
        throw new Error('jalaali is not loaded. Check script order in index.html.');
    }
}

// ثبت Service Worker و مدیریت آپدیت
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // نسخه جدید اومده
                            console.log('New content is available; please refresh.');
                            // اینجا میتونی یه توست نمایش بدی و بگی رفرش کنه
                            // showToast('نسخه جدید اومده! لطفاً صفحه را رفرش کنید.', 'info', 5000);
                        }
                    }
                };
            };
        }).catch(err => {
            console.error('SW registration failed:', err);
        });
    });
}

// شروع
whenReady(() => {
    try {
        assertDeps();
        navigate('home');
    } catch (err) {
        console.error('Startup error:', err);
        document.getElementById('app-main').innerHTML = `
            <div class="card" style="text-align:center; padding:32px;">
                <div style="font-size:40px; margin-bottom:16px;">⚠️</div>
                <div style="font-weight:600; margin-bottom:8px;">خطا در بارگذاری برنامه</div>
                <div style="font-size:12px; color:var(--text-muted);">${err.message}</div>
                <button onclick="location.reload()" class="btn btn--primary" style="margin-top:16px;">تلاش مجدد</button>
            </div>
        `;
    }
});
window.addEventListener('error', e => {
    console.error('GLOBAL ERROR:', e.message, e.filename, e.lineno);
    document.getElementById('app-main').innerHTML =
        `<div class="card" style="color:#ff6b6b">خطا: ${e.message}<br>در: ${e.filename}:${e.lineno}</div>`;
});