// js/pages/finance/expenses.js
import db from '../../db.js';
import { todayISO, formatToman, toJalali } from '../../jalali.js';
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
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--divider);">
                   <div style="flex:1;">
                       <div style="font-weight: 500;">${escapeHTML(ex.title)}</div> 
                       <div style="font-size: 12px; color: var(--text-muted); margin-top:4px;">${escapeHTML(cat ? cat.title : 'نامشخص')}</div>
                   </div>
                   <div style="display:flex; align-items:center; gap:12px;">
                       <div style="color: #ff6b6b; font-weight: 600;">${formatToman(ex.amount)}</div>
                       <button class="btn-icon edit-exp" data-id="${ex.id}" style="color: var(--accent); width:28px; height:28px;">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                       </button>
                       <button class="btn-icon delete del-exp" data-id="${ex.id}" style="color: #ff6b6b; width:28px; height:28px;">✕</button>
                   </div>
                </div>`;
            }).join('');

            // مدیریت دکمه حذف
            listEl.querySelectorAll('.del-exp').forEach(btn => {
                btn.onclick = async() => {
                    if (confirm('این هزینه حذف شود؟ (مبلغ آن به موجودی برگردانده می‌شود)')) {
                        await db.expenses.delete(Number(btn.dataset.id));
                        showToast('هزینه حذف شد.', 'success');
                        loadData();
                    }
                };
            });

            // مدیریت دکمه ویرایش
            listEl.querySelectorAll('.edit-exp').forEach(btn => {
                        btn.onclick = async() => {
                                const exId = Number(btn.dataset.id);
                                const ex = await db.expenses.get(exId);

                                const modal = document.createElement('div');
                                modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);';
                                modal.innerHTML = `
                        <div class="card" style="width:100%; max-width:400px; padding:24px; animation: slideUp 0.3s ease;">
                            <h3 style="margin-bottom:16px;">ویرایش هزینه</h3>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <input type="text" id="edit-exp-title" class="input" value="${escapeHTML(ex.title)}">
                                <input type="number" id="edit-exp-amount" class="input" value="${ex.amount}">
                                <select id="edit-exp-category" class="input" style="padding:8px;">
                                    ${categories.map(c => `<option value="${c.id}" ${c.id === ex.categoryId ? 'selected' : ''}>${escapeHTML(c.title)}</option>`).join('')}
                                </select>
                                <div style="display:flex; gap:8px; margin-top:8px;">
                                    <button id="save-exp-edit" class="btn btn--primary" style="flex:1;">ذخیره</button>
                                    <button id="cancel-exp-edit" class="btn" style="flex:1; background:transparent; border:1px solid var(--divider);">انصراف</button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    document.getElementById('cancel-exp-edit').onclick = () => modal.remove();
                    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

                    document.getElementById('save-exp-edit').onclick = async () => {
                        const newTitle = document.getElementById('edit-exp-title').value.trim();
                        const newAmount = parseInt(document.getElementById('edit-exp-amount').value);
                        const newCategory = parseInt(document.getElementById('edit-exp-category').value);

                        if (!newTitle || isNaN(newAmount) || newAmount <= 0) return showToast('اطلاعات را کامل وارد کنید.', 'error');

                        // بررسی موجودی اگه مقدار افزایش پیدا کرده
                        if (newAmount > ex.amount) {
                            const currentBalance = await getBalance();
                            if ((newAmount - ex.amount) > currentBalance) {
                                return showToast('موجودی کافی برای افزایش هزینه نیست!', 'error');
                            }
                        }

                        await db.expenses.update(exId, { title: newTitle, amount: newAmount, categoryId: newCategory });
                        modal.remove();
                        showToast('هزینه ویرایش شد.', 'success');
                        loadData();
                    };
                };
            });
        }
    }

    // ثبت هزینه جدید با تراکنش اتمیک
       document.getElementById('btn-add-expense').onclick = async (e) => {
        const btn = e.currentTarget;
        if (btn.disabled) return;

        const title = document.getElementById('expense-title').value.trim();
        const amount = parseInt(document.getElementById('expense-amount').value);
        const categoryId = parseInt(document.getElementById('expense-category').value);

        if (!title || isNaN(amount) || amount <= 0) return showToast('اطلاعات را کامل وارد کنید.', 'error');

        btn.disabled = true;
        btn.innerText = 'در حال ثبت...';

        try {
            await db.transaction('rw', db.expenses, db.balanceAdjustments, db.categoryBudgets, async () => {
                const currentBalance = await getBalance();
                if (amount > currentBalance) throw new Error('موجودی کافی نیست!');

                // ✅ هشدار رد شدن از بودجه
                const now = new Date();
                const todayISOStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const jDate = toJalali(todayISOStr);
                const budget = await db.categoryBudgets.where({ categoryId, year: jDate.year, month: jDate.month }).first();
                
                if (budget) {
                    const allExpenses = await db.expenses.toArray();
                    const monthExpenses = allExpenses.filter(ex => {
                        const exDate = toJalali(ex.expenseDate);
                        return exDate.year === jDate.year && exDate.month === jDate.month && ex.categoryId === categoryId;
                    });
                    const totalSpent = monthExpenses.reduce((s, ex) => s + ex.amount, 0) + amount;
                    
                    if (totalSpent > budget.limitAmount) {
                        showToast(`⚠️ توجه: با ثبت این هزینه از سقف بودجه «${document.getElementById('expense-category').options[document.getElementById('expense-category').selectedIndex].text}» عبور می‌کنی!`, 'warning', 5000);
                    }
                }

                await db.expenses.add({ title, amount, categoryId, expenseDate: today });
            });
            
            document.getElementById('expense-title').value = '';
            document.getElementById('expense-amount').value = '';
            showToast('هزینه ثبت شد.', 'success');
            loadData();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'ثبت هزینه';
        }
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
            btnInc.style.background = 'rgba(74, 222, 128, 0.15)'; btnInc.style.color = '#4ade80'; btnInc.style.border = '1px solid rgba(74, 222, 128, 0.3)'; btnInc.style.fontWeight = '700';
            btnDec.style.background = 'transparent'; btnDec.style.color = 'var(--text-muted)'; btnDec.style.border = '1px solid var(--divider)'; btnDec.style.fontWeight = '400';
        };

        btnDec.onclick = () => {
            adjustType = 'decrease';
            btnDec.style.background = 'rgba(255, 107, 107, 0.15)'; btnDec.style.color = '#ff6b6b'; btnDec.style.border = '1px solid rgba(255, 107, 107, 0.3)'; btnDec.style.fontWeight = '700';
            btnInc.style.background = 'transparent'; btnInc.style.color = 'var(--text-muted)'; btnInc.style.border = '1px solid var(--divider)'; btnInc.style.fontWeight = '400';
        };

        document.getElementById('btn-save-adjust').onclick = async () => {
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