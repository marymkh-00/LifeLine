// js/router.js
import homePage from './pages/home.js';
import tasksPage from './pages/tasks.js';
import calendarPage from './pages/calendar.js';
import financePage from './pages/finance.js';
import morePage from './pages/more.js';

// آیکون‌های SVG نازک و مینیمال
const icons = {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    finance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`
};

const routes = {
    home: { render: homePage, title: 'خانه', icon: icons.home },
    calendar: { render: calendarPage, title: 'تقویم', icon: icons.calendar },
    tasks: { render: tasksPage, title: 'کارها', icon: icons.tasks },
    finance: { render: financePage, title: 'مالی', icon: icons.finance },
    more: { render: morePage, title: 'بیشتر', icon: icons.more },
};

// تابع ناوبری
export function navigate(routeName) {
    const route = routes[routeName];
    if (!route) return;

    // هدر
    document.getElementById('app-header').innerHTML = `<h1>${route.title}</h1>`;

    // محتوا
    const main = document.getElementById('app-main');
    main.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'page-enter';
    main.appendChild(wrapper);
    route.render(wrapper);

    // ناوبری
    renderBottomNav(routeName);
}

function renderBottomNav(activeRoute) {
    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = '';
    for (const [key, r] of Object.entries(routes)) {
        const item = document.createElement('button');
        item.className = 'bottom-nav__item' + (key === activeRoute ? ' active' : '');
        item.innerHTML = `
      ${r.icon}
      <span style="margin-top:2px">${r.title}</span>
    `;
        item.onclick = () => navigate(key);
        nav.appendChild(item);
    }
}

// فقط همین یک خط در آخر فایل باشه (بدون navigate)
export { routes };