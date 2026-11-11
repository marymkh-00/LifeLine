// js/pages/finance/expenses.js
import db from '../../db.js'; // sw.js
const CACHE = 'lifeline-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/reset.css',
    './css/theme.css',
    './css/layout.css',
    './css/components.css',
    './lib/dexie.min.js',
    './lib/jalaali.min.js',
    './js/app.js',
    './js/db.js',
    './js/jalali.js',
    './js/router.js',
    './js/utils.js',
    './js/pages/home.js',
    './js/pages/tasks.js',
    './js/pages/calendar.js',
    './js/pages/finance.js',
    './js/pages/more.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Better Fetch Handling (conceptual)
self.addEventListener('fetch', (e) => {
    // For navigation requests, serve the cached index.html as fallback
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    } else {
        // For other assets, try cache then network
        e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
    }
});
import { todayISO, formatToman } from '../../jalali.js';
import { showToast, escapeHTML } from '../../utils.js';

export async function getBalance() {
    const adj = await db.balanceAdjustments.toArray();
    const exp = await db.expenses.toArray();
    const inc = adj.filter(a => a.type === 'increase').reduce((s, a) => s + a.amount, 0);
    const dec = adj.filter(a => a.type === 'decrease').reduce((s, a) => s + a.amount, 0);
    return inc - dec - exp.reduce((s, e) => s + e.amount, 0);
}

export async function renderExpenses(container) {
    const today = todayISO();

    container.innerHTML = `
        <div class="card" style="text-align:center; padding: 24px 16px; background: linear-gradient(135deg, rgba(30,30,34,0.8), rgba(20,20,22,0.9)); border: 1px solid rgba(212, 184, 149, 0.2);">
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 8px;">موجودی اصلی</div>
            <div id="balance-amount" style="font-size: 28px; font-weight: 800; color: var(--accent); margin-bottom: 16px;">...</div>
            <button id="btn-adjust-balance" class="btn" style="font-size: 12px; padding: 6px 12px; border: 1px solid var(--divider);">⚙️ تغییر موجودی</button>
        </div>

        <div class="card">
            <div class="card__title">ثبت هزینه جدید</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
                <input type="text" id="expense-title" class="input" placeholder="عنوان هزینه...">
                <input type="number" id="expense-amount" class="input" placeholder="مبلغ (تومان)">
                <select id="expense-category" class="input" style="padding: 8px;"></select>
                <button id="btn-add-expense" class="btn btn--primary">ثبت هزینه</button>
            </div>
        </div>

        <div class="card">
            <div class="card__title">هزینه‌های امروز</div>
            <div id="expenses-list"></div>
        </div>
    `;

    async function loadData() {
        const balance = await getBalance();
        document.getElementById('balance-amount').innerText = formatToman(balance);

        const categories = await db.expenseCategories.toArray();
        const categorySelect = document.getElementById('expense-category');
        if (categorySelect.options.length === 0) {
            categorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHTML(c.title)}</option>`).join('');
        }

        const todayExpenses = await db.expenses.where({ expenseDate: today }).reverse().toArray();
        const listEl = document.getElementById('expenses-list');

        if (todayExpenses.length === 0) {
            listEl.innerHTML = `<div class="empty">هزینه‌ای برای امروز ثبت نشده است.</div>`;
        } else {
            listEl.innerHTML = todayExpenses.map(ex => {
                const cat = categories.find(c => c.id === ex.categoryId);
                return `
                <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--divider);">
                   <div>
                       <div style="font-weight: 500;">${escapeHTML(ex.title)}</div> 
                       <div style="font-size: 12px; color: var(--text-muted); margin-top:4px;">${escapeHTML(cat ? cat.title : 'نامشخص')}</div>
                   </div>
                   <div style="color: #ff6b6b; font-weight: 600;">${formatToman(ex.amount)}</div>
                </div>`;
            }).join('');
        }
    }

    document.getElementById('btn-add-expense').onclick = async() => {
        const title = document.getElementById('expense-title').value.trim();
        const amount = parseInt(document.getElementById('expense-amount').value);
        const categoryId = parseInt(document.getElementById('expense-category').value);

        if (!title || isNaN(amount) || amount <= 0) return showToast('اطلاعات را کامل وارد کنید.', 'error');

        const currentBalance = await getBalance();
        if (amount > currentBalance) return showToast('موجودی کافی نیست!', 'error');

        await db.expenses.add({ title, amount, categoryId, expenseDate: today });
        document.getElementById('expense-title').value = '';
        document.getElementById('expense-amount').value = '';
        showToast('هزینه ثبت شد.', 'success');
        loadData();
    };

    // تغییر موجودی (مودال شیک)
    document.getElementById('btn-adjust-balance').onclick = () => {
        const modalDiv = document.createElement('div');
        modalDiv.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; backdrop-filter: blur(4px);';
        modalDiv.innerHTML = `
            <div class="card" style="width:100%; max-width:400px; padding:24px; animation: slideUp 0.3s ease;">
                <h3 style="margin-bottom:20px; text-align:center;">تغییر موجودی</h3>
                <div style="display:flex; gap:8px; margin-bottom:20px;">
                    <button id="type-increase" class="btn" style="flex:1; padding:12px; background:rgba(74, 222, 128, 0.15); color:#4ade80; border:1px solid rgba(74, 222, 128, 0.3); font-weight:700;">+ افزایش</button>
                    <button id="type-decrease" class="btn" style="flex:1; padding:12px; background:transparent; color:var(--text-muted); border:1px solid var(--divider);">- کاهش</button>
                </div>
                <input type="number" id="adjust-amount" class="input" placeholder="مبلغ به تومان..." style="margin-bottom:20px; text-align:center; font-size:20px; font-weight:600; padding:16px;">
                <div style="display:flex; gap:8px;">
                    <button id="btn-save-adjust" class="btn btn--primary" style="flex:1; padding:14px;">ثبت تغییر</button>
                    <button id="btn-cancel-adjust" class="btn" style="flex:1; background:transparent; border:1px solid var(--divider); padding:14px;">انصراف</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        let adjustType = 'increase';
        const btnInc = document.getElementById('type-increase');
        const btnDec = document.getElementById('type-decrease');

        btnInc.onclick = () => {
            adjustType = 'increase';
            btnInc.style.background = 'rgba(74, 222, 128, 0.15)';
            btnInc.style.color = '#4ade80';
            btnInc.style.border = '1px solid rgba(74, 222, 128, 0.3)';
            btnInc.style.fontWeight = '700';
            btnDec.style.background = 'transparent';
            btnDec.style.color = 'var(--text-muted)';
            btnDec.style.border = '1px solid var(--divider)';
            btnDec.style.fontWeight = '400';
        };

        btnDec.onclick = () => {
            adjustType = 'decrease';
            btnDec.style.background = 'rgba(255, 107, 107, 0.15)';
            btnDec.style.color = '#ff6b6b';
            btnDec.style.border = '1px solid rgba(255, 107, 107, 0.3)';
            btnDec.style.fontWeight = '700';
            btnInc.style.background = 'transparent';
            btnInc.style.color = 'var(--text-muted)';
            btnInc.style.border = '1px solid var(--divider)';
            btnInc.style.fontWeight = '400';
        };

        document.getElementById('btn-save-adjust').onclick = async() => {
            const amount = Number(document.getElementById('adjust-amount').value);
            if (!Number.isSafeInteger(amount) || amount <= 0) return showToast('مبلغ معتبر وارد کنید.', 'error');
            if (adjustType === 'decrease') {
                const balance = await getBalance();
                if (amount > balance) return showToast('موجودی کافی نیست!', 'error');
            }
            await db.balanceAdjustments.add({ type: adjustType, amount, description: 'تنظیم دستی', adjustmentDate: today });
            modalDiv.remove();
            showToast(adjustType === 'increase' ? 'موجودی افزایش یافت.' : 'موجودی کاهش یافت.', 'success');
            loadData();
        };
        document.getElementById('btn-cancel-adjust').onclick = () => modalDiv.remove();
    };

    loadData();
}