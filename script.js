// AUTH CHECK - Must be first!
window.addEventListener('load', () => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(currentUser);
    document.getElementById('userName').textContent = `Welcome, ${user.name}!`;
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Data storage
let transactions = [];
let savingsGoal = { amount: 0, name: 'Savings Goal' };
let currentFilter = 'all';

// Initialize with today's date
document.getElementById('date').valueAsDate = new Date();

// Memory storage functions
function saveToMemory(key, data) {
    window['_budgetData_' + key] = JSON.stringify(data);
}

function loadFromMemory(key) {
    const data = window['_budgetData_' + key];
    return data ? JSON.parse(data) : null;
}

// Load data on page load
window.addEventListener('load', () => {
    const savedTransactions = loadFromMemory('transactions');
    if (savedTransactions) {
        transactions = savedTransactions;
        updateDashboard();
    }
    const savedGoal = loadFromMemory('savingsGoal');
    if (savedGoal) {
        savingsGoal = savedGoal;
        updateSavingsGoal();
    }
});

// Form submission
document.getElementById('transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const transaction = {
        id: Date.now(),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value,
        date: document.getElementById('date').value
    };

    transactions.unshift(transaction);
    saveToMemory('transactions', transactions);
    updateDashboard();
    e.target.reset();
    document.getElementById('date').valueAsDate = new Date();
});

// Update category options based on type
document.getElementById('type').addEventListener('change', (e) => {
    const category = document.getElementById('category');
    if (e.target.value === 'income') {
        category.innerHTML = `
            <option value="Salary">Salary</option>
            <option value="Freelance">Freelance</option>
            <option value="Investment">Investment</option>
            <option value="Business">Business</option>
            <option value="Gift">Gift</option>
            <option value="Other">Other</option>
        `;
    } else {
        category.innerHTML = `
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Education">Education</option>
            <option value="Rent">Rent</option>
            <option value="Other">Other</option>
        `;
    }
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderTransactions();
    });
});

// Update dashboard
function updateDashboard() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('totalIncome').textContent = `₹${income.toFixed(2)}`;
    document.getElementById('totalExpense').textContent = `₹${expense.toFixed(2)}`;
    document.getElementById('balance').textContent = `₹${(income - expense).toFixed(2)}`;

    renderTransactions();
    updateCharts();
    updateSavingsGoal();
}

// Render transactions
function renderTransactions() {
    const list = document.getElementById('transactionList');
    let filtered = transactions;

    if (currentFilter !== 'all') {
        filtered = transactions.filter(t => t.type === currentFilter);
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">No transactions found.</div>';
        return;
    }

    list.innerHTML = filtered.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-category">${t.category}</div>
                <div class="transaction-description">${t.description}</div>
                <div class="transaction-date">${new Date(t.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}
                </div>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">✕</button>
            </div>
        </div>
    `).join('');
}

// Delete transaction
function deleteTransaction(id) {
    if (confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveToMemory('transactions', transactions);
        updateDashboard();
    }
}

// Charts
let expenseChart, trendChart;

function updateCharts() {
    updateExpenseChart();
    updateTrendChart();
}

function updateExpenseChart() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryData = {};

    expenses.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });

    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: [
                    'rgba(33, 128, 141, 0.8)',
                    'rgba(192, 21, 47, 0.8)',
                    'rgba(230, 129, 97, 0.8)',
                    'rgba(50, 184, 198, 0.8)',
                    'rgba(94, 82, 64, 0.8)',
                    'rgba(98, 108, 113, 0.8)',
                    'rgba(167, 169, 169, 0.8)',
                    'rgba(29, 116, 128, 0.8)',
                    'rgba(255, 84, 89, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15
                    }
                }
            }
        }
    });
}

function updateTrendChart() {
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push({
            month: date.toLocaleDateString('en-IN', { month: 'short' }),
            income: 0,
            expense: 0
        });
    }

    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthIndex = last6Months.findIndex(m => {
            const mDate = new Date(today.getFullYear(), today.getMonth() - (5 - last6Months.indexOf(m)), 1);
            return date.getMonth() === mDate.getMonth() && date.getFullYear() === mDate.getFullYear();
        });

        if (monthIndex !== -1) {
            if (t.type === 'income') {
                last6Months[monthIndex].income += t.amount;
            } else {
                last6Months[monthIndex].expense += t.amount;
            }
        }
    });

    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months.map(m => m.month),
            datasets: [
                {
                    label: 'Income',
                    data: last6Months.map(m => m.income),
                    borderColor: 'rgba(33, 128, 141, 1)',
                    backgroundColor: 'rgba(33, 128, 141, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expense',
                    data: last6Months.map(m => m.expense),
                    borderColor: 'rgba(192, 21, 47, 1)',
                    backgroundColor: 'rgba(192, 21, 47, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Savings goal
function setSavingsGoal() {
    const amount = parseFloat(document.getElementById('goalAmount').value);
    const name = document.getElementById('goalName').value;

    if (!amount || amount <= 0) {
        alert('Please enter a valid goal amount');
        return;
    }

    savingsGoal = {
        amount: amount,
        name: name || 'Savings Goal'
    };

    saveToMemory('savingsGoal', savingsGoal);
    updateSavingsGoal();
}

function updateSavingsGoal() {
    if (savingsGoal.amount > 0) {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const currentSavings = income - expense;
        const percentage = Math.min((currentSavings / savingsGoal.amount) * 100, 100);

        document.getElementById('goalProgress').style.display = 'block';
        document.getElementById('currentGoalName').textContent = savingsGoal.name;
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressFill').textContent = percentage.toFixed(0) + '%';
        document.getElementById('currentSavings').textContent = currentSavings.toFixed(2);
        document.getElementById('goalTarget').textContent = savingsGoal.amount.toFixed(2);
    }
}
