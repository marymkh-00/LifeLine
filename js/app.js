// js/app.js
console.log("✅ LifeLine App Started!");

import { navigate } from './router.js';
import db from './db.js';

// 🛡️ محافظ: منتظر DOMContentLoaded بمان
async function whenReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
        await fn();
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

// شروع
whenReady(async () => {
    try {
        assertDeps();

        // =============================================
        // 🚑 سیستم بازیابی خودکار از بکاپ روزانه
        // =============================================
        const today = new Date().toISOString().split('T')[0];
        const lastBackupDate = localStorage.getItem('lastBackupDate');
        const savedBackup = localStorage.getItem('dailyBackup');

        // ۱. گرفتن تعداد تسک‌های فعلی دیتابیس
        const taskCount = await db.tasks.count();

        // ۲. اگه دیتابیس خالی بود و بکاپ قبلی وجود داشت، بازیابی کن
        if (taskCount === 0 && savedBackup && lastBackupDate) {
            try {
                const backup = JSON.parse(savedBackup);
                console.log('🔄 دیتابیس خالی بود. در حال بازیابی از بکاپ...');
                
                const tables = ['tasks', 'taskTransfers', 'events', 'goals', 'expenseCategories', 'expenses', 'categoryBudgets', 'balanceAdjustments', 'shoppingLists', 'shoppingItems', 'dailyMoods', 'debts'];
                
                await db.transaction('rw', tables.map(t => db[t]), async () => {
                    for (let t of tables) {
                        if (Array.isArray(backup[t]) && backup[t].length > 0) {
                            await db[t].bulkAdd(backup[t]);
                        }
                    }
                });
                
                console.log('✅ بازیابی با موفقیت انجام شد!');
                document.getElementById('app-main').innerHTML = `
                    <div class="card" style="text-align:center; padding:32px; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3);">
                        <div style="font-size:40px; margin-bottom:16px;">✅</div>
                        <div style="font-weight:600; margin-bottom:8px; color:#4ade80;">اطلاعات شما بازیابی شد!</div>
                        <div style="font-size:12px; color:var(--text-muted);">دیتابیس به حالت قبل برگشت.</div>
                    </div>
                `;
                setTimeout(() => navigate('home'), 2000);
                return;
            } catch (err) {
                console.error('خطا در بازیابی خودکار:', err);
            }
        }

        // ۳. اگه همه‌چیز اوکی بود، بکاپ جدید بگیر
        if (lastBackupDate !== today) {
            try {
                const tables = ['tasks', 'taskTransfers', 'events', 'goals', 'expenseCategories', 'expenses', 'categoryBudgets', 'balanceAdjustments', 'shoppingLists', 'shoppingItems', 'dailyMoods', 'debts'];
                const backup = { app: 'LifeLine', version: 4, date: today };
                
                for (let t of tables) {
                    backup[t] = await db[t].toArray();
                }
                
                localStorage.setItem('dailyBackup', JSON.stringify(backup));
                localStorage.setItem('lastBackupDate', today);
                console.log('✅ بکاپ خودکار ذخیره شد.');
            } catch (e) {
                console.warn('⚠️ بکاپ خودکار نتونست ذخیره بشه:', e);
            }
        }

        // 🎨 بارگذاری تم
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        }

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