// js/pages/finance/debts.js
import db from '../../db.js';
import { showToast, escapeHTML } from '../../utils.js';

export async function renderDebts(container) {
    container.innerHTML = `
        <div class="card" style="display:flex; flex-direction:column; gap:12px;">
            <div class="card__title">افزودن مورد جدید</div>
            <input type="text" id="debt-title" class="input" placeholder="عنوان...">
            <select id="debt-type" class="input" style="padding:8px;">
                <option value="receivable">🟢 طلب (کسی به من بدهکار است)</option>
                <option value="payable">🔴 بدهی (من به کسی بدهکارم)</option>
            </select>
            <input type="text" id="debt-desc" class="input" placeholder="توضیحات (اختیاری)...">
            <button id="btn-add-debt" class="btn btn--primary">افزودن</button>
        </div>
        <div id="debts-list"></div>
    `;

    async function loadDebts() {
        const debts = await db.debts.toArray();
        const listEl = document.getElementById('debts-list');

        if (debts.length === 0) {
            listEl.innerHTML = '<div class="card"><div class="empty">موردی ثبت نشده است.</div></div>';
            return;
        }

        listEl.innerHTML = '';
        debts.forEach(d => {
                    const isReceivable = d.type === 'receivable';
                    const item = document.createElement('div');
                    item.className = 'card';
                    item.style.cssText = 'padding: 16px; display:flex; justify-content:space-between; align-items:center; border-right: 4px solid ' + (isReceivable ? '#4ade80' : '#ff6b6b') + ';';

                    item.innerHTML = `
                <div>
                    <div style="font-weight:600; color: var(--text-main); font-size: 15px;">${escapeHTML(d.title)}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">
                        ${isReceivable ? 'طلب' : 'بدهی'} ${d.description ? `- ${escapeHTML(d.description)}` : ''}
                    </div>
                </div>
                <button class="btn-icon delete" style="color:#ff6b6b; background: rgba(255,107,107,0.1); border-radius: 50%; width: 36px; height: 36px;">✕</button>
            `;
            item.querySelector('.btn-icon.delete').onclick = async () => {
                if (confirm('این مورد حذف شود؟')) {
                    await db.debts.delete(d.id);
                    showToast('حذف شد.', 'success');
                    loadDebts();
                }
            };
            listEl.appendChild(item);
        });
    }

    document.getElementById('btn-add-debt').onclick = async () => {
        const title = document.getElementById('debt-title').value.trim();
        const type = document.getElementById('debt-type').value;
        const desc = document.getElementById('debt-desc').value.trim();
        if (!title) return showToast('عنوان را وارد کنید.', 'error');
        await db.debts.add({ title, type, description: desc });
        document.getElementById('debt-title').value = '';
        document.getElementById('debt-desc').value = '';
        showToast('ثبت شد.', 'success');
        loadDebts();
    };
    loadDebts();
}