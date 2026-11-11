// js/pages/finance.js
import { renderExpenses } from './finance/expenses.js';
import { renderBudgets } from './finance/budgets.js';
import { renderReports } from './finance/reports.js';
import { renderDebts } from './finance/debts.js';

export default async function renderFinance(container) {
    container.innerHTML = `
        <div style="display:flex; gap:8px; margin-bottom: 16px; overflow-x:auto; padding-bottom:4px; scrollbar-width: none;">
            <button id="tab-expenses" class="btn" style="flex:1; white-space:nowrap; background:var(--accent); color:var(--bg-main); font-weight:600;">هزینه‌ها</button>
            <button id="tab-budgets" class="btn" style="flex:1; white-space:nowrap; background:var(--card-secondary);">بودجه</button>
            <button id="tab-reports" class="btn" style="flex:1; white-space:nowrap; background:var(--card-secondary);">گزارش</button>
            <button id="tab-debts" class="btn" style="flex:1; white-space:nowrap; background:var(--card-secondary);">بدهی/طلب</button>
        </div>
        
        <div id="finance-content"></div>
    `;

    const contentEl = document.getElementById('finance-content');
    const tabs = {
        'tab-expenses': renderExpenses,
        'tab-budgets': renderBudgets,
        'tab-reports': renderReports,
        'tab-debts': renderDebts,
    };

    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).onclick = () => {
            Object.keys(tabs).forEach(id => {
                const btn = document.getElementById(id);
                btn.style.background = 'var(--card-secondary)';
                btn.style.color = 'var(--text-main)';
                btn.style.fontWeight = '400';
            });
            const activeBtn = document.getElementById(tabId);
            activeBtn.style.background = 'var(--accent)';
            activeBtn.style.color = 'var(--bg-main)';
            activeBtn.style.fontWeight = '600';

            contentEl.innerHTML = '';
            tabs[tabId](contentEl);
        };
    });

    renderExpenses(contentEl);
}