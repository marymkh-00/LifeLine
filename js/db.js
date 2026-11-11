// js/db.js
const db = new Dexie('LifeLineDB');

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
    debts: '++id', // جدول جدید برای طلب و بدهی
});

// مقدار اولیه — سه لیست خرید و دسته‌بندی‌ها
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
        { title: ' آموزش ' },
        { title: 'سایر هزینه‌ها' },
    ]);
});

if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
}

export default db;