// js/pages/calendar.js
import db from 'db';
import { todayISO, formatJalali, toFa } from 'jalali';
import { escapeHTML } from 'utils';

const j = window.jalaali;

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export default async function renderCalendar(container) {
    const colors = [
        { name: 'Cream', code: '#E8D9C5' },
        { name: 'Sand', code: '#CDB89C' },
        { name: 'Taupe', code: '#A98D72' },
        { name: 'Mocha', code: '#795C47' },
        { name: 'Dark Brown', code: '#493327' }
    ];

    let todayObj = j.toJalaali(new Date());
    let currentJYear = todayObj.jy;
    let currentJMonth = todayObj.jm;
    let selectedDate = todayISO();
    let selectedColor = '#CDB89C';

    container.innerHTML = `
    <div id="calendar-container" style="margin-bottom: 16px;"></div>
    <div class="card">
      <div class="card__title">رویدادهای این روز</div>
      <div id="events-list"></div>
    </div>
    <div class="card">
      <div class="card__title">افزودن رویداد جدید</div>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
        <input type="text" id="event-title" class="input" placeholder="عنوان رویداد..."><textarea id="event-desc" placeholder="توضیحات (اختیاری)..." rows="3" style="width:100%; background:var(--card-secondary); border:1px solid var(--divider); border-radius:var(--radius-sm); padding:var(--space-sm) var(--space-md); color:var(--text-main); font-family:inherit; font-size:14px; resize:vertical;"></textarea>
        <div style="display:flex; gap:8px; align-items:center; justify-content:center;">
          ${colors.map((c, index) => `
            <div class="color-option" data-color="${c.code}" style="width:28px; height:28px; border-radius:50%; background:${c.code}; cursor:pointer; border: 2px solid ${index === 1 ? '#F5F5F5' : 'transparent'};"></div>
          `).join('')}
        </div>
        <button id="btn-add-event" class="btn btn--primary">افزودن رویداد</button>
      </div>
    </div>
  `;

  document.querySelectorAll('.color-option').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.color-option').forEach(opt => opt.style.border = '2px solid transparent');
      el.style.border = '2px solid #F5F5F5';
      selectedColor = el.getAttribute('data-color');
    };
  });

  function toISO(jy, jm, jd) {
    const g = j.toGregorian(jy, jm, jd);
    return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
  }

  function getJalaliWeekday(jy, jm, jd) {
    const g = j.toGregorian(jy, jm, jd);
    const d = new Date(g.gy, g.gm - 1, g.gd);
    const jsDay = d.getDay(); 
    return (jsDay + 1) % 7; 
  }

  async function loadCalendar() {
    const calContainer = document.getElementById('calendar-container');
    const daysInMonth = j.jalaaliMonthLength(currentJYear, currentJMonth);
    
    const startDate = toISO(currentJYear, currentJMonth, 1);
    const endDate = toISO(currentJYear, currentJMonth, daysInMonth);
    
    const events = await db.events
      .filter(e => e.eventDate >= startDate && e.eventDate <= endDate)
      .toArray();

    const eventsMap = {};
    events.forEach(e => {
      if (!eventsMap[e.eventDate]) eventsMap[e.eventDate] = [];
      eventsMap[e.eventDate].push(e);
    });

    let html = `
      <div class="card" style="padding: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <button id="prev-month" class="btn" style="padding:4px 8px;">›</button>
          <h3 style="font-size:16px;">${MONTHS[currentJMonth - 1]} ${toFa(currentJYear)}</h3>
          <button id="next-month" class="btn" style="padding:4px 8px;">‹</button>
        </div>
        <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center; margin-bottom:8px;">
          ${WEEKDAYS_SHORT.map(d => `<div style="color:var(--text-muted); font-size:12px;">${d}</div>`).join('')}
        </div>
        <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center;">
    `;

    const offset = getJalaliWeekday(currentJYear, currentJMonth, 1);
    for (let i = 0; i < offset; i++) {
      html += `<div></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateISO = toISO(currentJYear, currentJMonth, d);
      const hasEvent = eventsMap[dateISO] && eventsMap[dateISO].length > 0;
      const isToday = dateISO === todayISO();
      const isSelected = dateISO === selectedDate;
      
      let bgColor = isSelected ? 'var(--card-secondary)' : 'transparent';
      let textColor = isSelected ? 'var(--accent)' : 'var(--text-main)';
      let border = isSelected ? '1px solid var(--accent)' : '1px solid transparent';

      if (isToday && !isSelected) {
        textColor = 'var(--accent)';
        border = '1px solid var(--accent)';
      }
      
      const eventDots = hasEvent ? `<div style="display:flex; justify-content:center; gap:2px; margin-top:2px; height:4px;">
        ${eventsMap[dateISO].slice(0,3).map(e => `<div style="width:4px; height:4px; border-radius:50%; background:${e.color};"></div>`).join('')}
      </div>` : '<div style="height:4px;"></div>';

      html += `
        <div class="calendar-day" data-date="${dateISO}" style="cursor:pointer; padding:6px 2px; border-radius:8px; background:${bgColor}; color:${textColor}; border:${border};">
          <div style="font-size:14px;">${toFa(d)}</div>
          ${eventDots}
        </div>
      `;
    }

    html += `</div></div>`;
    calContainer.innerHTML = html;

    document.getElementById('prev-month').onclick = () => {
      if (currentJMonth === 1) { currentJMonth = 12; currentJYear--; }
      else { currentJMonth--; }
      loadCalendar();
    };

    document.getElementById('next-month').onclick = () => {
      if (currentJMonth === 12) { currentJMonth = 1; currentJYear++; }
      else { currentJMonth++; }
      loadCalendar();
    };

    document.querySelectorAll('.calendar-day').forEach(el => {
      el.onclick = () => {
        selectedDate = el.getAttribute('data-date');
        loadCalendar();
        loadEvents();
      };
    });
  }

  async function loadEvents() {
    const events = await db.events.where({ eventDate: selectedDate }).toArray();
    const listEl = document.getElementById('events-list');
    
    if (events.length === 0) {
      listEl.innerHTML = `<div class="empty">رویدادی برای این روز ثبت نشده است.</div>`;
      return;
    }

    listEl.innerHTML = '';
    events.forEach(ev => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '12px';
      item.style.padding = '12px';
      item.style.borderBottom = '1px solid var(--divider)';
      
      const colorDot = document.createElement('div');
      colorDot.style.width = '12px';
      colorDot.style.height = '12px';
      colorDot.style.borderRadius = '50%';
      colorDot.style.backgroundColor = ev.color || 'transparent';
      colorDot.style.flexShrink = '0';

      const content = document.createElement('div');
      content.style.flex = '1';
      content.innerHTML = `
    <div style="font-weight: 500;">${escapeHTML(ev.title)}</div>
    ${ev.description ? `
        <div style="font-size: 12px; color: var(--text-muted); margin-top:2px;">
            ${escapeHTML(ev.description)}
        </div>
    ` : ''}
`;

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '✕';
      delBtn.style.color = '#ff6b6b';
      delBtn.style.padding = '4px 8px';
      delBtn.onclick = async () => {
        if(confirm('این رویداد حذف شود؟')) {
          await db.events.delete(ev.id);
          loadEvents();
          loadCalendar();
        }
      };

      item.appendChild(colorDot);
      item.appendChild(content);
      item.appendChild(delBtn);
      listEl.appendChild(item);
    });
  }

  document.getElementById('btn-add-event').onclick = async () => {
    const title = document.getElementById('event-title').value.trim();
    const desc = document.getElementById('event-desc').value.trim();

    if (!title) return alert('عنوان رویداد رو بنویس!');

    await db.events.add({
      title: title,
      description: desc,
      eventDate: selectedDate,
      color: selectedColor
    });

    document.getElementById('event-title').value = '';
    document.getElementById('event-desc').value = '';
    
    loadEvents();
    loadCalendar();
  };

  loadCalendar();
  loadEvents();
}