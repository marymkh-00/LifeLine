// js/pages/tasks.js
import db from '../db.js';
import { todayISO, formatJalali, toFa } from '../jalali.js';
import { showToast, escapeHTML, sanitizeColor } from '../utils.js';

const J = window.jalaali;

export default async function renderTasks(container) {
    const today = todayISO();
    let activeDate = today; // تاریخ فعال برای نمایش لیست

    // ۱. انتقال کارهای انجام‌نشده به امروز (با حفظ تاریخچه)
    async function rolloverTasks() {
        try {
            await db.transaction('rw', db.tasks, db.taskTransfers, async() => {
                const staleTasks = await db.tasks.filter(t => t.taskDate < today && !t.isCompleted).toArray();
                if (staleTasks.length === 0) return;

                for (const task of staleTasks) {
                    try {
                        await db.taskTransfers.add({
                            taskId: task.id,
                            fromDate: task.taskDate,
                            toDate: today,
                            transferredAt: new Date().toISOString(),
                        });
                    } catch (e) {
                        if (e.name !== 'ConstraintError') throw e;
                    }
                    await db.tasks.update(task.id, { taskDate: today });
                }
            });
        } catch (err) {
            console.error('rolloverTasks failed:', err);
        }
    }
    await rolloverTasks();

    const colors = [
        { code: '#E8D9C5' }, { code: '#CDB89C' }, { code: '#A98D72' }, { code: '#795C47' }, { code: '#493327' }
    ];

    container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
      <div style="display:flex; gap:8px; align-items:center;">
        <button id="btn-go-today" class="btn" style="font-size:12px; padding:4px 8px; display:none; background:var(--card-secondary);">برگشت به امروز</button>
        <h2 id="tasks-header-title" style="font-size: 18px;">کارهای امروز</h2>
      </div>
      <button id="btn-history" class="btn" style="font-size: 12px; padding: 6px 12px;">📅 تاریخچه</button>
    </div>

    <div class="card" style="display:flex; flex-direction:column; gap:12px;">
      <input type="text" id="task-title" class="input" placeholder="عنوان کار جدید..." style="width:100%;">
      
      <div style="display:flex; gap:8px; align-items:center;">
        <select id="task-priority" class="input" style="flex:1; padding:8px;">
          <option value="low">اولویت: پایین</option>
          <option value="medium" selected>اولویت: متوسط</option>
          <option value="high">اولویت: بالا</option>
        </select>
        
        <!-- دکمه تقویم شمسی -->
        <button id="btn-pick-date" class="input" style="flex:1; padding:8px; text-align:center; display:flex; justify-content:center; align-items:center; gap:6px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span id="display-task-date">${formatJalali(today)}</span>
        </button>
        
        <div style="display:flex; gap:6px;" id="color-picker">
          ${colors.map((c, index) => `
            <div class="color-option" data-color="${c.code}" style="width:24px; height:24px; border-radius:50%; background:${c.code}; cursor:pointer; border: 2px solid ${index === 1 ? '#F5F5F5' : 'transparent'};"></div>
          `).join('')}
        </div>
      </div>
      <button id="btn-add-task" class="btn btn--primary" style="width:100%;">افزودن کار</button>
    </div>
    
    <div class="card">
      <div class="card__title" style="display:flex; justify-content:space-between;">
        <span>پیشرفت کارها</span>
        <span id="task-progress-text" style="color:var(--accent);">۰ از ۰</span>
      </div>
      <div class="progress" style="margin-bottom: 16px;">
        <div class="progress__fill" id="task-progress-bar" style="width: 0%;"></div>
      </div>
      <div id="tasks-list"></div>
    </div>
  `;

    let selectedColor = '#CDB89C';
    let selectedDate = today; // تاریخ انتخابی برای ثبت کار جدید

    document.querySelectorAll('.color-option').forEach(el => {
        el.onclick = () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.style.border = '2px solid transparent');
            el.style.border = '2px solid #F5F5F5';
            selectedColor = el.getAttribute('data-color');
        };
    });

    // 📅 باز کردن مودال تقویم شمسی
    document.getElementById('btn-pick-date').onclick = () => {
        // تبدیل تاریخ فعال به اجزای شمسی
        const jDate = J.toJalaali(new Date(activeDate + 'T00:00:00'));
        let currentJYear = jDate.jy;
        let currentJMonth = jDate.jm;

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'card';
        modalContent.style.cssText = 'width: 100%; max-width: 350px; padding: 20px; animation: slideUp 0.3s ease;';
        modal.appendChild(modalContent);

        function renderCalendar() {
            const daysInMonth = J.jalaaliMonthLength(currentJYear, currentJMonth);
            const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
            const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

            const firstDayG = J.toGregorian(currentJYear, currentJMonth, 1);
            const firstDayDate = new Date(firstDayG.gy, firstDayG.gm - 1, firstDayG.gd);
            const offset = (firstDayDate.getDay() + 1) % 7; 

            let daysHtml = '';
            for (let i = 0; i < offset; i++) daysHtml += `<div></div>`;
            
            for (let d = 1; d <= daysInMonth; d++) {
                const gDate = J.toGregorian(currentJYear, currentJMonth, d);
                const isoDate = `${gDate.gy}-${String(gDate.gm).padStart(2, '0')}-${String(gDate.gd).padStart(2, '0')}`;
                const isSelected = isoDate === activeDate;
                
                daysHtml += `
                    <div class="cal-day" data-date="${isoDate}" style="padding: 8px 0; text-align: center; cursor: pointer; border-radius: 8px; font-size: 14px; ${isSelected ? 'background: var(--accent); color: var(--bg-main); font-weight: bold;' : 'color: var(--text-main);'}">
                        ${toFa(d)}
                    </div>
                `;
            }

            modalContent.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <button id="cal-prev" class="btn" style="padding: 4px 8px;">›</button>
                    <h3 style="font-size: 16px; margin: 0;">${monthNames[currentJMonth - 1]} ${toFa(currentJYear)}</h3>
                    <button id="cal-next" class="btn" style="padding: 4px 8px;">‹</button>
                </div>
                <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center; margin-bottom:8px;">
                    ${weekDays.map(d => `<div style="color:var(--text-muted); font-size:12px;">${d}</div>`).join('')}
                </div>
                <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px;">
                    ${daysHtml}
                </div>
                <div style="margin-top: 16px; text-align: center;">
                    <button id="cal-cancel" class="btn" style="width: 100%;">انصراف</button>
                </div>
            `;

            // مدیریت کلیک روی روزها
            modalContent.querySelectorAll('.cal-day').forEach(el => {
                el.onclick = () => {
                    const clickedDate = el.getAttribute('data-date');
                    selectedDate = clickedDate;
                    activeDate = clickedDate; // تغییر تاریخ فعال برای نمایش لیست
                    
                    document.getElementById('display-task-date').innerText = formatJalali(clickedDate);
                    loadTasks(); // آپدیت لیست کارها
                    modal.remove();
                };
            });

            document.getElementById('cal-prev').onclick = () => {
                if (currentJMonth === 1) { currentJMonth = 12; currentJYear--; }
                else currentJMonth--;
                renderCalendar();
            };
            document.getElementById('cal-next').onclick = () => {
                if (currentJMonth === 12) { currentJMonth = 1; currentJYear++; }
                else currentJMonth++;
                renderCalendar();
            };
            document.getElementById('cal-cancel').onclick = () => modal.remove();
        }

        document.body.appendChild(modal);
        renderCalendar();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };

    // دکمه بازگشت به امروز
    document.getElementById('btn-go-today').onclick = () => {
        activeDate = today;
        selectedDate = today;
        document.getElementById('display-task-date').innerText = formatJalali(today);
        loadTasks();
    };

    async function loadTasks() {
        // تغییر عنوان هدر
        const titleEl = document.getElementById('tasks-header-title');
        const backToTodayBtn = document.getElementById('btn-go-today');
        
        if (activeDate === today) {
            titleEl.innerText = 'کارهای امروز';
            backToTodayBtn.style.display = 'none';
        } else {
            titleEl.innerText = `کارهای ${formatJalali(activeDate)}`;
            backToTodayBtn.style.display = 'block';
        }

        // لود تسک‌های تاریخ فعال که انجام نشدن
        // ✅ گرفتن تاریخ لحظه‌ای برای اینکه اگه نیمه‌شب شد، تشخیص بده
        const currentToday = todayISO(); 
        const tasks = await db.tasks.where('taskDate').equals(activeDate === today ? currentToday : activeDate).filter(t => !t.isCompleted).toArray();
        
        const priorityMap = { high: 1, medium: 2, low: 3 };
        tasks.sort((a, b) => {
            return (priorityMap[a.priority] || 2) - (priorityMap[b.priority] || 2);
        });

        const listEl = document.getElementById('tasks-list');
        const progressText = document.getElementById('task-progress-text');
        const progressBar = document.getElementById('task-progress-bar');

        const total = tasks.length;
        
        // برای محاسبه درصد، کارهای انجام شده در این تاریخ رو هم می‌گیریم
        const allTasksForDate = await db.tasks.where('taskDate').equals(activeDate).toArray();
        const completed = allTasksForDate.filter(t => t.isCompleted).length;
        
        const totalForProgress = allTasksForDate.length;
        const percent = totalForProgress === 0 ? 0 : Math.round((completed / totalForProgress) * 100);

        progressText.innerText = `${toFa(completed)} از ${toFa(totalForProgress)}`;
        progressBar.style.width = `${percent}%`;

        if (total === 0) {
            listEl.innerHTML = `<div class="empty">کاری برای این روز ثبت نشده است.</div>`;
            return;
        }

        listEl.innerHTML = '';
        tasks.forEach((task, taskIndex) => {
            const item = document.createElement('div');
            item.className = 'list-item-animate';
            item.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--divider);';
            item.style.animationDelay = `${taskIndex * 0.05}s`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; 
            checkbox.checked = task.isCompleted; 
            checkbox.style.cssText = 'width:20px; height:20px; accent-color:var(--accent);';
            
            checkbox.onchange = async () => { 
                const completedDate = checkbox.checked ? today : null;
                await db.tasks.update(task.id, { isCompleted: checkbox.checked, completedDate }); 
                if(checkbox.checked) showToast('آفرین! یک کار دیگه انجام شد. 🎉', 'success');
                loadTasks(); 
            };
            
            const title = document.createElement('span');
            title.innerText = task.title; title.style.flex = '1';
            if (task.isCompleted) { title.style.textDecoration = 'line-through'; title.style.color = 'var(--text-muted)'; }

            const colorBar = document.createElement('div');
            colorBar.style.cssText = `width:4px; height:24px; border-radius:2px; background:${sanitizeColor(task.color)};`;

            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = 'display:flex; gap:4px;';
            
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-icon';
            btnEdit.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            btnEdit.onclick = () => openEditModal(task);

            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-icon delete';
            btnDelete.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            btnDelete.onclick = async () => { if (confirm('حذف شود؟')) { await db.tasks.delete(task.id); loadTasks(); } };

            actionsDiv.append(btnEdit, btnDelete);
            item.append(checkbox, title, colorBar, actionsDiv);
            listEl.appendChild(item);
        });
    }

    function openEditModal(task) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);';
        modal.innerHTML = `
          <div class="card" style="width: 100%; max-width: 400px; padding: 20px; animation: slideUp 0.3s ease;">
            <h3 style="margin-bottom: 16px;">ویرایش کار</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
             <input type="text" id="edit-task-title" class="input" value="${escapeHTML(task.title)}">
              <select id="edit-task-priority" class="input" style="padding:8px;">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>اولویت: پایین</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>اولویت: متوسط</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>اولویت: بالا</option>
              </select>
              <div style="display:flex; gap:8px; margin-top: 8px;">
                <button id="btn-save-edit" class="btn btn--primary" style="flex:1;">ذخیره</button>
                <button id="btn-cancel-edit" class="btn" style="flex:1;">انصراف</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-cancel-edit').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        document.getElementById('btn-save-edit').onclick = async () => {
            const newTitle = document.getElementById('edit-task-title').value.trim();
            const newPriority = document.getElementById('edit-task-priority').value;
            if (!newTitle) return showToast('عنوان نمی‌تواند خالی باشد', 'error');
            await db.tasks.update(task.id, { title: newTitle, priority: newPriority });
            modal.remove();
            loadTasks();
        };
    }

        // ثبت کار جدید (با محاسبه لحظه‌ای تاریخ و جلوگیری از ثبت تکراری)
    document.getElementById('btn-add-task').onclick = async (e) => {
        const btn = e.currentTarget;
        
        // ✅ جلوگیری از کلیک تکراری: اگه دکمه در حال پردازشه، هیچ کاری نکن
        if (btn.disabled) return;

        const title = document.getElementById('task-title').value.trim();
        const priority = document.getElementById('task-priority').value;
        
        // ✅ محاسبه لحظه‌ای تاریخ (حل مشکل نیمه‌شب)
        const nowToday = todayISO();
        const currentActiveDate = activeDate === today ? nowToday : activeDate; 

        if (!title) return showToast('عنوان کار رو بنویس!', 'error');
        
        // غیرفعال کردن دکمه برای جلوگیری از ثبت تکراری
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = 'در حال ذخیره...';

        try {
            await db.tasks.add({ 
                title, 
                taskDate: currentActiveDate, 
                isCompleted: false, 
                priority, 
                color: selectedColor,
                completedDate: null
            });

            document.getElementById('task-title').value = ''; 
            showToast('کار جدید اضافه شد.', 'success');
            
            // اگر تاریخ فعال امروز بود، لیست رو رفرش کن
            if (activeDate === today) {
                await loadTasks(); 
            }
        } catch (err) {
            console.error(err);
            showToast('خطا در ذخیره کار.', 'error');
        } finally {
            // ✅ در هر شرایطی (موفق یا ناموفق)، دکمه رو دوباره فعال کن
            btn.disabled = false;
            btn.innerText = originalText;
        }
    };

    document.getElementById('task-title').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-add-task').click();
    });

    // مودال تاریخچه
    document.getElementById('btn-history').onclick = async () => {
        const allTasks = await db.tasks.toArray();
        const past = allTasks
            .filter(t => t.taskDate < today || t.isCompleted)
            .sort((a, b) => b.taskDate.localeCompare(a.taskDate));

        let itemsHtml = past.length === 0 
            ? '<div class="empty" style="padding: 20px;">تاریخچه‌ای وجود ندارد.</div>' 
            : past.map(t => `
                <div style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--divider);">
                    <div style="width:4px; height:24px; border-radius:2px; background:${t.color || 'var(--accent)'};"></div>
                    <div style="flex:1;">
                        <div style="font-weight:500; ${t.isCompleted ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHTML(t.title)}</div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                            ${formatJalali(t.taskDate)} 
                            ${t.isCompleted ? '· <span style="color:var(--success)">✅ انجام شده</span>' : '· <span style="color:var(--accent)">⏳ در انتظار</span>'}
                        </div>
                    </div>
                </div>
            `).join('');

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);';
        
        modal.innerHTML = `
          <div class="card" style="width: 100%; max-width: 400px; padding: 20px; animation: slideUp 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom: 1px solid var(--divider); padding-bottom: 12px;">
                <h3 style="font-size:16px; margin:0;">📅 تاریخچه کارها</h3>
                <button id="btn-close-history" class="btn" style="padding:6px 12px; font-size: 12px;">بستن</button>
            </div>
            <div style="max-height: 60vh; overflow-y: auto; padding-left: 4px;">${itemsHtml}</div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-close-history').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };

    // گوش دادن به رویداد "رفتن به تسک" از صفحه خانه
    document.addEventListener('go-to-task', (e) => {
        const taskDate = e.detail.date;
        activeDate = taskDate; // تاریخ فعال رو تغییر بده
        selectedDate = taskDate;
        
        // آپدیت عنوان و دکمه‌ها
        document.getElementById('display-task-date').innerText = formatJalali(taskDate);
        loadTasks();
    }, { once: true }); // این listener فقط یک بار اجرا بشه

    loadTasks();
}