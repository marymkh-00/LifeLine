// js/pages/finance/reports.js
import db from '../../db.js';
import { formatToman, toFa } from '../../jalali.js';

export async function renderReports(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card__title">نمودار هزینه‌های این ماه</div>
            <div class="chart-container" id="expense-chart" style="display:flex; justify-content:center; align-items:center; min-height:220px;"></div>
            <div class="chart-legend" id="chart-legend"></div>
        </div>
        <div class="card">
            <div class="card__title">جزئیات هزینه‌ها</div>
            <div id="monthly-expense-summary"></div>
        </div>
    `;

    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const categories = await db.expenseCategories.toArray();
    const expenses = await db.expenses.filter(e => e.expenseDate >= firstOfMonth).toArray();
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

    const categoryTotals = {};
    expenses.forEach(e => {
        if (!categoryTotals[e.categoryId]) categoryTotals[e.categoryId] = 0;
        categoryTotals[e.categoryId] += e.amount;
    });

    const chartEl = document.getElementById('expense-chart');
    const legendEl = document.getElementById('chart-legend');
    const summaryEl = document.getElementById('monthly-expense-summary');

    if (totalExpense === 0) {
        chartEl.innerHTML = '<div class="empty">داده‌ای برای نمایش وجود ندارد</div>';
        legendEl.innerHTML = '';
        summaryEl.innerHTML = `<div style="font-size: 13px; color: var(--text-muted);">مجموع هزینه‌های این ماه</div><div style="font-size: 23px; font-weight: 700; color: var(--accent); margin-top: 6px;">${formatToman(0)}</div>`;
        return;
    }

    const size = 200;
    const center = size / 2;
    const radius = 80;
    const strokeWidth = 30;
    const circumference = 2 * Math.PI * radius;
    const colors = ['#E8D9C5', '#CDB89C', '#A98D72', '#795C47', '#493327', '#D4B895', '#9E9E9E'];
    let currentOffset = 0;
    let svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">`;
    svgContent += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="${strokeWidth}"></circle>`;
    const chartData = [];

    Object.entries(categoryTotals).forEach(([catId, amount], index) => {
        const cat = categories.find(c => c.id === parseInt(catId));
        const catName = cat ? cat.title : 'نامشخص';
        const percent = (amount / totalExpense) * 100;
        const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        const color = colors[index % colors.length];
        chartData.push({ name: catName, amount, percent, color });
        svgContent += `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="butt"></circle>`;
        currentOffset += (percent / 100) * circumference;
    });

    svgContent += `
        <circle cx="${center}" cy="${center}" r="${radius - strokeWidth/2 - 2}" fill="var(--card-main)"></circle>
        <text x="${center}" y="${center - 5}" text-anchor="middle" fill="var(--text-muted)" font-size="12" font-family="inherit" transform="rotate(90 ${center} ${center})">کل هزینه</text>
        <text x="${center}" y="${center + 15}" text-anchor="middle" fill="var(--accent)" font-size="14" font-weight="bold" font-family="inherit" transform="rotate(90 ${center} ${center})">${toFa(totalExpense.toLocaleString('en-US').split(',')[0])} تومان</text>
    </svg>`;
    chartEl.innerHTML = svgContent;

    legendEl.innerHTML = chartData.map(item => `<div class="legend-item"><div class="legend-color" style="background: ${item.color}"></div><span>${item.name}</span><span style="color: var(--text-main); font-weight: bold;">${toFa(Math.round(item.percent))}٪</span></div>`).join('');

    let summaryHtml = `<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 16px;"><div style="font-size: 13px; color: var(--text-muted);">مجموع هزینه‌های این ماه</div><div style="font-size: 20px; font-weight: 700; color: var(--accent);">${formatToman(totalExpense)}</div></div><div style="border-top: 1px solid var(--divider); padding-top: 12px; display: flex; flex-direction: column; gap: 12px;">`;
    chartData.sort((a, b) => b.amount - a.amount);
    chartData.forEach(item => { summaryHtml += `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="display:flex; align-items:center; gap:8px;"><div style="width:10px; height:10px; border-radius:50%; background:${item.color};"></div><span style="font-size:14px; font-weight:500;">${item.name}</span></div><div style="font-weight: 600; color: var(--text-main);">${formatToman(item.amount)}</div></div>`; });
    summaryHtml += `</div>`;
    summaryEl.innerHTML = summaryHtml;
}