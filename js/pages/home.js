// js/pages/home.js
import db from 'db';
import { todayISO, formatJalali, weekdayName, formatToman, toFa } from 'jalali';
import { navigate } from '../router.js';
import { showToast, escapeHTML } from '../utils.js';

export default async function renderHome(container) {
    const today = todayISO();

    const moods = await db.dailyMoods.where({ date: today }).first();
    const tasks = await db.tasks.where({ taskDate: today }).toArray();
    const adjustments = await db.balanceAdjustments.toArray();
    const expenses = await db.expenses.toArray();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const totalInc = adjustments.filter(a => a.type === 'increase').reduce((s, a) => s + a.amount, 0);
    const totalDec = adjustments.filter(a => a.type === 'decrease').reduce((s, a) => s + a.amount, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const balance = totalInc - totalDec - totalExp;

    const allTasks = await db.tasks.toArray();
    const totalCompletedAllTime = allTasks.filter(t => t.isCompleted).length;

    const categories = await db.expenseCategories.toArray();
    const categoryTotals = {};
    expenses.forEach(e => {
        categoryTotals[e.categoryId] = (categoryTotals[e.categoryId] || 0) + e.amount;
    });

    let topCategoryName = null;
    let maxSpent = 0;
    Object.entries(categoryTotals).forEach(([catId, amount]) => {
        if (amount > maxSpent) {
            maxSpent = amount;
            const cat = categories.find(c => c.id === parseInt(catId));
            if (cat) topCategoryName = cat.title;
        }
    });

    // آیکون‌های جدید SVG برای حال روزانه
    const moodIcons = {
        great: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        good: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 1 4 1 4-1 4-1"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        ok: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        bad: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        tired: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"></path><path d="M12 2v10h10"></path><line x1="9" y1="15" x2="9.01" y2="15"></line><line x1="15" y1="15" x2="15.01" y2="15"></line></svg>`
    };

    container.innerHTML = `
    <div style="margin-bottom: 24px; margin-top: 8px;">
      <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 4px; background: linear-gradient(90deg, #fff, var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">سلام</h2>
      <div style="color: var(--text-muted); font-size: 14px;">${weekdayName(today)}، ${formatJalali(today)}</div>
    </div>

    <div class="card" id="home-mood-card"></div>

    <!-- کارت ادغام شده: پیشرفت کارها و یک نگاه به گذشته -->
    <div class="card">
      <div class="card__title" style="display:flex; justify-content:space-between;">
        <span>پیشرفت کارهای امروز</span>
        <span style="color:var(--accent); font-weight:700;">${toFa(completedTasks)} از ${toFa(totalTasks)}</span>
      </div>

      ${totalTasks === 0 ? `<div class="empty" style="padding: 16px 0;">کاری برای امروز ثبت نشده است.</div>` : `
        <div class="progress" style="margin-top: 8px;"><div class="progress__fill" style="width: ${progressPercent}%;"></div></div>
        <div style="text-align:left; font-size:12px; color:var(--text-muted); margin-top:8px; margin-bottom: 16px;">${toFa(progressPercent)}٪ انجام شده</div>
      `}

      <div style="border-top: 1px solid var(--divider); padding-top: 12px; margin-top: 12px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">یک نگاه به گذشته</div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="background: rgba(74, 222, 128, 0.1); padding: 8px; border-radius: 50%; color: #4ade80;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
            <div><div style="font-size: 13px; font-weight: 600;">${toFa(totalCompletedAllTime)} کار انجام شده</div><div style="font-size: 11px; color: var(--text-muted);">تا امروز به وظایفت عمل کردی!</div></div>
          </div>
          
          ${topCategoryName ? `
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="background: rgba(255, 107, 107, 0.1); padding: 8px; border-radius: 50%; color: #ff6b6b;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
            <div><div style="font-size: 13px; font-weight: 600;">بیشترین هزینه: ${topCategoryName}</div><div style="font-size: 11px; color: var(--text-muted);">مبلغ ${formatToman(maxSpent)}</div></div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- کارت پیش رو (رویدادها و کارهای عقب‌افتاده) -->
    <div class="card" id="home-upcoming-card" style="display:none;">
      <div class="card__title">پیش رو</div>
      <div id="home-upcoming-list" style="display:flex; flex-direction:column; gap:12px; margin-top:12px;"></div>
    </div>

    <!-- دسترسی سریع -->
    <div class="card">
      <div class="card__title">دسترسی سریع</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
        <button id="btn-quick-task" class="btn" style="padding: 20px; display:flex; flex-direction:column; align-items:center; gap:12px; background: var(--card-secondary); border-radius: 16px;">
          <div style="background: rgba(212,184,149,0.1); padding: 12px; border-radius: 50%; display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
          <span style="font-weight: 600; font-size:14px;">کار جدید</span>
        </button>
        <button id="btn-quick-finance" class="btn" style="padding: 20px; display:flex; flex-direction:column; align-items:center; gap:12px; background: var(--card-secondary); border-radius: 16px;">
          <div style="background: rgba(212,184,149,0.1); padding: 12px; border-radius: 50%; display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></div>
          <span style="font-weight: 600; font-size:14px;">هزینه جدید</span>
        </button>
      </div>
    </div>

    <!-- کارت موجودی فعلی رو به این تغییر بده -->
<div class="card" style="position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(30,30,34,0.8), rgba(20,20,22,0.9)); border: 1px solid rgba(212, 184, 149, 0.2); box-shadow: 0 0 25px rgba(212, 184, 149, 0.08);">
  <div class="card__title">موجودی فعلی</div>
  <div style="font-size: 28px; font-weight: 900; color: var(--accent); margin-top: 4px; text-shadow: 0 0 15px rgba(212, 184, 149, 0.3);">${formatToman(balance)}</div>
</div>

    <!-- نمودار ۷ روز اخیر -->
    <div class="card">
      <div class="card__title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>روند ۷ روز اخیر</span>
        <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">کارهای انجام شده</span>
      </div>
      <div id="home-trend-chart" style="width:100%; height:120px; display:flex; align-items:flex-end; justify-content:space-between; gap:8px; margin-top:16px; padding-bottom: 8px; border-bottom: 1px solid var(--divider);">
        <!-- نمودار با JS پر میشه -->
      </div>
    </div>
  `;

  // 🛡️ بررسی وجود دکمه‌ها قبل از کلیک (جلوگیری از خطای null)
  const btnQuickTask = document.getElementById('btn-quick-task');
  if (btnQuickTask) btnQuickTask.onclick = () => navigate('tasks');

  const btnQuickFinance = document.getElementById('btn-quick-finance');
  if (btnQuickFinance) btnQuickFinance.onclick = () => navigate('finance');

  const moodCard = document.getElementById('home-mood-card');
  const moodsList = [
    { id: 'great', label: 'عالی' }, { id: 'good', label: 'خوب' }, { id: 'ok', label: 'معمولی' }, { id: 'bad', label: 'ناراحت' }, { id: 'tired', label: 'خسته' }
  ];

  if (moods) {
    const currentMood = moodsList.find(m => m.id === moods.mood);
    moodCard.innerHTML = `
      <div class="card__title">حال امروز شما</div>
      <div style="display: flex; align-items: center; gap: 16px; margin-top: 12px;">
        <div style="color: var(--accent);">${moodIcons[moods.mood] || moodIcons.ok}</div>
        <div style="flex: 1;">
          <div style="font-weight: bold; color: var(--accent);">${currentMood ? currentMood.label : 'نامشخص'}</div>
          ${moods.description ? `<div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">"${moods.description}"</div>` : ''}
        </div>
      </div>
    `;
  } else {
    moodCard.innerHTML = `
      <div class="card__title">حالت امروز چطوره؟</div>
      <div style="display: flex; justify-content: space-between; margin-top: 16px;">
        ${moodsList.map(m => `
          <div class="quick-mood" data-id="${m.id}" style="cursor: pointer; text-align: center; padding: 8px; border-radius: 12px; transition: 0.2s; color: var(--text-muted);">
            <div style="margin-bottom: 4px;">${moodIcons[m.id]}</div><div style="font-size: 11px;">${m.label}</div>
          </div>
        `).join('')}
      </div>
    `;

        // 📊 رسم نمودار روند ۷ روز اخیر
    const chartContainer = document.getElementById('home-trend-chart');
    if (chartContainer) {
        // گرفتن تمام تسک‌ها از دیتابیس
        const allTasks = await db.tasks.toArray();
        const trendData = [];

        // ساخت آرایه ۷ روز اخیر (از ۶ روز قبل تا امروز)
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            
            // تاریخ به فرمت YYYY-MM-DD (همون فرمتی که در دیتابیس ذخیره میشه)
            const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            // شمارش کارهای انجام شده در این روز
            const doneCount = allTasks.filter(t => t.taskDate === isoDate && t.isCompleted).length;
            
            // گرفتن نام روز هفته (0=یکشنبه، 1=دوشنبه و ...)
            const jsDay = d.getDay(); 
            // تبدیل به حروف فارسی: شنبه(6) -> ش، یکشنبه(0) -> ی، ...
            const faDays = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
            const dayName = faDays[jsDay];
            
            // بررسی اینکه آیا این روز "امروز" هست یا نه
            const isToday = i === 0;

            trendData.push({ dayName, doneCount, isToday });
        }

        // پیدا کردن بیشترین تعداد برای مقیاس‌بندی ارتفاع میله‌ها
        const maxCount = Math.max(...trendData.map(d => d.doneCount), 1);
        const containerHeight = 100; // ارتفاع کل میله‌ها به پیکسل

        // ساخت HTML میله‌ها
        let chartHtml = '';
        trendData.forEach((day) => {
            // محاسبه ارتفاع میله (اگر 0 بود، حداقل 4 پیکسل ارتفاع برای نمایش خط پایه)
            const barHeight = day.doneCount === 0 ? 4 : (day.doneCount / maxCount) * containerHeight;
            
            // رنگ‌بندی: امروز رنگ طلایی/تاکیدی، بقیه روزها رنگ خاکستری
            const barColor = day.isToday ? 'var(--accent)' : 'var(--card-secondary)';
            const textColor = day.isToday ? 'var(--accent)' : 'var(--text-muted)';
            const fontWeight = day.isToday ? 'bold' : 'normal';

            chartHtml += `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height: 100%; flex: 1;">
                    <!-- عدد بالای میله (فقط اگر کاری انجام شده) -->
                    <div style="font-size: 10px; color: ${textColor}; margin-bottom: 4px; font-weight: ${fontWeight}; height: 14px;">
                        ${day.doneCount > 0 ? toFa(day.doneCount) : ''}
                    </div>
                    
                    <!-- خود میله -->
                    <div style="width: 100%; max-width: 20px; height: ${barHeight}px; background: ${barColor}; border-radius: 4px 4px 0 0; transition: height 0.5s ease; box-shadow: ${day.isToday ? '0 0 10px var(--accent-glow)' : 'none'};"></div>
                    
                    <!-- نام روز هفته -->
                    <div style="font-size: 11px; color: ${textColor}; margin-top: 8px; font-weight: ${fontWeight};">${day.dayName}</div>
                </div>
            `;
        });

        chartContainer.innerHTML = chartHtml;
    }
    moodCard.querySelectorAll('.quick-mood').forEach(el => {
      el.onmouseenter = () => { el.style.background = 'var(--card-secondary)'; el.style.color = 'var(--accent)'; };
      el.onmouseleave = () => { el.style.background = 'transparent'; el.style.color = 'var(--text-muted)'; };
      el.onclick = async () => {
        const selected = el.getAttribute('data-id');
        try {
            const existing = await db.dailyMoods.where({ date: today }).first();
            if (existing) await db.dailyMoods.update(existing.id, { mood: selected });
            else await db.dailyMoods.add({ date: today, mood: selected, description: '' });
            showToast('حال امروز ثبت شد.', 'success');
            renderHome(container);
        } catch (err) { showToast('خطا در ثبت حال.', 'error'); }
      };
    });
  }
    // 📅 بررسی رویدادهای آینده و کارهای عقب‌افتاده
    const upcomingCard = document.getElementById('home-upcoming-card');
    const upcomingList = document.getElementById('home-upcoming-list');
    
    // ۱. گرفتن رویدادهای ۷ روز آینده
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekISO = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    const upcomingEvents = await db.events
        .filter(e => e.eventDate >= today && e.eventDate <= nextWeekISO)
        .toArray();
    
    // ۲. گرفتن کارهای عقب‌افتاده (تسک‌هایی که مال قبل هستن و انجام نشدن)
    const missedTasks = await db.tasks
        .filter(t => t.taskDate < today && !t.isCompleted)
        .toArray();

    // ۳. اگر چیزی بود، کارت رو نشون بده
    if (upcomingEvents.length > 0 || missedTasks.length > 0) {
        upcomingCard.style.display = 'block';
        let html = '';

        // نمایش کارهای عقب‌افتاده با رنگ قرمز/هشدار
        missedTasks.slice(0, 3).forEach(task => {
            html += `
                <div style="display:flex; align-items:center; gap:12px; padding:10px; background:rgba(255,107,107,0.08); border-radius:12px; border-left:3px solid #ff6b6b;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:600; color:#ff6b6b;">کار عقب‌افتاده</div>
                        <div style="font-size:13px; color:var(--text-main); margin-top:2px;">${escapeHTML(task.title)}</div>
                    </div>
                    <div style="font-size:11px; color:var(--text-muted);">${formatJalali(task.taskDate)}</div>
                </div>
            `;
        });

        // نمایش رویدادهای آینده با رنگ تاکیدی
        upcomingEvents.slice(0, 3).forEach(event => {
            html += `
                <div style="display:flex; align-items:center; gap:12px; padding:10px; background:rgba(212,184,149,0.08); border-radius:12px; border-left:3px solid var(--accent);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:600; color:var(--accent);">رویداد پیش رو</div>
                        <div style="font-size:13px; color:var(--text-main); margin-top:2px;">${escapeHTML(event.title)}</div>
                    </div>
                    <div style="font-size:11px; color:var(--text-muted);">${formatJalali(event.eventDate)}</div>
                </div>
            `;
        });

        upcomingList.innerHTML = html;
    }
  }