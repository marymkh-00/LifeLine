// js/pages/more.js
import { todayISO, formatJalali } from 'jalali';
import { escapeHTML, showToast } from 'utils';
import db from 'db';

export default function renderMore(container) {
    const icons = {
        mood: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        goals: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
        lists: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
        backup: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`
    };

    container.innerHTML = `
    <div class="card" id="more-menu" style="display: flex; flex-direction: column; gap: 12px;">
      <div class="card__title">بخش‌های بیشتر</div>
      <button id="btn-mood" class="btn" style="text-align: right; padding: 16px; display:flex; align-items:center; gap:12px; background: var(--card-secondary);"><span style="color: var(--accent);">${icons.mood}</span><span style="flex:1;">حال روزانه (Mood)</span><span style="color: var(--text-muted);">›</span></button>
      <button id="btn-goals" class="btn" style="text-align: right; padding: 16px; display:flex; align-items:center; gap:12px; background: var(--card-secondary);"><span style="color: var(--accent);">${icons.goals}</span><span style="flex:1;">اهداف (Goals)</span><span style="color: var(--text-muted);">›</span></button>
      <button id="btn-lists" class="btn" style="text-align: right; padding: 16px; display:flex; align-items:center; gap:12px; background: var(--card-secondary);"><span style="color: var(--accent);">${icons.lists}</span><span style="flex:1;">فهرست‌ها (Lists)</span><span style="color: var(--text-muted);">›</span></button>
      <button id="btn-backup" class="btn" style="text-align: right; padding: 16px; display:flex; align-items:center; gap:12px; background: var(--card-secondary); border: 1px solid var(--divider);"><span style="color: var(--accent);">${icons.backup}</span><span style="flex:1;">پشتیبان‌گیری و بازیابی</span><span style="color: var(--text-muted);">›</span></button>
    </div>
     <!-- دکمه جدید تنظیمات و ریست -->
      <button id="btn-settings" class="btn" style="text-align: right; padding: 16px; display:flex; align-items:center; gap:12px; background: var(--card-secondary); border: 1px solid var(--divider);"><span style="color: var(--accent);">⚙️</span><span style="flex:1;">تنظیمات برنامه</span><span style="color: var(--text-muted);">›</span></button>
    </div>
    <div id="sub-section" style="display: none;"></div> `;

    const menu = document.getElementById('more-menu');
    const subSection = document.getElementById('sub-section');

    // In more.js
    async function showSubSection(renderFunc) {
        menu.style.display = 'none';
        subSection.style.display = 'block';
        subSection.innerHTML = '';
        // Add await here
        await renderFunc(subSection);
    }

    function goBack() {
        menu.style.display = 'flex';
        subSection.style.display = 'none';
        subSection.innerHTML = '';
    }

    // --- Mood ---
    document.getElementById('btn-mood').onclick = async() => {
            const today = todayISO();
            const existingMood = await db.dailyMoods.where({ date: today }).first();
            const moods = [{ id: 'great', label: 'عالی' }, { id: 'good', label: 'خوب' }, { id: 'ok', label: 'معمولی' }, { id: 'bad', label: 'ناراحت' }, { id: 'tired', label: 'خسته' }];

            showSubSection((el) => {
                        el.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:16px;"><h3>حال امروز</h3><button id="back-mood" class="btn">بازگشت</button></div>
                <div class="card" style="text-align:center; padding:24px 16px;">
                    <div style="display:flex; justify-content:space-around; margin: 20px 0;">
                        ${moods.map(m => `<button class="mood-btn btn" data-id="${m.id}" style="padding:10px; border-radius:12px; opacity: ${existingMood?.mood === m.id ? 1 : 0.5};">${m.label}</button>`).join('')}
                    </div>
                    <input type="text" id="mood-desc" class="input" placeholder="توضیحات..." value="${existingMood ? existingMood.description : ''}">
                    <button id="save-mood" class="btn btn--primary" style="width:100%; margin-top:16px;">ذخیره</button>
                </div>
            `;
            document.getElementById('back-mood').onclick = goBack;
            let selected = existingMood ? existingMood.mood : null;
            
            el.querySelectorAll('.mood-btn').forEach(btn => {
                btn.onclick = () => {
                    el.querySelectorAll('.mood-btn').forEach(b => b.style.opacity = '0.5');
                    btn.style.opacity = '1';
                    selected = btn.dataset.id;
                };
            });

            document.getElementById('save-mood').onclick = async () => {
                if (!selected) return showToast('یک حالت انتخاب کن', 'error');
                const desc = document.getElementById('mood-desc').value.trim();
                if (existingMood) await db.dailyMoods.update(existingMood.id, { mood: selected, description: desc });
                else await db.dailyMoods.add({ date: today, mood: selected, description: desc });
                showToast('ذخیره شد!', 'success');
                goBack();
            };
        });
    };

       // --- Goals ---
    document.getElementById('btn-goals').onclick = async () => {
        showSubSection(async (el) => {
            const goals = await db.goals.toArray();
            
            // عنوان‌ها و رنگ‌های مربوط به هر دسته
            const categories = {
                weekly: { title: 'اهداف هفتگی', color: '#4ade80' }, // سبز
                monthly: { title: 'اهداف ماهانه', color: '#60a5fa' }, // آبی
                yearly: { title: 'اهداف سالانه', color: '#D4B895' } // طلایی تم اپ
            };

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:16px; align-items:center;">
                    <h3>اهداف من</h3>
                    <button id="back-goals" class="btn" style="padding:4px 10px;">بازگشت</button>
                </div>
                
                <!-- فرم افزودن هدف -->
                <div class="card" style="display:flex; flex-direction:column; gap:12px; margin-bottom: 24px;">
                    <input type="text" id="goal-title" class="input" placeholder="عنوان هدف جدید...">
                    <select id="goal-timeframe" class="input" style="padding:10px;">
                        <option value="weekly">📅 هفتگی</option>
                        <option value="monthly" selected>📆 ماهانه</option>
                        <option value="yearly">🗓️ سالانه</option>
                    </select>
                    <button id="add-goal" class="btn btn--primary">افزودن هدف</button>
                </div>

                <!-- ظرف نگه‌داری لیست اهداف -->
                <div id="goals-lists-container" style="display:flex; flex-direction:column; gap: 24px;"></div>
            `;

            document.getElementById('back-goals').onclick = goBack;

            // تابع برای رفرش کردن لیست‌ها
            async function renderGoalsLists() {
                const currentGoals = await db.goals.toArray();
                const container = document.getElementById('goals-lists-container');
                container.innerHTML = '';

                // رندر کردن هر دسته به صورت جداگانه
                Object.keys(categories).forEach(timeframe => {
                    // فیلتر کردن اهداف بر اساس نوع
                    const filtered = currentGoals.filter(g => g.timeframe === timeframe || (!g.timeframe && timeframe === 'monthly'));
                    
                    const section = document.createElement('div');
                    
                    // عنوان دسته
                    section.innerHTML = `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px;">
                            <div style="width:12px; height:12px; border-radius:50%; background:${categories[timeframe].color};"></div>
                            <h4 style="font-size:14px; font-weight:600; color:var(--text-main); margin:0;">${categories[timeframe].title}</h4>
                        </div>
                        <div class="goals-group-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                    `;

                    const listGroup = section.querySelector('.goals-group-list');

                    if (filtered.length === 0) {
                        listGroup.innerHTML = `<div class="empty" style="padding: 12px; font-size: 13px;">هدفی در این بخش ندارید.</div>`;
                    } else {
                        filtered.forEach(goal => {
                            const isDone = goal.isCompleted || false;
                            const item = document.createElement('div');
                            item.className = 'card';
                            item.style.cssText = `padding: 12px; margin-bottom: 0; display:flex; align-items:center; gap:12px; border-left: 3px solid ${isDone ? 'var(--text-muted)' : categories[timeframe].color}; opacity: ${isDone ? '0.6' : '1'};`;
                            
                            item.innerHTML = `
                                <input type="checkbox" class="goal-checkbox" data-id="${goal.id}" ${isDone ? 'checked' : ''} style="width:18px; height:18px; accent-color:${categories[timeframe].color}; cursor:pointer;">
                                <span style="flex:1; font-size:14px; ${isDone ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHTML(goal.title)}</span>
                                <button class="del-goal btn-icon delete" data-id="${goal.id}" style="color:#ff6b6b; width:28px; height:28px;">✕</button>
                            `;
                            listGroup.appendChild(item);
                        });
                    }
                    container.appendChild(section);
                });

                // افزودن رویدادها به چک‌باکس‌ها و دکمه‌های حذف
                container.querySelectorAll('.goal-checkbox').forEach(cb => {
                    cb.onchange = async (e) => {
                        await db.goals.update(Number(cb.dataset.id), { isCompleted: e.target.checked });
                        if(e.target.checked) showToast('آفرین! هدفت تیک خورد. 🎉', 'success');
                        renderGoalsLists(); // فقط لیست رو رفرش میکنیم
                    };
                });

                container.querySelectorAll('.del-goal').forEach(btn => {
                    btn.onclick = async () => {
                        if (confirm('این هدف حذف شود؟')) {
                            await db.goals.delete(Number(btn.dataset.id));
                            showToast('حذف شد.', 'success');
                            renderGoalsLists();
                        }
                    };
                });
            }

            // دکمه افزودن
            document.getElementById('add-goal').onclick = async () => {
                const title = document.getElementById('goal-title').value.trim();
                const timeframe = document.getElementById('goal-timeframe').value;

                if (!title) return showToast('عنوان هدف را وارد کنید.', 'error');

                await db.goals.add({ 
                    title, 
                    timeframe, 
                    isCompleted: false 
                });
                
                document.getElementById('goal-title').value = '';
                showToast('هدف جدید ثبت شد.', 'success');
                renderGoalsLists(); // رفرش لیست‌ها
            };

            // اولین بار که صفحه باز میشه، لیست‌ها رندر شن
            renderGoalsLists();
        });
    };

       // --- Lists ---
    document.getElementById('btn-lists').onclick = async () => {
        showSubSection(async (el) => {
            const lists = await db.shoppingLists.toArray();
            
            // نام‌های فارسی برای هر لیست
            const listNames = { needs: 'نیازها', wants: 'خواسته‌ها', interests: 'علایق' };

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:16px; align-items:center;">
                    <h3>فهرست‌های خرید</h3>
                    <button id="back-lists" class="btn" style="padding:4px 10px;">بازگشت</button>
                </div>
                
                <!-- دکمه‌های سه‌گانه برای دسته‌بندی -->
                <div id="list-tabs-container" style="display:flex; gap:8px; margin-bottom:16px;">
                    ${lists.map((l, index) => `
                        <button class="list-tab btn" data-id="${l.id}" style="flex:1; ${index === 0 ? 'background:var(--accent); color:var(--bg-main); font-weight:bold;' : 'background:var(--card-secondary);'}">
                            ${listNames[l.type] || 'لیست'}
                        </button>
                    `).join('')}
                </div>

                <!-- فرم افزودن آیتم -->
                <div class="card" style="display:flex; gap:8px; margin-bottom:16px;">
                    <input type="text" id="item-title" class="input" placeholder="آیتم جدید...">
                    <button id="add-item" class="btn btn--primary">افزودن</button>
                </div>
                
                <div class="card"><div id="items-list"></div></div>
            `;

            document.getElementById('back-lists').onclick = goBack;
            
            let currentListId = lists.length > 0 ? lists[0].id : null;

            // مدیریت کلیک روی دکمه‌های بالای لیست
            el.querySelectorAll('.list-tab').forEach(tab => {
                tab.onclick = () => {
                    // تغییر استایل دکمه فعال
                    el.querySelectorAll('.list-tab').forEach(t => {
                        t.style.background = 'var(--card-secondary)';
                        t.style.color = 'var(--text-main)';
                        t.style.fontWeight = 'normal';
                    });
                    tab.style.background = 'var(--accent)';
                    tab.style.color = 'var(--bg-main)';
                    tab.style.fontWeight = 'bold';

                    currentListId = Number(tab.dataset.id);
                    loadItems();
                };
            });

            // تابع لود آیتم‌ها
            async function loadItems() {
                if (!currentListId) return;
                const items = await db.shoppingItems.where({ listId: currentListId }).toArray();
                const listEl = document.getElementById('items-list');
                
                if (items.length === 0) { 
                    listEl.innerHTML = '<div class="empty" style="padding: 16px;">این لیست خالی است.</div>'; 
                    return; 
                }
                
                listEl.innerHTML = items.map(i => `
                    <div style="display:flex; align-items:center; padding:12px 0; border-bottom:1px solid var(--divider);">
                        <input type="checkbox" ${i.isPurchased ? 'checked' : ''} class="item-cb" data-id="${i.id}" style="width:20px; height:20px; accent-color:var(--accent); cursor:pointer;">
                        <span style="flex:1; margin-right:8px; font-size:14px; ${i.isPurchased ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHTML(i.title)}</span>
                        <button class="del-item btn-icon delete" data-id="${i.id}" style="color:#ff6b6b; width:32px; height:32px;">✕</button>
                    </div>
                `).join('');

                // تیک زدن (خریداری شده)
                listEl.querySelectorAll('.item-cb').forEach(cb => {
                    cb.onchange = async (e) => { 
                        await db.shoppingItems.update(Number(cb.dataset.id), { isPurchased: e.target.checked }); 
                        loadItems(); 
                    };
                });

                // حذف آیتم
                listEl.querySelectorAll('.del-item').forEach(btn => {
                    btn.onclick = async () => { 
                        await db.shoppingItems.delete(Number(btn.dataset.id)); 
                        loadItems(); 
                    };
                });
            }

            // افزودن آیتم جدید
            document.getElementById('add-item').onclick = async () => {
                const title = document.getElementById('item-title').value.trim();
                if (!title || !currentListId) return;
                await db.shoppingItems.add({ listId: currentListId, title, isPurchased: false });
                document.getElementById('item-title').value = '';
                showToast('آیتم اضافه شد.', 'success');
                loadItems();
            };

            // لود اولیه
            loadItems();
        });
    };
    
    // --- Backup ---
    document.getElementById('btn-backup').onclick = async () => {
        showSubSection((el) => {
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:16px;"><h3>پشتیبان‌گیری</h3><button id="back-backup" class="btn">بازگشت</button></div>
                <div class="card" style="text-align:center; padding:24px;">
                    <p style="color:var(--text-muted); font-size:14px; margin-bottom:24px;">اطلاعات خود را ذخیره یا بازیابی کنید.</p>
                    <button id="btn-export" class="btn btn--primary" style="width:100%; margin-bottom:12px;">📥 دانلود پشتیبان</button>
                    <label for="file-import" class="btn" style="width:100%; display:inline-block; cursor:pointer;">📤 بازیابی از فایل</label>
                    <input type="file" id="file-import" accept=".json" style="display:none;">
                </div>
            `;
            document.getElementById('back-backup').onclick = goBack;
            
            document.getElementById('btn-export').onclick = async () => {
                const tables = ['tasks', 'taskTransfers', 'events', 'goals', 'expenseCategories', 'expenses', 'categoryBudgets', 'balanceAdjustments', 'shoppingLists', 'shoppingItems', 'dailyMoods', 'debts'];
                const data = { app: 'LifeLine', version: 2, createdAt: new Date().toISOString() };
                for (let t of tables) data[t] = await db[t].toArray();
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `LifeLine-Backup.json`; link.click();
                showToast('پشتیبان دانلود شد.', 'success');
            };

            document.getElementById('file-import').onchange = async (e) => {
                const file = e.target.files[0]; if (!file) return;
                const data = JSON.parse(await file.text());
                if (data.app !== 'LifeLine') return showToast('فایل معتبر نیست', 'error');
                
                if (confirm('اطلاعات فعلی جایگزین می‌شود. مطمئنید؟')) {
                    const tables = ['tasks', 'taskTransfers', 'events', 'goals', 'expenseCategories', 'expenses', 'categoryBudgets', 'balanceAdjustments', 'shoppingLists', 'shoppingItems', 'dailyMoods', 'debts'];
                    await db.transaction('rw', tables.map(t => db[t]), async () => {
                        for (let t of tables) {
                            if (!Array.isArray(data[t])) continue;
                            await db[t].clear();
                            await db[t].bulkAdd(data[t]);
                        }
                    });
                    showToast('بازیابی شد!', 'success');
                    setTimeout(() => location.reload(), 1000);
                }
            };
        });
    };
    // --- Settings (تنظیمات) ---
    document.getElementById('btn-settings').onclick = () => {
        showSubSection((el) => {
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
                    <h3>تنظیمات</h3>
                    <button id="back-settings" class="btn">بازگشت</button>
                </div>
                <div class="card" style="text-align:center; padding:24px;">
                    <p style="color:var(--text-muted); font-size:13px; margin-bottom:16px;">در این بخش می‌توانید اطلاعات برنامه را بازنشانی کنید.</p>
                    
                    <button id="btn-clear-data" class="btn" style="width:100%; color:#ff6b6b; background:rgba(255,107,107,0.1); border:1px solid rgba(255,107,107,0.3); font-weight:bold;">
                        🗑️ پاک کردن کل اطلاعات (Reset)
                    </button>
                </div>
            `;
            document.getElementById('back-settings').onclick = goBack;

            // عملیات ریست
            document.getElementById('btn-clear-data').onclick = () => {
                const modal = document.createElement('div');
                modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; backdrop-filter: blur(4px);';
                modal.innerHTML = `
                    <div class="card" style="width:100%; max-width:400px; padding:24px; text-align:center; border: 1px solid rgba(255,107,107,0.3);">
                        <div style="font-size:40px; margin-bottom:16px;">⚠️</div>
                        <h3 style="color:#ff6b6b; margin-bottom:12px;">هشدار!</h3>
                        <p style="font-size:14px; color:var(--text-muted); margin-bottom:24px; line-height:1.6;">
                            با این کار تمام کارها، هزینه‌ها، اهداف و اطلاعات شما <b style="color:var(--text-main)">برای همیشه پاک</b> می‌شوند.<br>
                            آیا از این کار مطمئن هستید؟
                        </p>
                        <div style="display:flex; gap:8px;">
                            <button id="btn-confirm-reset" class="btn" style="flex:1; background:#ff6b6b; color:#121212; font-weight:bold;">بله، پاک کن</button>
                            <button id="btn-cancel-reset" class="btn" style="flex:1; background:transparent; border:1px solid var(--divider);">انصراف</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                document.getElementById('btn-cancel-reset').onclick = () => modal.remove();
                
                document.getElementById('btn-confirm-reset').onclick = async () => {
                    // پاک کردن تمام جداول دیتابیس
                    const tables = ['tasks', 'taskTransfers', 'events', 'goals', 'expenseCategories', 'expenses', 'categoryBudgets', 'balanceAdjustments', 'shoppingLists', 'shoppingItems', 'dailyMoods', 'debts'];
                    
                    await db.transaction('rw', tables.map(t => db[t]), async () => {
                        for (let t of tables) {
                            await db[t].clear();
                        }
                    });

                    modal.remove();
                    showToast('تمام اطلاعات پاک شد.', 'success');
                    
                    // ریفرش کردن کل صفحه بعد از 1.5 ثانیه
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                };
            };
        });
    };
  }