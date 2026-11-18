// js/jalali.js
const J = window.jalaali;

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

/** تاریخ ISO امروز: YYYY-MM-DD */
export function todayISO() {
    // برای جلوگیری از باگ تایم‌زون، تاریخ محلی رو می‌گیریم
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** تبدیل ISO به اجزای شمسی */
export function toJalali(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    const j = J.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { year: j.jy, month: j.jm, day: j.jd, weekday: d.getDay() };
}

/** نمایش شمسی: 14 آبان 1405 */
export function formatJalali(isoDate) {
    const j = toJalali(isoDate);
    return `${toFa(j.day)} ${MONTHS[j.month - 1]} ${toFa(j.year)}`;
}

/** نام روز هفته */
export function weekdayName(isoDate) {
    const j = toJalali(isoDate);
    return WEEKDAYS[j.weekday];
}

/** تبدیل اعداد به فارسی */
export function toFa(num) {
    if (num === undefined || num === null) return '';
    return String(num).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹' [d]);
}

/** فرمت تومان */
export function formatToman(amount) {
    return toFa(amount.toLocaleString('en-US').replace(/,/g, '٬')) + ' تومان';
}