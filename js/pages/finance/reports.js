// js/pages/finance/reports.js
import db from '../../db.js';
import { formatToman, toFa, toJalali } from '../../jalali.js';

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export async function renderReports(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card__title">نمودار هزینه‌های این ماه</div>
            <div class="chart-container" id="expense-chart" style="display:flex; justify-content:center; align-items:center; min-height:220px;"></div>
            <div class="chart-legend" id="chart-legend"></div>
        </div>
        
        <div class="card">
            <div class="card__title">روند هزینه‌های ۶ ماه اخیر</div>
            <div id="trend-chart" style="width: 100%; height: 180px; margin-top: 16px;"></div>
        </div>

        <div class="card">
            <div class="card__title">پرهزینه‌ترین دسته‌بندی‌ها (ماهانه)</div>
            <div id="top-categories-content" style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;"></div>
        </div>

        <div class="card">
            <div class="card__title">مقایسه با ماه قبل</div>
            <div id="comparison-content" style="margin-top: 16px;"></div>
        </div>
    `;

    // گرفتن داده‌ها
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const jDate = toJalali(todayISO);
    const allExpenses = await db.expenses.toArray();
    const categories = await db.expenseCategories.toArray();

    // ۱. محاسبه داده‌های ۶ ماه اخیر
    let monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        let m = jDate.month - i;
        let y = jDate.year;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }

        const monthExpenses = allExpenses.filter(e => {
            const eDate = toJalali(e.expenseDate);
            return eDate.year === y && eDate.month === m;
        });

        const total = monthExpenses.reduce((s, e) => s + e.amount, 0);

        // پیدا کردن پرهزینه‌ترین دسته‌بندی این ماه
        const catTotals = {};
        monthExpenses.forEach(e => {
            catTotals[e.categoryId] = (catTotals[e.categoryId] || 0) + e.amount;
        });
        let topCat = null;
        let maxVal = 0;
        Object.entries(catTotals).forEach(([cid, val]) => {
            if (val > maxVal) {
                maxVal = val;
                topCat = categories.find(c => c.id === parseInt(cid));
            }
        });

        monthlyData.push({
            year: y,
            month: m,
            monthName: MONTHS[m - 1],
            total,
            topCatName: topCat ? topCat.title : 'نامشخص',
            topCatAmount: maxVal
        });
    }

    // ۲. رسم نمودار دایره‌ای (همون قبلی)
    const currentMonthExpenses = allExpenses.filter(e => {
        const eDate = toJalali(e.expenseDate);
        return eDate.year === jDate.year && eDate.month === jDate.month;
    });
    const totalExpense = currentMonthExpenses.reduce((s, e) => s + e.amount, 0);

    const categoryTotals = {};
    currentMonthExpenses.forEach(e => {
        if (!categoryTotals[e.categoryId]) categoryTotals[e.categoryId] = 0;
        categoryTotals[e.categoryId] += e.amount;
    });

    const chartEl = document.getElementById('expense-chart');
    const legendEl = document.getElementById('chart-legend');

    if (totalExpense === 0) {
        chartEl.innerHTML = '<div class="empty">داده‌ای برای نمایش وجود ندارد</div>';
    } else {
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
            <text x="${center}" y="${center + 15}" text-anchor="middle" fill="var(--accent)" font-size="14" font-weight="bold" font-family="inherit" transform="rotate(90 ${center} ${center})">${toFa(totalExpense.toLocaleString('en-US'))} تومان</text>
        </svg>`;
        chartEl.innerHTML = svgContent;

        legendEl.innerHTML = chartData.map(item => `<div class="legend-item"><div class="legend-color" style="background: ${item.color}"></div><span>${item.name}</span><span style="color: var(--text-main); font-weight: bold;">${toFa(Math.round(item.percent))}٪</span></div>`).join('');
    }

    // ۳. رسم نمودار موجی ۶ ماهه (SVG Line Chart) - هوشمند
    const trendChartEl = document.getElementById('trend-chart');
    if (trendChartEl) {
        // ✅ محاسبه min و max برای مقیاس هوشمند
        const totals = monthlyData.map(d => d.total);
        const maxVal = Math.max(...totals);
        const minVal = Math.min(...totals);

        // ✅ اگه همه ماه‌ها برابر بودن یا صفر بودن، از مقیاس ثابت استفاده کن
        const range = maxVal - minVal;
        const smartRange = range === 0 ? (maxVal || 1) : range;

        const chartWidth = 400;
        const chartHeight = 120;
        const paddingX = 30;
        const paddingY = 20;
        const usableWidth = chartWidth - paddingX * 2;
        const usableHeight = chartHeight - paddingY * 2;
        const stepX = usableWidth / (monthlyData.length - 1);

        // ✅ محاسبه نقاط با مقیاس هوشمند (Min-Max)
        let points = monthlyData.map((d, i) => {
            const x = paddingX + i * stepX;
            // ✅ ارتفاع بر اساس فاصله از minVal (نه از صفر)
            const ratio = (d.total - minVal) / smartRange;
            const y = chartHeight - paddingY - (ratio * usableHeight);
            return { x, y, ...d };
        });

        // ساخت مسیر موجی (منحنی)
        let pathData = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp1y = prev.y;
            const cp2x = cp1x;
            const cp2y = curr.y;
            pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }

        // مسیر بسته برای پر کردن زیر نمودار
        const areaPath = `${pathData} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

        let svg = `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width: 100%; height: 100%; overflow: visible;">`;
        svg += `
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
        `;

        // خط افقی برای راهنما (پایین‌ترین سطح = minVal)
        svg += `<line x1="${paddingX}" y1="${chartHeight - paddingY}" x2="${chartWidth - paddingX}" y2="${chartHeight - paddingY}" stroke="var(--divider)" stroke-width="1"/>`;

        // ناحیه پر شده
        svg += `<path d="${areaPath}" fill="url(#areaGradient)"/>`;
        // خط موجی
        svg += `<path d="${pathData}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>`;

        // نقاط و متن‌ها
        points.forEach(p => {
            svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--bg-main)" stroke="var(--accent)" stroke-width="2"/>`;
            svg += `<text x="${p.x}" y="${chartHeight - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-family="inherit">${p.monthName}</text>`;
            svg += `<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" fill="var(--text-main)" font-size="9" font-family="inherit">${toFa((p.total / 1000).toFixed(0))}ک</text>`;
        });

        svg += `</svg>`;
        trendChartEl.innerHTML = svg;
    }

    // ۴. بخش پرهزینه‌ترین دسته‌بندی هر ماه
    const topCatEl = document.getElementById('top-categories-content');
    if (topCatEl) {
        topCatEl.innerHTML = monthlyData.map(d => {
            if (d.total === 0) return '';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--card-secondary); border-radius: 12px; border-left: 3px solid var(--accent);">
                    <div style="font-size: 14px; font-weight: 600;">${d.monthName}</div>
                    <div style="text-align: left;">
                        <div style="font-size: 13px; color: var(--text-main);">${d.topCatName}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${formatToman(d.topCatAmount)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ۵. بخش مقایسه با ماه قبل
    const comparisonEl = document.getElementById('comparison-content');
    if (comparisonEl) {
        const currentTotal = monthlyData[5].total;
        const prevTotal = monthlyData[4].total;
        const diff = currentTotal - prevTotal;
        const diffPercent = prevTotal === 0 ? 0 : Math.round((diff / prevTotal) * 100);

        let diffText = '';
        let diffColor = '';
        if (diff > 0) {
            diffText = `افزایش ${toFa(diffPercent)}٪`;
            diffColor = '#ff6b6b';
        } else if (diff < 0) {
            diffText = `کاهش ${toFa(Math.abs(diffPercent))}٪`;
            diffColor = '#4ade80';
        } else {
            diffText = 'بدون تغییر';
            diffColor = 'var(--text-muted)';
        }

        comparisonEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px; background: var(--card-secondary); border-radius: var(--radius-sm);">
                <div>
                    <div style="font-size: 12px; color: var(--text-muted);">این ماه (${monthlyData[5].monthName})</div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--accent);">${formatToman(currentTotal)}</div>
                </div>
                <div style="text-align: center; color: ${diffColor}; font-size: 14px; font-weight: 600;">
                    ${diffText}
                </div>
                <div style="text-align: left;">
                    <div style="font-size: 12px; color: var(--text-muted);">ماه قبل (${monthlyData[4].monthName})</div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--text-main);">${formatToman(prevTotal)}</div>
                </div>
            </div>
        `;
    }
}