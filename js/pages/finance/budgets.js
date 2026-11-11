// js/pages/finance/budgets.js
import db from '../../db.js';
import { formatToman, toJalali } from '../../jalali.js';
import { showToast, escapeHTML } from '../../utils.js';

export async function renderBudgets(container) {
    container.innerHTML = `
        <div class="card" id="budget-summary-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="card__title" style="margin:0;">وضعیت بودجه این ماه</div>
                <button id="btn-add-budget" class="btn-icon" style="color:var(--accent); background:var(--card-secondary); border-radius:50%; width:32px; height:32px; font-size:20px;">+</button>
            </div>
            <div id="budget-summary-content"></div>
        </div>
        <div class="card" id="category-budgets-card">
            <div class="card__title">بودجه دسته‌بندی‌ها</div>
            <div id="category-budgets-content"></div>
        </div>
    `;

    async function loadData() {
        const now = new Date();
        const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const jDate = toJalali(todayISO);
        const jYear = jDate.year;
        const jMonth = jDate.month;

        const gFirstOfMonth = window.jalaali.toGregorian(jYear, jMonth, 1);
        const firstOfMonthISO = `${gFirstOfMonth.gy}-${String(gFirstOfMonth.gm).padStart(2, '0')}-${String(gFirstOfMonth.gd).padStart(2, '0')}`;

        const allBudgets = await db.categoryBudgets.toArray();
        const budgets = allBudgets.filter(b => b.year === jYear && b.month === jMonth);

        const categories = await db.expenseCategories.toArray();
        const monthExpenses = await db.expenses.filter(e => e.expenseDate >= firstOfMonthISO).toArray();

        const summaryContent = document.getElementById('budget-summary-content');
        const categoryContent = document.getElementById('category-budgets-content');

        if (budgets.length === 0) {
            summaryContent.innerHTML = `<div class="empty" style="padding: 8px;">هنوز سقفی تعیین نکردی.</div>`;
            categoryContent.innerHTML = `<div class="empty" style="padding: 8px;">لیست خالی است.</div>`;
            return;
        }

        const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
        let totalSpent = 0;
        budgets.forEach(b => {
            totalSpent += monthExpenses.filter(e => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0);
        });

        const remaining = totalLimit - totalSpent;
        const percentUsed = totalLimit === 0 ? 0 : Math.min(100, Math.round((totalSpent / totalLimit) * 100));
        const isOver = remaining < 0;

        summaryContent.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top: 16px;">
              <div>
                <div style="font-size: 12px; color: var(--text-muted);">باقی‌مانده</div>
                <div style="font-size: 22px; font-weight: 700; color: ${isOver ? '#ff6b6b' : 'var(--accent)'}; margin-top: 4px;">
                  ${formatToman(Math.abs(remaining))} ${isOver ? '(بیشتر از سقف)' : ''}
                </div>
              </div>
            </div>
            <div class="budget-bar" style="margin-top: 12px; height: 8px;">
              <div class="budget-bar-fill" style="width: ${percentUsed}%; background: ${isOver ? '#ff6b6b' : 'var(--accent)'};"></div>
            </div>
        `;

        categoryContent.innerHTML = '';
        budgets.forEach(b => {
                    const cat = categories.find(c => c.id === b.categoryId);
                    if (!cat) return;

                    const spent = monthExpenses.filter(e => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0);
                    const remaining = b.limitAmount - spent;
                    const percent = b.limitAmount === 0 ? 0 : Math.min(100, Math.round((spent / b.limitAmount) * 100));
                    const isOver = remaining < 0;

                    const row = document.createElement('div');
                    row.style.marginBottom = '16px';
                    row.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span style="font-size: 14px; font-weight: 500;">${escapeHTML(cat.title)}</span>
                <span style="font-size: 12px; color: ${isOver ? '#ff6b6b' : 'var(--accent)'}; font-weight: 600;">
                  ${isOver ? 'بیشتر از سقف!' : `باقی‌مانده: ${formatToman(remaining)}`}
                </span>
              </div>
              <div class="budget-bar" style="height: 8px;">
                <div class="budget-bar-fill" style="width: ${percent}%; background: ${isOver ? '#ff6b6b' : 'var(--accent)'};"></div>
              </div>
            `;
            categoryContent.appendChild(row);
        });
    }

    document.getElementById('btn-add-budget').onclick = async () => {
        const categories = await db.expenseCategories.toArray();
        const modalDiv = document.createElement('div');
        modalDiv.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; backdrop-filter: blur(4px);';
        modalDiv.innerHTML = `
            <div class="card" style="width:100%; max-width:400px; padding:24px; animation: slideUp 0.3s ease;">
                <h3 style="margin-bottom:16px;">تعیین سقف بودجه</h3>
                <div style="display:flex; flex-direction:column; gap:16px;">
                  <select id="budget-category" class="input">
                    ${categories.map(c => `<option value="${c.id}">${escapeHTML(c.title)}</option>`).join('')}
                  </select>
                  <input type="number" id="budget-amount" class="input" placeholder="مبلغ سقف (تومان)">
                  <div style="display:flex; gap:8px; margin-top:8px;">
                      <button id="btn-save-budget" class="btn btn--primary" style="flex:1;">ذخیره</button>
                      <button id="btn-cancel-budget" class="btn" style="flex:1; background:transparent; border:1px solid var(--divider);">انصراف</button>
                  </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        document.getElementById('btn-cancel-budget').onclick = () => modalDiv.remove();
        document.getElementById('btn-save-budget').onclick = async () => {
            const catId = parseInt(document.getElementById('budget-category').value);
            const limitAmount = parseInt(document.getElementById('budget-amount').value);
            if (isNaN(limitAmount) || limitAmount <= 0) return showToast('مبلغ معتبر وارد کنید.', 'error');

            const now = new Date();
            const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const jDate = toJalali(todayISO);
            
            const existing = await db.categoryBudgets.where({ categoryId: catId, year: jDate.year, month: jDate.month }).first();
            if (existing) await db.categoryBudgets.update(existing.id, { limitAmount });
            else await db.categoryBudgets.add({ categoryId: catId, year: jDate.year, month: jDate.month, limitAmount });
            
            modalDiv.remove();
            showToast('ذخیره شد.', 'success');
            loadData();
        };
    };
    loadData();
}