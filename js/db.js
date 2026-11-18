// js/db.js
const db = new Dexie('LifeLineDB');

// =============================================
// نسخه ۱ (اولیه)
// =============================================
db.version(1).stores({
    tasks: '++id, taskDate, isCompleted, [taskDate+isCompleted]',
    taskTransfers: '++id, taskId, toDate, &[taskId+toDate]',
    events: '++id, eventDate',
    goals: '++id',
    expenseCategories: '++id',
    expenses: '++id, categoryId, expenseDate',
    categoryBudgets: '++id, &[categoryId+year+month]',
    balanceAdjustments: '++id, adjustmentDate',
    shoppingLists: '++id, &type',
    shoppingItems: '++id, listId',
    dailyMoods: '++id, &date',
    debts: '++id',
});

// =============================================
// نسخه ۲ (اضافه شدن فیلد به اهداف)
// =============================================
db.version(2).stores({
    goals: '++id, timeframe, isCompleted',
}).upgrade(tx => {
    // حفظ اطلاعات، فقط فیلدهای جدید
    return tx.table('goals').toCollection().modify(goal => {
        if (!goal.timeframe) goal.timeframe = 'monthly';
        if (goal.isCompleted === undefined) goal.isCompleted = false;
    });
});

// =============================================
// نسخه ۳ (اضافه شدن completedDate به تسک‌ها)
// =============================================
db.version(3).stores({
    tasks: '++id, taskDate, isCompleted, completedDate, [taskDate+isCompleted]',
}).upgrade(tx => {
    return tx.table('tasks').toCollection().modify(task => {
        if (task.completedDate === undefined) task.completedDate = null;
    });
});

// =============================================
// نسخه ۴ (اضافه شدن description به اهداف و آیتم‌ها)
// =============================================
db.version(4).stores({
    goals: '++id, timeframe, isCompleted, description',
    shoppingItems: '++id, listId, description',
}).upgrade(tx => {
    // ✅ این بخش مهمه: اطلاعات قبلی حفظ می‌شن
    tx.table('goals').toCollection().modify(goal => {
        if (goal.description === undefined) goal.description = '';
    });
    tx.table('shoppingItems').toCollection().modify(item => {
        if (item.description === undefined) item.description = '';
    });
});

// =============================================
// مقدار اولیه (فقط بار اول)
// =============================================
db.on('populate', () => {
    db.shoppingLists.bulkAdd([
        { type: 'needs' },
        { type: 'wants' },
        { type: 'interests' },
    ]);

    db.expenseCategories.bulkAdd([
        { title: 'خوراک و غذا' },
        { title: 'حمل و نقل' },
        { title: 'خرید' },
        { title: 'تفریح و سرگرمی' },
        { title: 'آموزش' },
        { title: 'سایر هزینه‌ها' },
    ]);
});

// =============================================
// درخواست مجوز ذخیره‌سازی دائمی
// =============================================
(async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`📦 Storage: ${isPersisted ? 'Persistent ✅' : 'Best Effort ⚠️'}`);
    }
})();

export default db;