/* Boarding House Utility Management System app.js */

// Global State
let state = {
    members: [],
    collections: [],
    utilities: [],
    expenses: [],
    settings: {
        currency: 'LKR',
        defaultContribution: 1000,
        financialYear: 2026,
        startMonth: 'April',
        maxMembers: 8,
        theme: 'light'
    }
};

// Months order starting from April (Financial Year)
const MONTHS_ORDER = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March'
];

// Helper to format currency
function formatCurrency(amount) {
    const symbol = state.settings.currency === 'LKR' ? 'Rs. ' : state.settings.currency + ' ';
    return `${symbol}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to get Year for a Month name based on Financial Year
function getYearForMonth(monthName) {
    const fy = parseInt(state.settings.financialYear);
    const index = MONTHS_ORDER.indexOf(monthName);
    if (index === -1) return fy;
    // January, February, March are in the next calendar year
    return index >= 9 ? fy + 1 : fy;
}

// Helper to get formatted Month-Year string (e.g. "April 2026")
function getMonthYearStr(monthName) {
    return `${monthName} ${getYearForMonth(monthName)}`;
}

// Parse date to month name (e.g., "2026-04-15" -> "April")
function getMonthNameFromDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('default', { month: 'long' });
}

// Parse date to "Month Year" string
function getMonthYearFromDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
}

// Helper to update backend connection status badge
function updateServerStatus(connected) {
    const el = document.getElementById('server-status');
    if (!el) return;
    if (connected) {
        el.className = 'server-status connected';
        el.querySelector('.status-text').innerText = 'Connected';
    } else {
        el.className = 'server-status offline';
        el.querySelector('.status-text').innerText = 'Offline Mode';
    }
}

// LocalStorage Sync with Backend Integration
async function loadFromStorage() {
    let loadedFromBackend = false;
    try {
        const token = localStorage.getItem('boarding_house_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('/api/state', { headers });
        if (response.status === 401) {
            handleAuthExpiration();
            return;
        }
        if (response.ok) {
            const data = await response.json();
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                state = data;
                loadedFromBackend = true;
            }
        }
    } catch (e) {
        console.warn('Error loading data from backend, trying LocalStorage fallback:', e);
    }

    if (loadedFromBackend) {
        updateServerStatus(true);
        // Sync to localStorage as a local backup
        localStorage.setItem('boarding_house_data', JSON.stringify(state));
    } else {
        updateServerStatus(false);
        const saved = localStorage.getItem('boarding_house_data');
        if (saved) {
            try {
                state = JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing LocalStorage data', e);
            }
        }
    }

    // Initialize blank utilities list if missing or empty
    if (!state.utilities || state.utilities.length === 0) {
        state.utilities = MONTHS_ORDER.map(m => ({
            month: getMonthYearStr(m), water: 0, electricity: 0, internet: 0, gas: 0, cleaning: 0, other: 0, paidDate: '', paidBy: '', remarks: ''
        }));
        await saveToStorage();
    }

    // Apply theme
    document.body.setAttribute('data-theme', state.settings.theme || 'light');
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.innerHTML = state.settings.theme === 'dark' 
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z"/></svg> Light Mode`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Dark Mode`;
    }
}

async function saveToStorage() {
    // Write locally as backup
    localStorage.setItem('boarding_house_data', JSON.stringify(state));

    try {
        const token = localStorage.getItem('boarding_house_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch('/api/state', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(state)
        });
        if (response.status === 401) {
            handleAuthExpiration();
            return;
        }
        if (response.ok) {
            updateServerStatus(true);
        } else {
            updateServerStatus(false);
        }
    } catch (e) {
        console.error('Error saving data to backend:', e);
        updateServerStatus(false);
    }
}

// Seeding realistic dummy data
async function seedDatabase() {
    state.members = [
        { id: 'MEM001', name: 'Yasith Perera', room: '101', phone: '0771234567', status: 'Active', joinDate: '2026-04-01', leaveDate: '', notes: 'Room 1 leader' },
        { id: 'MEM002', name: 'Ruwan Gunasekara', room: '102', phone: '0719876543', status: 'Active', joinDate: '2026-04-01', leaveDate: '', notes: 'Pays via bank transfer' },
        { id: 'MEM003', name: 'Nimal Silva', room: '103', phone: '0755556666', status: 'Active', joinDate: '2026-04-01', leaveDate: '', notes: '' },
        { id: 'MEM004', name: 'Kasun Jayawardena', room: '104', phone: '0722223333', status: 'Active', joinDate: '2026-05-01', leaveDate: '', notes: 'Joined in May' },
        { id: 'MEM005', name: 'Amara Fernando', room: '105', phone: '0788889999', status: 'Inactive', joinDate: '2026-04-01', leaveDate: '2026-10-31', notes: 'Left in November' },
        { id: 'MEM006', name: 'Chathura Bandara', room: '106', phone: '0761112222', status: 'Active', joinDate: '2026-07-01', leaveDate: '', notes: 'Joined in July' },
        { id: 'MEM007', name: 'Thilina Ratnayake', room: '107', phone: '0774445555', status: 'Inactive', joinDate: '2026-04-01', leaveDate: '2026-05-15', notes: 'Temporary member' }
    ];

    // Seed Utility Bills
    // Water, Electricity, Internet, Gas, Cleaning, Other Expenses
    const sampleUtilities = [
        { month: 'April 2026', water: 1200, electricity: 4500, internet: 2900, gas: 1500, cleaning: 2000, other: 500, paidDate: '2026-04-28', paidBy: 'Yasith Perera', remarks: 'Paid in full' },
        { month: 'May 2026', water: 1350, electricity: 4800, internet: 2900, gas: 0, cleaning: 2000, other: 200, paidDate: '2026-05-27', paidBy: 'Ruwan Gunasekara', remarks: 'Gas cylinder still half full' },
        { month: 'June 2026', water: 1100, electricity: 4100, internet: 2900, gas: 1600, cleaning: 2000, other: 1000, paidDate: '2026-06-29', paidBy: 'Kasun Jayawardena', remarks: 'Includes plumbing hardware' },
        { month: 'July 2026', water: 1400, electricity: 5200, internet: 2900, gas: 1500, cleaning: 2000, other: 0, paidDate: '', paidBy: '', remarks: 'Pending payment' }
    ];
    
    // Initialize utilities template for all 12 months
    state.utilities = [];
    MONTHS_ORDER.forEach(m => {
        const monthYear = getMonthYearStr(m);
        const sample = sampleUtilities.find(su => su.month === monthYear);
        if (sample) {
            state.utilities.push(sample);
        } else {
            state.utilities.push({
                month: monthYear, water: 0, electricity: 0, internet: 0, gas: 0, cleaning: 0, other: 0, paidDate: '', paidBy: '', remarks: ''
            });
        }
    });

    // Seed Collections
    state.collections = [];
    // We will generate payments for April, May, June, and July 2026
    const monthsToSeed = ['April 2026', 'May 2026', 'June 2026', 'July 2026'];
    
    monthsToSeed.forEach(my => {
        state.members.forEach(member => {
            // Check if member was active during this month
            let activeInMonth = false;
            const joinDate = new Date(member.joinDate);
            const mParts = my.split(' ');
            const mYear = parseInt(mParts[1]);
            const mName = mParts[0];
            const mIndex = MONTHS_ORDER.indexOf(mName);
            const monthStart = new Date(mYear, MONTHS_ORDER.indexOf(mName), 1);
            
            if (member.status === 'Active') {
                if (joinDate <= monthStart) activeInMonth = true;
            } else {
                const leaveDate = member.leaveDate ? new Date(member.leaveDate) : null;
                if (joinDate <= monthStart && (!leaveDate || leaveDate >= monthStart)) {
                    activeInMonth = true;
                }
            }

            if (activeInMonth) {
                // Generate payment
                let extra = 0;
                let advance = 0;
                let partial = 0;
                let payDate = '';
                let remarks = '';
                
                // Let's vary the payment behavior
                if (my === 'April 2026') {
                    partial = 1000; // Paid in full
                    payDate = '2026-04-08';
                } else if (my === 'May 2026') {
                    if (member.id === 'MEM003') { // Nimal Silva paid late
                        partial = 1000;
                        payDate = '2026-05-15';
                    } else if (member.id === 'MEM004') { // Kasun paid partial
                        partial = 600;
                        payDate = '2026-05-09';
                        remarks = 'Remaining next month';
                    } else {
                        partial = 1000;
                        payDate = '2026-05-07';
                    }
                } else if (my === 'June 2026') {
                    if (member.id === 'MEM004') {
                        partial = 1400; // paid previous due as well
                        payDate = '2026-06-08';
                        remarks = 'Includes May outstanding';
                    } else if (member.id === 'MEM005') { // Amara missed
                        partial = 0;
                        payDate = '';
                    } else {
                        partial = 1000;
                        payDate = '2026-06-05';
                    }
                } else if (my === 'July 2026') {
                    if (member.id === 'MEM001') {
                        partial = 1000;
                        payDate = '2026-07-06';
                    } else if (member.id === 'MEM002') {
                        partial = 500; // partial
                        payDate = '2026-07-08';
                    } else if (member.id === 'MEM006') {
                        partial = 0; // Not paid yet
                    } else if (member.id === 'MEM003') {
                        partial = 1000;
                        payDate = '2026-07-12'; // late
                    } else {
                        partial = 1000;
                        payDate = '2026-07-07';
                    }
                }

                state.collections.push({
                    month: my,
                    memberId: member.id,
                    memberName: member.name,
                    standardContribution: 1000,
                    extraContribution: extra,
                    advancePayment: advance,
                    partialPayment: partial,
                    paymentDate: payDate,
                    remarks: remarks
                });
            }
        });
    });

    // Seed Miscellaneous Expenses
    state.expenses = [
        { id: 'EXP001', date: '2026-04-12', category: 'Maintenance', description: 'Fix bathroom sink leak', amount: 3500, paidTo: 'Nalin Plumber', method: 'Cash', refNo: '' },
        { id: 'EXP002', date: '2026-05-20', category: 'Repairs', description: 'Kitchen LED tube bulb replacement', amount: 800, paidTo: 'Electrical Mart', method: 'Cash', refNo: '' },
        { id: 'EXP003', date: '2026-06-05', category: 'Supplies', description: 'New padlocks for front gate', amount: 4500, paidTo: 'Union Hardware', method: 'Bank Transfer', refNo: 'TXN889102' }
    ];

    await saveToStorage();
    showNotification('Sample data successfully loaded!');
    await initApp();
}

// Notification Helper
function showNotification(message, type = 'success') {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.bottom = '24px';
    el.style.right = '24px';
    el.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
    el.style.color = '#ffffff';
    el.style.padding = '12px 24px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    el.style.zIndex = '9999';
    el.style.fontWeight = '600';
    el.style.fontSize = '0.9rem';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'all 0.3s ease';
    
    el.innerText = message;
    document.body.appendChild(el);
    
    // Animate in
    setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    }, 10);
    
    // Animate out
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => {
            el.remove();
        }, 300);
    }, 3000);
}

// Calculations Engine (Excel formulas equivalent)
function getCollectionSummary(monthYear) {
    const records = state.collections.filter(c => c.month === monthYear);
    let totalPaid = 0;
    let outstanding = 0;
    
    records.forEach(r => {
        const paid = Number(r.partialPayment || 0) + Number(r.advancePayment || 0) + Number(r.extraContribution || 0);
        const expected = Number(r.standardContribution || 1000) + Number(r.extraContribution || 0);
        totalPaid += paid;
        outstanding += Math.max(0, expected - paid);
    });

    return { totalPaid, outstanding };
}

function getUtilityBillTotals(monthYear) {
    const bill = state.utilities.find(u => u.month === monthYear);
    if (!bill) return 0;
    return Number(bill.water || 0) + 
           Number(bill.electricity || 0) + 
           Number(bill.internet || 0) + 
           Number(bill.gas || 0) + 
           Number(bill.cleaning || 0) + 
           Number(bill.other || 0);
}

function getMiscellaneousExpenseTotals(monthYear) {
    return state.expenses
        .filter(e => {
            const dateMonth = getMonthYearFromDate(e.date);
            return dateMonth === monthYear;
        })
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

// Build Monthly Summary data recursively
function calculateMonthlySummaries() {
    let prevCarryForward = 0;
    const summaries = [];

    MONTHS_ORDER.forEach(m => {
        const monthYear = getMonthYearStr(m);
        
        // Active members in this month
        const activeMembersCount = state.members.filter(member => {
            const joinDate = new Date(member.joinDate);
            const mParts = monthYear.split(' ');
            const mYear = parseInt(mParts[1]);
            const monthStart = new Date(mYear, MONTHS_ORDER.indexOf(m), 1);
            
            if (member.status === 'Active') {
                return joinDate <= monthStart;
            } else {
                const leaveDate = member.leaveDate ? new Date(member.leaveDate) : null;
                return joinDate <= monthStart && (!leaveDate || leaveDate >= monthStart);
            }
        }).length;

        const expectedCollection = activeMembersCount * Number(state.settings.defaultContribution);
        
        // Collections matching this month
        const { totalPaid: actualCollection } = getCollectionSummary(monthYear);
        
        // Bills matching this month
        const utilityBills = state.utilities.find(u => u.month === monthYear);
        const waterBill = utilityBills ? Number(utilityBills.water || 0) : 0;
        const electricityBill = utilityBills ? Number(utilityBills.electricity || 0) : 0;
        const internet = utilityBills ? Number(utilityBills.internet || 0) : 0;
        const gas = utilityBills ? Number(utilityBills.gas || 0) : 0;
        const cleaning = utilityBills ? Number(utilityBills.cleaning || 0) : 0;
        const other = utilityBills ? Number(utilityBills.other || 0) : 0;
        
        const otherExpenses = internet + gas + cleaning + other;
        
        // Total Expenses = Utility Bills + Misc Expenses
        const miscExpenses = getMiscellaneousExpenseTotals(monthYear);
        const totalExpenses = waterBill + electricityBill + otherExpenses + miscExpenses;
        
        const cashFlow = actualCollection - totalExpenses;
        const surplus = actualCollection > totalExpenses ? cashFlow : 0;
        const deficit = totalExpenses > actualCollection ? -cashFlow : 0;
        const carryForward = prevCarryForward + cashFlow;
        
        summaries.push({
            month: monthYear,
            expectedCollection,
            actualCollection,
            waterBills: waterBill,
            electricityBills: electricityBill,
            otherExpenses,
            totalExpenses,
            surplus,
            deficit,
            carryForward
        });

        // Seed carry forward for next month
        prevCarryForward = carryForward;
    });

    return summaries;
}

// Chart Objects
let charts = {};

async function initApp() {
    const token = localStorage.getItem('boarding_house_token');
    if (!token) {
        showLoginScreen();
        return;
    }

    await loadFromStorage();
    
    if (localStorage.getItem('boarding_house_token')) {
        showAppScreen();
        renderDashboard();
        renderMembersTable();
        renderCollectionsTable();
        renderUtilitiesTable();
        renderExpensesTable();
        renderMonthlySummaryTable();
        renderPaymentTracker();
        renderAnalytics();
        renderReports();
        populateSelectDropdowns();
    }
}

// 1. Dashboard Tab
function renderDashboard() {
    const summaries = calculateMonthlySummaries();
    
    // Calculate total collections, expected, outstanding, and expenses
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalExpenses = 0;
    let totalWater = 0;
    let totalElectricity = 0;

    summaries.forEach(s => {
        totalExpected += s.expectedCollection;
        totalCollected += s.actualCollection;
        totalExpenses += s.totalExpenses;
        totalWater += s.waterBills;
        totalElectricity += s.electricityBills;
    });

    // Count roommate payment statuses
    let paidCount = 0;
    let lateCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    state.collections.forEach(c => {
        const status = calculatePaymentStatus(c);
        if (status === 'Paid') paidCount++;
        else if (status === 'Late') lateCount++;
        else if (status === 'Partial') partialCount++;
        else if (status === 'Not Paid') unpaidCount++;
    });

    // Render KPI Cards
    const curMonthYear = getMonthYearFromDate(new Date().toISOString().split('T')[0]) || getMonthYearStr('April');
    
    document.getElementById('kpi-cur-month').innerText = curMonthYear;
    document.getElementById('kpi-total-members').innerText = state.members.length;
    document.getElementById('kpi-paid-members').innerText = paidCount + lateCount;
    document.getElementById('kpi-unpaid-members').innerText = unpaidCount;
    
    document.getElementById('kpi-expected-collection').innerText = formatCurrency(totalExpected);
    document.getElementById('kpi-collected-amount').innerText = formatCurrency(totalCollected);
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    document.getElementById('kpi-collection-rate').innerText = `${collectionRate.toFixed(1)}%`;
    
    // Outstanding LKR
    const outstandingSum = state.collections.reduce((sum, c) => {
        const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
        const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
        return sum + Math.max(0, expected - paid);
    }, 0);
    document.getElementById('kpi-outstanding-amount').innerText = formatCurrency(outstandingSum);
    
    document.getElementById('kpi-water-expenses').innerText = formatCurrency(totalWater);
    document.getElementById('kpi-elec-expenses').innerText = formatCurrency(totalElectricity);
    document.getElementById('kpi-total-expenses').innerText = formatCurrency(totalExpenses);
    
    // Carry Forward / Net Savings
    const carryForwardBal = summaries.length > 0 ? summaries[summaries.length - 1].carryForward : 0;
    document.getElementById('kpi-carry-forward').innerText = formatCurrency(carryForwardBal);
    
    const netSavings = totalCollected - totalExpenses;
    document.getElementById('kpi-net-savings').innerText = formatCurrency(netSavings);

    // Dashboard side table for roommate statuses
    const statusCountsTbody = document.getElementById('dashboard-status-counts');
    if (statusCountsTbody) {
        statusCountsTbody.innerHTML = `
            <tr><td><span class="badge badge-paid">Paid</span></td><td><strong>${paidCount}</strong> payment(s)</td></tr>
            <tr><td><span class="badge badge-partial">Partial</span></td><td><strong>${partialCount}</strong> payment(s)</td></tr>
            <tr><td><span class="badge badge-notpaid">Not Paid</span></td><td><strong>${unpaidCount}</strong> payment(s)</td></tr>
            <tr><td><span class="badge badge-late">Late</span></td><td><strong>${lateCount}</strong> payment(s)</td></tr>
        `;
    }

    // Render Charts
    renderDashboardCharts(summaries, { paidCount, lateCount, partialCount, unpaidCount });
}

function renderDashboardCharts(summaries, statusCounts) {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textCol = isDark ? '#9ca3af' : '#64748b';
    const gridCol = isDark ? '#374151' : '#e2e8f0';

    // Chart 1: Collections vs Expenses Trend
    if (charts.trend) charts.trend.destroy();
    const ctxTrend = document.getElementById('chart-trend').getContext('2d');
    charts.trend = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: MONTHS_ORDER,
            datasets: [
                {
                    label: 'Collections',
                    data: summaries.map(s => s.actualCollection),
                    backgroundColor: 'rgba(37, 99, 235, 0.85)',
                    borderRadius: 4
                },
                {
                    label: 'Total Expenses',
                    data: summaries.map(s => s.totalExpenses),
                    backgroundColor: 'rgba(239, 68, 68, 0.85)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textCol }, grid: { display: false } },
                y: { ticks: { color: textCol }, grid: { color: gridCol } }
            },
            plugins: {
                legend: { labels: { color: textCol } }
            }
        }
    });

    // Chart 2: Roommate Payment Status Distribution
    if (charts.statusDist) charts.statusDist.destroy();
    const ctxStatus = document.getElementById('chart-status-dist').getContext('2d');
    charts.statusDist = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Paid', 'Partial', 'Not Paid', 'Late'],
            datasets: [{
                data: [statusCounts.paidCount, statusCounts.partialCount, statusCounts.unpaidCount, statusCounts.lateCount],
                backgroundColor: [
                    '#10b981', // Paid
                    '#f59e0b', // Partial
                    '#ef4444', // Not Paid
                    '#6366f1'  // Late
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textCol } }
            }
        }
    });

    // Chart 3: Utility Expense Breakdown
    if (charts.utilities) charts.utilities.destroy();
    const ctxUtil = document.getElementById('chart-utility-breakdown').getContext('2d');
    
    // Sum utility columns
    let waterTotal = 0, electricityTotal = 0, internetTotal = 0, gasTotal = 0, cleaningTotal = 0, otherTotal = 0;
    state.utilities.forEach(u => {
        waterTotal += Number(u.water || 0);
        electricityTotal += Number(u.electricity || 0);
        internetTotal += Number(u.internet || 0);
        gasTotal += Number(u.gas || 0);
        cleaningTotal += Number(u.cleaning || 0);
        otherTotal += Number(u.other || 0);
    });

    charts.utilities = new Chart(ctxUtil, {
        type: 'polarArea',
        data: {
            labels: ['Water', 'Electricity', 'Internet', 'Gas', 'Cleaning', 'Other'],
            datasets: [{
                data: [waterTotal, electricityTotal, internetTotal, gasTotal, cleaningTotal, otherTotal],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(107, 114, 128, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textCol } }
            },
            scales: {
                r: { grid: { color: gridCol }, ticks: { backdropColor: 'transparent', color: textCol } }
            }
        }
    });

    // Chart 4: Outstanding Balances by Roommate
    if (charts.outstanding) charts.outstanding.destroy();
    const ctxOut = document.getElementById('chart-outstanding').getContext('2d');
    
    const roommateOutstanding = state.members.map(m => {
        const outSum = state.collections
            .filter(c => c.memberId === m.id)
            .reduce((sum, c) => {
                const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
                const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
                return sum + Math.max(0, expected - paid);
            }, 0);
        return { name: m.name, outstanding: outSum };
    }).filter(ro => ro.outstanding > 0);

    charts.outstanding = new Chart(ctxOut, {
        type: 'bar',
        data: {
            labels: roommateOutstanding.map(ro => ro.name),
            datasets: [{
                label: 'Outstanding Balance',
                data: roommateOutstanding.map(ro => ro.outstanding),
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textCol }, grid: { color: gridCol } },
                y: { ticks: { color: textCol }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Chart 5: Monthly Cash Flow Surplus/Deficit
    if (charts.cashFlow) charts.cashFlow.destroy();
    const ctxFlow = document.getElementById('chart-cash-flow').getContext('2d');
    charts.cashFlow = new Chart(ctxFlow, {
        type: 'line',
        data: {
            labels: MONTHS_ORDER,
            datasets: [{
                label: 'Monthly Net Flow',
                data: summaries.map(s => s.actualCollection - s.totalExpenses),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textCol }, grid: { display: false } },
                y: { ticks: { color: textCol }, grid: { color: gridCol } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Chart 6: Cumulative Cash Flow (Carry Forward)
    if (charts.cumulative) charts.cumulative.destroy();
    const ctxCum = document.getElementById('chart-cumulative').getContext('2d');
    charts.cumulative = new Chart(ctxCum, {
        type: 'line',
        data: {
            labels: MONTHS_ORDER,
            datasets: [{
                label: 'Carry Forward Balance',
                data: summaries.map(s => s.carryForward),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textCol }, grid: { display: false } },
                y: { ticks: { color: textCol }, grid: { color: gridCol } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// 2. Roommates Registry Tab
function renderMembersTable() {
    const tbody = document.getElementById('members-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (state.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-secondary);">No roommates registered. Click "Add Roommate" to register profiles.</td></tr>`;
        return;
    }

    state.members.forEach(m => {
        const statusBadge = m.status === 'Active' 
            ? `<span class="badge badge-active">Active</span>`
            : `<span class="badge badge-inactive">Inactive</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.id}</strong></td>
            <td><strong>${m.name}</strong></td>
            <td>Room ${m.room || 'N/A'}</td>
            <td>${m.phone || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td>${m.joinDate || 'N/A'}</td>
            <td>${m.leaveDate || '-'}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${m.notes || ''}">${m.notes || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="openEditMemberModal('${m.id}')" title="Edit Profile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteMember('${m.id}')" title="Delete Profile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddMemberModal() {
    document.getElementById('member-modal-title').innerText = 'Add New Roommate';
    document.getElementById('member-id').value = 'MEM' + String(state.members.length + 1).padStart(3, '0');
    document.getElementById('member-name').value = '';
    document.getElementById('member-room').value = '';
    document.getElementById('member-phone').value = '';
    document.getElementById('member-status').value = 'Active';
    document.getElementById('member-joindate').value = new Date().toISOString().split('T')[0];
    document.getElementById('member-leavedate').value = '';
    document.getElementById('member-notes').value = '';
    
    showModal('member-modal');
}

function openEditMemberModal(id) {
    const m = state.members.find(member => member.id === id);
    if (!m) return;
    
    document.getElementById('member-modal-title').innerText = 'Edit Roommate Profile';
    document.getElementById('member-id').value = m.id;
    document.getElementById('member-name').value = m.name;
    document.getElementById('member-room').value = m.room || '';
    document.getElementById('member-phone').value = m.phone || '';
    document.getElementById('member-status').value = m.status || 'Active';
    document.getElementById('member-joindate').value = m.joinDate || '';
    document.getElementById('member-leavedate').value = m.leaveDate || '';
    document.getElementById('member-notes').value = m.notes || '';
    
    showModal('member-modal');
}

async function saveMember(event) {
    event.preventDefault();
    const id = document.getElementById('member-id').value;
    const name = document.getElementById('member-name').value;
    const room = document.getElementById('member-room').value;
    const phone = document.getElementById('member-phone').value;
    const status = document.getElementById('member-status').value;
    const joinDate = document.getElementById('member-joindate').value;
    const leaveDate = document.getElementById('member-leavedate').value;
    const notes = document.getElementById('member-notes').value;
    
    if (!name || !joinDate) {
        showNotification('Name and Join Date are required!', 'error');
        return;
    }

    const index = state.members.findIndex(m => m.id === id);
    const memberObj = { id, name, room, phone, status, joinDate, leaveDate, notes };
    
    if (index > -1) {
        // Edit existing
        state.members[index] = memberObj;
        // Rename in collections if changed
        state.collections.forEach(c => {
            if (c.memberId === id) c.memberName = name;
        });
        showNotification('Roommate profile updated!');
    } else {
        // Add new
        state.members.push(memberObj);
        showNotification('New roommate registered!');
    }
    
    await saveToStorage();
    hideModal('member-modal');
    await initApp();
}

async function deleteMember(id) {
    if (confirm(`Are you sure you want to delete roommate ${id}? This will remove all their transactional collections history!`)) {
        state.members = state.members.filter(m => m.id !== id);
        state.collections = state.collections.filter(c => c.memberId !== id);
        await saveToStorage();
        showNotification('Roommate profile and records deleted.', 'error');
        await initApp();
    }
}

// 3. Rent & Collections Tab
function calculatePaymentStatus(c) {
    const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
    const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
    
    if (paid === 0) {
        return 'Not Paid';
    }
    if (paid < expected) {
        return 'Partial';
    }
    
    // Check if payment date is after the 10th day of that billing month
    if (c.paymentDate) {
        const payDate = new Date(c.paymentDate);
        if (!isNaN(payDate.getTime())) {
            const parts = c.month.split(' ');
            if (parts.length === 2) {
                const monthName = parts[0];
                const year = parseInt(parts[1]);
                const deadlineDate = new Date(`${monthName} 10, ${year}`);
                if (!isNaN(deadlineDate.getTime())) {
                    if (payDate > deadlineDate) {
                        return 'Late';
                    }
                }
            }
        }
    }
    return 'Paid';
}

function renderCollectionsTable() {
    const tbody = document.getElementById('collections-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Get filter values
    const filterMonth = document.getElementById('filter-collections-month').value;
    const filterMember = document.getElementById('filter-collections-member').value;
    const filterStatus = document.getElementById('filter-collections-status').value;
    
    let records = state.collections;
    
    if (filterMonth) {
        records = records.filter(r => r.month === filterMonth);
    }
    if (filterMember) {
        records = records.filter(r => r.memberId === filterMember);
    }
    if (filterStatus) {
        records = records.filter(r => calculatePaymentStatus(r) === filterStatus);
    }

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 40px; color: var(--text-secondary);">No collection payments match the filters. Click "Log Payment" to record a collection.</td></tr>`;
        return;
    }

    // Sort collections by month index, then member room
    records.sort((a, b) => {
        const aIndex = MONTHS_ORDER.indexOf(a.month.split(' ')[0]);
        const bIndex = MONTHS_ORDER.indexOf(b.month.split(' ')[0]);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.memberName.localeCompare(b.memberName);
    });

    records.forEach((c, idx) => {
        const totalPaid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
        const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
        const outstanding = Math.max(0, expected - totalPaid);
        const status = calculatePaymentStatus(c);
        
        let badgeClass = 'badge-notpaid';
        if (status === 'Paid') badgeClass = 'badge-paid';
        else if (status === 'Late') badgeClass = 'badge-late';
        else if (status === 'Partial') badgeClass = 'badge-partial';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.month}</strong></td>
            <td><strong>${c.memberName}</strong></td>
            <td>${formatCurrency(c.standardContribution)}</td>
            <td>${formatCurrency(c.extraContribution)}</td>
            <td>${formatCurrency(c.advancePayment)}</td>
            <td>${formatCurrency(c.partialPayment)}</td>
            <td><strong>${formatCurrency(totalPaid)}</strong></td>
            <td style="color: ${outstanding > 0 ? 'var(--color-notpaid)' : 'inherit'}; font-weight: ${outstanding > 0 ? '600' : 'normal'}">${formatCurrency(outstanding)}</td>
            <td>${c.paymentDate || '-'}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;" title="${c.remarks || ''}">${c.remarks || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="openEditCollectionModal('${c.month}', '${c.memberId}')" title="Edit Log">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteCollection('${c.month}', '${c.memberId}')" title="Delete Log">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddCollectionModal() {
    document.getElementById('collection-modal-title').innerText = 'Log Roommate Payment';
    document.getElementById('collection-action').value = 'ADD';
    
    // Prefill defaults
    document.getElementById('collection-month').disabled = false;
    document.getElementById('collection-member').disabled = false;
    document.getElementById('collection-month').value = getMonthYearStr(MONTHS_ORDER[0]);
    document.getElementById('collection-member').selectedIndex = 0;
    
    document.getElementById('collection-standard').value = state.settings.defaultContribution;
    document.getElementById('collection-extra').value = 0;
    document.getElementById('collection-advance').value = 0;
    document.getElementById('collection-partial').value = 0;
    document.getElementById('collection-paydate').value = new Date().toISOString().split('T')[0];
    document.getElementById('collection-remarks').value = '';
    
    showModal('collection-modal');
}

function openEditCollectionModal(month, memberId) {
    const c = state.collections.find(col => col.month === month && col.memberId === memberId);
    if (!c) return;
    
    document.getElementById('collection-modal-title').innerText = 'Modify Roommate Payment';
    document.getElementById('collection-action').value = 'EDIT';
    
    document.getElementById('collection-month').value = c.month;
    document.getElementById('collection-month').disabled = true;
    
    document.getElementById('collection-member').value = c.memberId;
    document.getElementById('collection-member').disabled = true;
    
    document.getElementById('collection-standard').value = c.standardContribution;
    document.getElementById('collection-extra').value = c.extraContribution;
    document.getElementById('collection-advance').value = c.advancePayment;
    document.getElementById('collection-partial').value = c.partialPayment;
    document.getElementById('collection-paydate').value = c.paymentDate || '';
    document.getElementById('collection-remarks').value = c.remarks || '';
    
    showModal('collection-modal');
}

async function saveCollection(event) {
    event.preventDefault();
    
    const action = document.getElementById('collection-action').value;
    const month = document.getElementById('collection-month').value;
    const memberId = document.getElementById('collection-member').value;
    const standard = Number(document.getElementById('collection-standard').value);
    const extra = Number(document.getElementById('collection-extra').value);
    const advance = Number(document.getElementById('collection-advance').value);
    const partial = Number(document.getElementById('collection-partial').value);
    const payDate = document.getElementById('collection-paydate').value;
    const remarks = document.getElementById('collection-remarks').value;
    
    const member = state.members.find(m => m.id === memberId);
    if (!member) {
        showNotification('Invalid roommate selected!', 'error');
        return;
    }
    
    const index = state.collections.findIndex(c => c.month === month && c.memberId === memberId);
    
    if (action === 'ADD' && index > -1) {
        showNotification('A record already exists for this roommate in this month. Use Edit instead!', 'error');
        return;
    }

    const collectionObj = {
        month,
        memberId,
        memberName: member.name,
        standardContribution: standard,
        extraContribution: extra,
        advancePayment: advance,
        partialPayment: partial,
        paymentDate: payDate,
        remarks
    };

    if (index > -1) {
        state.collections[index] = collectionObj;
        showNotification('Collection record updated!');
    } else {
        state.collections.push(collectionObj);
        showNotification('Collection payment logged!');
    }

    await saveToStorage();
    hideModal('collection-modal');
    await initApp();
}

async function deleteCollection(month, memberId) {
    if (confirm(`Delete the payment record for roommate in ${month}?`)) {
        state.collections = state.collections.filter(c => !(c.month === month && c.memberId === memberId));
        await saveToStorage();
        showNotification('Payment log removed.', 'error');
        await initApp();
    }
}

// 4. Utility Bills Tab
function renderUtilitiesTable() {
    const tbody = document.getElementById('utilities-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    state.utilities.forEach(u => {
        const total = Number(u.water || 0) + Number(u.electricity || 0) + Number(u.internet || 0) + 
                      Number(u.gas || 0) + Number(u.cleaning || 0) + Number(u.other || 0);
                      
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.month}</strong></td>
            <td>${formatCurrency(u.water)}</td>
            <td>${formatCurrency(u.electricity)}</td>
            <td>${formatCurrency(u.internet)}</td>
            <td>${formatCurrency(u.gas)}</td>
            <td>${formatCurrency(u.cleaning)}</td>
            <td>${formatCurrency(u.other)}</td>
            <td><strong>${formatCurrency(total)}</strong></td>
            <td>${u.paidDate || '-'}</td>
            <td>${u.paidBy || '-'}</td>
            <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;" title="${u.remarks || ''}">${u.remarks || '-'}</td>
            <td>
                <button class="btn-icon" onclick="openEditUtilityModal('${u.month}')" title="Log/Edit Utility Bills">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditUtilityModal(month) {
    const u = state.utilities.find(util => util.month === month);
    if (!u) return;
    
    document.getElementById('utility-modal-title').innerText = `Log Utility Bills - ${month}`;
    document.getElementById('utility-month').value = u.month;
    
    document.getElementById('utility-water').value = u.water || 0;
    document.getElementById('utility-electricity').value = u.electricity || 0;
    document.getElementById('utility-internet').value = u.internet || 0;
    document.getElementById('utility-gas').value = u.gas || 0;
    document.getElementById('utility-cleaning').value = u.cleaning || 0;
    document.getElementById('utility-other').value = u.other || 0;
    document.getElementById('utility-paydate').value = u.paidDate || '';
    document.getElementById('utility-paidby').value = u.paidBy || '';
    document.getElementById('utility-remarks').value = u.remarks || '';
    
    showModal('utility-modal');
}

async function saveUtility(event) {
    event.preventDefault();
    
    const month = document.getElementById('utility-month').value;
    const index = state.utilities.findIndex(u => u.month === month);
    
    if (index === -1) return;
    
    state.utilities[index] = {
        month,
        water: Number(document.getElementById('utility-water').value),
        electricity: Number(document.getElementById('utility-electricity').value),
        internet: Number(document.getElementById('utility-internet').value),
        gas: Number(document.getElementById('utility-gas').value),
        cleaning: Number(document.getElementById('utility-cleaning').value),
        other: Number(document.getElementById('utility-other').value),
        paidDate: document.getElementById('utility-paydate').value,
        paidBy: document.getElementById('utility-paidby').value,
        remarks: document.getElementById('utility-remarks').value
    };

    showNotification(`Utility bill values updated for ${month}!`);
    await saveToStorage();
    hideModal('utility-modal');
    await initApp();
}

// 5. Miscellaneous Expenses Tab
function renderExpensesTable() {
    const tbody = document.getElementById('expenses-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (state.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 40px; color: var(--text-secondary);">No miscellaneous expenditures recorded. Click "Record Expense" to log maintenance/repairs.</td></tr>`;
        return;
    }

    // Sort newest date first
    const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${e.id}</strong></td>
            <td>${e.date}</td>
            <td>${getMonthYearFromDate(e.date)}</td>
            <td><span class="badge badge-late">${e.category}</span></td>
            <td style="max-width: 200px; white-space: normal;" title="${e.description}">${e.description}</td>
            <td><strong>${formatCurrency(e.amount)}</strong></td>
            <td>${e.paidTo || '-'}</td>
            <td>${e.method || '-'}</td>
            <td>${e.refNo || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="openEditExpenseModal('${e.id}')" title="Edit Details">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteExpense('${e.id}')" title="Delete Log">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddExpenseModal() {
    document.getElementById('expense-modal-title').innerText = 'Log Miscellaneous Expenditure';
    document.getElementById('expense-id').value = 'EXP' + String(state.expenses.length + 1).padStart(3, '0');
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-category').value = 'Maintenance';
    document.getElementById('expense-description').value = '';
    document.getElementById('expense-amount').value = 0;
    document.getElementById('expense-paidto').value = '';
    document.getElementById('expense-method').value = 'Cash';
    document.getElementById('expense-refno').value = '';
    
    showModal('expense-modal');
}

function openEditExpenseModal(id) {
    const e = state.expenses.find(exp => exp.id === id);
    if (!e) return;
    
    document.getElementById('expense-modal-title').innerText = 'Edit Expense Record';
    document.getElementById('expense-id').value = e.id;
    document.getElementById('expense-date').value = e.date;
    document.getElementById('expense-category').value = e.category || 'Maintenance';
    document.getElementById('expense-description').value = e.description || '';
    document.getElementById('expense-amount').value = e.amount || 0;
    document.getElementById('expense-paidto').value = e.paidTo || '';
    document.getElementById('expense-method').value = e.method || 'Cash';
    document.getElementById('expense-refno').value = e.refNo || '';
    
    showModal('expense-modal');
}

async function saveExpense(event) {
    event.preventDefault();
    
    const id = document.getElementById('expense-id').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    const description = document.getElementById('expense-description').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const paidTo = document.getElementById('expense-paidto').value;
    const method = document.getElementById('expense-method').value;
    const refNo = document.getElementById('expense-refno').value;
    
    if (!date || !description || amount <= 0) {
        showNotification('Please fill in Date, Description, and an Amount > 0!', 'error');
        return;
    }

    const index = state.expenses.findIndex(e => e.id === id);
    const expenseObj = { id, date, category, description, amount, paidTo, method, refNo };

    if (index > -1) {
        state.expenses[index] = expenseObj;
        showNotification('Expense transaction details updated!');
    } else {
        state.expenses.push(expenseObj);
        showNotification('New expenditure logged successfully!');
    }

    await saveToStorage();
    hideModal('expense-modal');
    await initApp();
}

async function deleteExpense(id) {
    if (confirm(`Remove expense log entry ${id}?`)) {
        state.expenses = state.expenses.filter(e => e.id !== id);
        await saveToStorage();
        showNotification('Expense entry removed.', 'error');
        await initApp();
    }
}

// 6. Monthly Summary Grid
function renderMonthlySummaryTable() {
    const tbody = document.getElementById('summary-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const summaries = calculateMonthlySummaries();
    
    let totalExpected = 0;
    let totalActual = 0;
    let totalWater = 0;
    let totalElectricity = 0;
    let totalOther = 0;
    let totalExpenses = 0;
    let totalSurplus = 0;
    let totalDeficit = 0;

    summaries.forEach(s => {
        totalExpected += s.expectedCollection;
        totalActual += s.actualCollection;
        totalWater += s.waterBills;
        totalElectricity += s.electricityBills;
        totalOther += s.otherExpenses;
        totalExpenses += s.totalExpenses;
        totalSurplus += s.surplus;
        totalDeficit += s.deficit;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.month}</strong></td>
            <td>${formatCurrency(s.expectedCollection)}</td>
            <td><strong>${formatCurrency(s.actualCollection)}</strong></td>
            <td>${formatCurrency(s.waterBills)}</td>
            <td>${formatCurrency(s.electricityBills)}</td>
            <td>${formatCurrency(s.otherExpenses)}</td>
            <td><strong>${formatCurrency(s.totalExpenses)}</strong></td>
            <td style="color: ${s.surplus > 0 ? 'var(--color-paid)' : 'inherit'}; font-weight: ${s.surplus > 0 ? '600' : 'normal'}">${formatCurrency(s.surplus)}</td>
            <td style="color: ${s.deficit > 0 ? 'var(--color-notpaid)' : 'inherit'}; font-weight: ${s.deficit > 0 ? '600' : 'normal'}">${formatCurrency(s.deficit)}</td>
            <td><strong>${formatCurrency(s.carryForward)}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    // Add Totals row
    const trTotal = document.createElement('tr');
    trTotal.style.backgroundColor = 'var(--bg-app)';
    trTotal.style.fontWeight = 'bold';
    trTotal.style.borderTop = '2px solid var(--text-primary)';
    trTotal.innerHTML = `
        <td>TOTALS</td>
        <td>${formatCurrency(totalExpected)}</td>
        <td>${formatCurrency(totalActual)}</td>
        <td>${formatCurrency(totalWater)}</td>
        <td>${formatCurrency(totalElectricity)}</td>
        <td>${formatCurrency(totalOther)}</td>
        <td>${formatCurrency(totalExpenses)}</td>
        <td style="color: var(--color-paid)">${formatCurrency(totalSurplus)}</td>
        <td style="color: var(--color-notpaid)">${formatCurrency(totalDeficit)}</td>
        <td>-</td>
    `;
    tbody.appendChild(trTotal);
}

// 7. Payment Status Tracker
function renderPaymentTracker() {
    const container = document.getElementById('tracker-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Matrix grid layout setup: 1 name col + 12 month columns
    const grid = document.createElement('div');
    grid.className = 'matrix-grid';
    
    // Header cells
    const headerName = document.createElement('div');
    headerName.className = 'matrix-header-cell';
    headerName.innerText = 'Member Name';
    grid.appendChild(headerName);
    
    MONTHS_ORDER.forEach(m => {
        const headerM = document.createElement('div');
        headerM.className = 'matrix-header-cell';
        headerM.innerText = m.substring(0, 3);
        headerM.title = m;
        grid.appendChild(headerM);
    });

    if (state.members.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align:center; color: var(--text-secondary);">No roommates registered in profile list.</div>';
        return;
    }

    state.members.forEach(member => {
        // Name Cell
        const nameCell = document.createElement('div');
        nameCell.className = 'matrix-cell';
        nameCell.innerHTML = `<strong>${member.name}</strong>`;
        grid.appendChild(nameCell);
        
        // 12 Months Status Cells
        MONTHS_ORDER.forEach(m => {
            const monthYear = getMonthYearStr(m);
            const statusCell = document.createElement('div');
            statusCell.className = 'matrix-cell';
            
            // Check if member active in this month
            const joinDate = new Date(member.joinDate);
            const mParts = monthYear.split(' ');
            const mYear = parseInt(mParts[1]);
            const monthStart = new Date(mYear, MONTHS_ORDER.indexOf(m), 1);
            let activeInMonth = false;
            
            if (member.status === 'Active') {
                if (joinDate <= monthStart) activeInMonth = true;
            } else {
                const leaveDate = member.leaveDate ? new Date(member.leaveDate) : null;
                if (joinDate <= monthStart && (!leaveDate || leaveDate >= monthStart)) {
                    activeInMonth = true;
                }
            }

            if (!activeInMonth) {
                statusCell.innerHTML = `<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>`;
            } else {
                // Find collection status
                const c = state.collections.find(col => col.month === monthYear && col.memberId === member.id);
                let status = 'Not Paid';
                if (c) {
                    status = calculatePaymentStatus(c);
                }

                let dotClass = 'dot-notpaid';
                let initial = 'N';
                if (status === 'Paid') { dotClass = 'dot-paid'; initial = 'P'; }
                else if (status === 'Late') { dotClass = 'dot-late'; initial = 'L'; }
                else if (status === 'Partial') { dotClass = 'dot-partial'; initial = 'S'; } // Split/Partial
                
                statusCell.innerHTML = `
                    <div class="matrix-dot ${dotClass}" title="${member.name} - ${monthYear}: ${status}" 
                         onclick="openEditCollectionFromTracker('${monthYear}', '${member.id}')">
                        ${initial}
                    </div>
                `;
            }
            grid.appendChild(statusCell);
        });
    });

    container.appendChild(grid);
}

function openEditCollectionFromTracker(monthYear, memberId) {
    // Navigate to collections tab and pop modal
    const c = state.collections.find(col => col.month === monthYear && col.memberId === memberId);
    if (c) {
        openEditCollectionModal(monthYear, memberId);
    } else {
        // Create new
        document.getElementById('collection-modal-title').innerText = 'Log Roommate Payment';
        document.getElementById('collection-action').value = 'ADD';
        
        document.getElementById('collection-month').value = monthYear;
        document.getElementById('collection-month').disabled = true;
        document.getElementById('collection-member').value = memberId;
        document.getElementById('collection-member').disabled = true;
        
        document.getElementById('collection-standard').value = state.settings.defaultContribution;
        document.getElementById('collection-extra').value = 0;
        document.getElementById('collection-advance').value = 0;
        document.getElementById('collection-partial').value = 0;
        document.getElementById('collection-paydate').value = new Date().toISOString().split('T')[0];
        document.getElementById('collection-remarks').value = '';
        
        showModal('collection-modal');
    }
}

// 8. Analytics Tab
function renderAnalytics() {
    // 1. Calculations: highest, lowest, average bills
    const bills = state.utilities.map(u => {
        const sum = Number(u.water || 0) + Number(u.electricity || 0) + Number(u.internet || 0) + 
                    Number(u.gas || 0) + Number(u.cleaning || 0) + Number(u.other || 0);
        return { month: u.month, total: sum };
    }).filter(b => b.total > 0);

    let highestBill = 0, highestMonth = '-';
    let lowestBill = Infinity, lowestMonth = '-';
    let avgBill = 0;

    if (bills.length > 0) {
        bills.forEach(b => {
            if (b.total > highestBill) {
                highestBill = b.total;
                highestMonth = b.month;
            }
            if (b.total < lowestBill) {
                lowestBill = b.total;
                lowestMonth = b.month;
            }
        });
        avgBill = bills.reduce((sum, b) => sum + b.total, 0) / bills.length;
    } else {
        lowestBill = 0;
    }

    // Average member collections
    const collectionsPaid = state.collections.map(c => 
        Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0)
    ).filter(v => v > 0);
    const avgCollection = collectionsPaid.length > 0 
        ? collectionsPaid.reduce((sum, v) => sum + v, 0) / collectionsPaid.length 
        : 0;

    // Total outstanding LKR
    const outstandingSum = state.collections.reduce((sum, c) => {
        const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
        const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
        return sum + Math.max(0, expected - paid);
    }, 0);

    // Max Monthly Deficit
    const summaries = calculateMonthlySummaries();
    const maxDeficit = summaries.length > 0 ? Math.max(...summaries.map(s => s.deficit)) : 0;

    // Render Metrics
    document.getElementById('analytics-highest-bill').innerText = formatCurrency(highestBill);
    document.getElementById('analytics-highest-desc').innerText = `Month: ${highestMonth}`;
    
    document.getElementById('analytics-lowest-bill').innerText = formatCurrency(lowestBill === Infinity ? 0 : lowestBill);
    document.getElementById('analytics-lowest-desc').innerText = `Month: ${lowestMonth}`;
    
    document.getElementById('analytics-avg-bill').innerText = formatCurrency(avgBill);
    document.getElementById('analytics-avg-collection').innerText = formatCurrency(avgCollection);
    document.getElementById('analytics-total-outstanding').innerText = formatCurrency(outstandingSum);
    
    document.getElementById('analytics-max-deficit').innerText = formatCurrency(maxDeficit);

    // Member Ledger comparison table
    const tbody = document.getElementById('analytics-members-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        state.members.forEach(member => {
            const memberCollections = state.collections.filter(c => c.memberId === member.id);
            
            const totalRentPaid = memberCollections.reduce((sum, c) => sum + Number(c.partialPayment || 0), 0);
            const totalUtilitiesPaid = memberCollections.reduce((sum, c) => sum + Number(c.extraContribution || 0), 0);
            const roommateOutstanding = memberCollections.reduce((sum, c) => {
                const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
                const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
                return sum + Math.max(0, expected - paid);
            }, 0);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${member.name}</strong></td>
                <td>Room ${member.room || 'N/A'}</td>
                <td>${formatCurrency(totalRentPaid)}</td>
                <td>${formatCurrency(totalUtilitiesPaid)}</td>
                <td style="color: ${roommateOutstanding > 0 ? 'var(--color-notpaid)' : 'inherit'}; font-weight: ${roommateOutstanding > 0 ? '600' : 'normal'}">${formatCurrency(roommateOutstanding)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 9. Reports Tab Binder
let activeReport = 1;

function renderReports() {
    const list = document.getElementById('reports-menu-list');
    if (!list) return;
    
    list.innerHTML = '';
    const reportNames = [
        '1. Monthly Collection Summary',
        '2. Monthly Expense Breakdown',
        '3. Roommate Outstanding Balances',
        '4. Yearly Performance Summary',
        '5. Member Statement Report',
        '6. Miscellaneous Expense Master Log'
    ];

    reportNames.forEach((n, idx) => {
        const id = idx + 1;
        const btn = document.createElement('button');
        btn.className = `report-link-btn ${activeReport === id ? 'active' : ''}`;
        btn.onclick = () => selectReport(id);
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            ${n}
        `;
        list.appendChild(btn);
    });

    viewReportDetails();
}

function selectReport(id) {
    activeReport = id;
    renderReports();
}

function viewReportDetails() {
    const titleEl = document.getElementById('report-title');
    const subtitleEl = document.getElementById('report-subtitle');
    const container = document.getElementById('report-content-viewer');
    
    if (!container) return;
    
    container.innerHTML = '';
    const currentFY = state.settings.financialYear;

    // Show select controls wrapper (like roommate selector for member statement)
    const extraControls = document.getElementById('report-extra-controls');
    extraControls.style.display = 'none';

    if (activeReport === 1) {
        titleEl.innerText = 'Monthly Collection Summary Report';
        subtitleEl.innerText = `Aggregated roommate payment logs for Financial Year ${currentFY}`;
        
        let html = `
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Member Name</th>
                        <th>Rent Due</th>
                        <th>Utilities Due</th>
                        <th>Total Paid</th>
                        <th>Outstanding</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (state.collections.length === 0) {
            html += `<tr><td colspan="7" style="text-align:center;">No payment collection records available.</td></tr>`;
        } else {
            // Sort
            const sorted = [...state.collections].sort((a,b) => MONTHS_ORDER.indexOf(a.month.split(' ')[0]) - MONTHS_ORDER.indexOf(b.month.split(' ')[0]));
            
            sorted.forEach(c => {
                const totalPaid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
                const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
                const outstanding = Math.max(0, expected - totalPaid);
                const status = calculatePaymentStatus(c);
                
                let badgeClass = 'badge-notpaid';
                if (status === 'Paid') badgeClass = 'badge-paid';
                else if (status === 'Late') badgeClass = 'badge-late';
                else if (status === 'Partial') badgeClass = 'badge-partial';

                html += `
                    <tr>
                        <td><strong>${c.month}</strong></td>
                        <td>${c.memberName}</td>
                        <td>${formatCurrency(c.standardContribution)}</td>
                        <td>${formatCurrency(c.extraContribution)}</td>
                        <td><strong>${formatCurrency(totalPaid)}</strong></td>
                        <td style="color: ${outstanding > 0 ? 'var(--color-notpaid)' : 'inherit'}; font-weight: ${outstanding > 0 ? '600' : 'normal'}">${formatCurrency(outstanding)}</td>
                        <td><span class="badge ${badgeClass}">${status}</span></td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
    else if (activeReport === 2) {
        titleEl.innerText = 'Monthly Expense Breakdown Report';
        subtitleEl.innerText = `Utility bills aggregated breakdown for Financial Year ${currentFY}`;
        
        let html = `
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Water Bill</th>
                        <th>Electricity Bill</th>
                        <th>Internet Share</th>
                        <th>Cleaning & Gas</th>
                        <th>Other Expenses</th>
                        <th>Total Expenses</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        state.utilities.forEach(u => {
            const cleaningAndGas = Number(u.cleaning || 0) + Number(u.gas || 0);
            const total = Number(u.water || 0) + Number(u.electricity || 0) + Number(u.internet || 0) + 
                          Number(u.gas || 0) + Number(u.cleaning || 0) + Number(u.other || 0);
            
            html += `
                <tr>
                    <td><strong>${u.month}</strong></td>
                    <td>${formatCurrency(u.water)}</td>
                    <td>${formatCurrency(u.electricity)}</td>
                    <td>${formatCurrency(u.internet)}</td>
                    <td>${formatCurrency(cleaningAndGas)}</td>
                    <td>${formatCurrency(u.other)}</td>
                    <td><strong>${formatCurrency(total)}</strong></td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
    else if (activeReport === 3) {
        titleEl.innerText = 'Roommate Outstanding Balances Report';
        subtitleEl.innerText = `Outstanding debts listing by roommate and billing month`;
        
        let html = `
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Member Name</th>
                        <th>Expected Amount</th>
                        <th>Total Paid</th>
                        <th>Outstanding Balance</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        const outstandingRecords = state.collections.filter(c => {
            const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
            const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
            return expected > paid;
        });

        if (outstandingRecords.length === 0) {
            html += `<tr><td colspan="6" style="text-align:center; padding: 20px;">🎉 Great! There are no outstanding roommate balances!</td></tr>`;
        } else {
            outstandingRecords.forEach(c => {
                const totalPaid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
                const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
                const outstanding = expected - totalPaid;
                const status = calculatePaymentStatus(c);

                html += `
                    <tr>
                        <td><strong>${c.month}</strong></td>
                        <td><strong>${c.memberName}</strong></td>
                        <td>${formatCurrency(expected)}</td>
                        <td>${formatCurrency(totalPaid)}</td>
                        <td style="color: var(--color-notpaid); font-weight: bold;">${formatCurrency(outstanding)}</td>
                        <td><span class="badge badge-partial">${status}</span></td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
    else if (activeReport === 4) {
        titleEl.innerText = 'Yearly Performance Summary Report';
        subtitleEl.innerText = `Annual cash flow balances, collections rates and carry forward logs`;
        
        const summaries = calculateMonthlySummaries();
        let html = `
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Expected Collection</th>
                        <th>Actual Collection</th>
                        <th>Total Expenses</th>
                        <th>Net Cash Flow</th>
                        <th>Carry Forward</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        summaries.forEach(s => {
            const cashFlow = s.actualCollection - s.totalExpenses;
            html += `
                <tr>
                    <td><strong>${s.month}</strong></td>
                    <td>${formatCurrency(s.expectedCollection)}</td>
                    <td><strong>${formatCurrency(s.actualCollection)}</strong></td>
                    <td>${formatCurrency(s.totalExpenses)}</td>
                    <td style="color: ${cashFlow >= 0 ? 'var(--color-paid)' : 'var(--color-notpaid)'}; font-weight: 600;">
                        ${formatCurrency(cashFlow)}
                    </td>
                    <td><strong>${formatCurrency(s.carryForward)}</strong></td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
    else if (activeReport === 5) {
        titleEl.innerText = 'Member Statement Report';
        subtitleEl.innerText = `Select a roommate below to view their individual payment logs and outstanding statement`;
        
        // Show dropdown selector
        extraControls.style.display = 'block';
        
        const activeMemberId = document.getElementById('report-member-select').value;
        const member = state.members.find(m => m.id === activeMemberId);
        
        if (!member) {
            container.innerHTML = '<div style="padding: 40px; text-align:center;">Please select an active roommate to compile statement details.</div>';
            return;
        }

        const payments = state.collections.filter(c => c.memberId === member.id);

        let html = `
            <div style="margin-bottom: 20px; padding: 16px; background-color: var(--bg-app); border-radius: 8px;">
                <h4 style="margin-bottom: 8px;">Statement Account Details</h4>
                <p><strong>Member ID:</strong> ${member.id} &nbsp;|&nbsp; <strong>Room:</strong> ${member.room} &nbsp;|&nbsp; <strong>Phone:</strong> ${member.phone}</p>
                <p><strong>Status:</strong> ${member.status} &nbsp;|&nbsp; <strong>Contract Join Date:</strong> ${member.joinDate}</p>
            </div>
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Standard Contribution</th>
                        <th>Extra / Utilities</th>
                        <th>Total Rent Paid</th>
                        <th>Outstanding due</th>
                        <th>Payment Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (payments.length === 0) {
            html += `<tr><td colspan="7" style="text-align:center;">No payment records logged for this roommate.</td></tr>`;
        } else {
            let runningOutstanding = 0;
            payments.forEach(c => {
                const totalPaid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
                const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
                const outstanding = Math.max(0, expected - totalPaid);
                runningOutstanding += outstanding;
                const status = calculatePaymentStatus(c);

                let badgeClass = 'badge-notpaid';
                if (status === 'Paid') badgeClass = 'badge-paid';
                else if (status === 'Late') badgeClass = 'badge-late';
                else if (status === 'Partial') badgeClass = 'badge-partial';

                html += `
                    <tr>
                        <td><strong>${c.month}</strong></td>
                        <td>${formatCurrency(c.standardContribution)}</td>
                        <td>${formatCurrency(c.extraContribution)}</td>
                        <td><strong>${formatCurrency(totalPaid)}</strong></td>
                        <td style="color: ${outstanding > 0 ? 'var(--color-notpaid)' : 'inherit'}; font-weight: bold;">${formatCurrency(outstanding)}</td>
                        <td>${c.paymentDate || '-'}</td>
                        <td><span class="badge ${badgeClass}">${status}</span></td>
                    </tr>
                `;
            });
            
            // Add total outstanding
            html += `
                <tr style="font-weight: bold; background-color: var(--bg-app);">
                    <td colspan="4" style="text-align: right;">CUMULATIVE OUTSTANDING DUE:</td>
                    <td style="color: var(--color-notpaid);">${formatCurrency(runningOutstanding)}</td>
                    <td colspan="2"></td>
                </tr>
            `;
        }
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
    else if (activeReport === 6) {
        titleEl.innerText = 'Miscellaneous Expense Master Log Report';
        subtitleEl.innerText = `Full ledger history of non-utility operational expenditures`;
        
        let html = `
            <table class="custom-table">
                <thead>
                    <tr>
                        <th>Expense ID</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Paid To</th>
                        <th>Method</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (state.expenses.length === 0) {
            html += `<tr><td colspan="7" style="text-align:center;">No transactional expenditures recorded.</td></tr>`;
        } else {
            const sorted = [...state.expenses].sort((a,b) => new Date(a.date) - new Date(b.date));
            sorted.forEach(e => {
                html += `
                    <tr>
                        <td><strong>${e.id}</strong></td>
                        <td>${e.date}</td>
                        <td><span class="badge badge-late">${e.category}</span></td>
                        <td style="white-space: normal;">${e.description}</td>
                        <td><strong>${formatCurrency(e.amount)}</strong></td>
                        <td>${e.paidTo || '-'}</td>
                        <td>${e.method || '-'}</td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
}

function printReport() {
    window.print();
}

// 10. Settings Panel & JSON Porting
function loadSettingsFields() {
    document.getElementById('settings-currency').value = state.settings.currency;
    document.getElementById('settings-default-contrib').value = state.settings.defaultContribution;
    document.getElementById('settings-fy').value = state.settings.financialYear;
    document.getElementById('settings-start-month').value = state.settings.startMonth;
    document.getElementById('settings-max-members').value = state.settings.maxMembers;
    populateAuthSettingsForm();
}

async function saveSettings(event) {
    event.preventDefault();
    
    const currency = document.getElementById('settings-currency').value;
    const defaultContribution = Number(document.getElementById('settings-default-contrib').value);
    const financialYear = Number(document.getElementById('settings-fy').value);
    const startMonth = document.getElementById('settings-start-month').value;
    const maxMembers = Number(document.getElementById('settings-max-members').value);
    
    state.settings.currency = currency;
    state.settings.defaultContribution = defaultContribution;
    state.settings.financialYear = financialYear;
    state.settings.startMonth = startMonth;
    state.settings.maxMembers = maxMembers;
    
    await saveToStorage();
    showNotification('System variable configuration updated!');
    await initApp();
}

// Backup & Restore (JSON Porting)
function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `boarding_house_data_backup_${state.settings.financialYear}.json`);
    dlAnchorElem.click();
    showNotification('Data backup file downloaded!');
}

function triggerImportJSON() {
    document.getElementById('import-file-input').click();
}

async function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.members && parsed.collections && parsed.utilities && parsed.expenses && parsed.settings) {
                state = parsed;
                await saveToStorage();
                showNotification('Backup data imported successfully!');
                await initApp();
            } else {
                showNotification('Invalid backup file structure!', 'error');
            }
        } catch (err) {
            showNotification('Error parsing JSON backup file!', 'error');
        }
    };
    reader.readAsText(file);
}

async function executeClearDatabase() {
    state.members = [];
    state.collections = [];
    state.expenses = [];
    
    // Initialize blank utilities list
    state.utilities = MONTHS_ORDER.map(m => ({
        month: getMonthYearStr(m), water: 0, electricity: 0, internet: 0, gas: 0, cleaning: 0, other: 0, paidDate: '', paidBy: '', remarks: ''
    }));
    
    await saveToStorage();
    hideModal('reset-confirm-modal');
    showNotification('Database cleared completely.', 'error');
    await initApp();
}

// Dropdown Sync
function populateSelectDropdowns() {
    // Populate months in collections table filters
    const filterColMonth = document.getElementById('filter-collections-month');
    if (filterColMonth) {
        filterColMonth.innerHTML = '<option value="">All Months</option>';
        MONTHS_ORDER.forEach(m => {
            const str = getMonthYearStr(m);
            filterColMonth.innerHTML += `<option value="${str}">${str}</option>`;
        });
    }

    // Populate roommates in collections table filters
    const filterColMember = document.getElementById('filter-collections-member');
    if (filterColMember) {
        filterColMember.innerHTML = '<option value="">All Roommates</option>';
        state.members.forEach(m => {
            filterColMember.innerHTML += `<option value="${m.id}">${m.name} (Room ${m.room || 'N/A'})</option>`;
        });
    }

    // Populate months in collection log modal form
    const formColMonth = document.getElementById('collection-month');
    if (formColMonth) {
        const val = formColMonth.value;
        formColMonth.innerHTML = '';
        MONTHS_ORDER.forEach(m => {
            const str = getMonthYearStr(m);
            formColMonth.innerHTML += `<option value="${str}">${str}</option>`;
        });
        if (val) formColMonth.value = val;
    }

    // Populate roommates in collection log modal form
    const formColMember = document.getElementById('collection-member');
    if (formColMember) {
        const val = formColMember.value;
        formColMember.innerHTML = '';
        state.members.forEach(m => {
            formColMember.innerHTML += `<option value="${m.id}">${m.name} (Room ${m.room || 'N/A'})</option>`;
        });
        if (val) formColMember.value = val;
    }

    // Populate paid by roommates select in utilities modal
    const formUtilPaidBy = document.getElementById('utility-paidby');
    if (formUtilPaidBy) {
        const val = formUtilPaidBy.value;
        formUtilPaidBy.innerHTML = '<option value="">Not Paid / Select Roommate</option>';
        state.members.forEach(m => {
            formUtilPaidBy.innerHTML += `<option value="${m.name}">${m.name}</option>`;
        });
        if (val) formUtilPaidBy.value = val;
    }

    // Populate roommates dropdown in Reports Binder Select
    const reportMemberSelect = document.getElementById('report-member-select');
    if (reportMemberSelect) {
        const val = reportMemberSelect.value;
        reportMemberSelect.innerHTML = '';
        state.members.forEach(m => {
            reportMemberSelect.innerHTML += `<option value="${m.id}">${m.name} (Room ${m.room || 'N/A'})</option>`;
        });
        if (val) reportMemberSelect.value = val;
    }
}

// CSV/Excel Exporter utilities
function exportToCSV(type) {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (type === 'collections') {
        csvContent += "Month,Roommate,Standard Contribution,Extra Contribution,Advance Payment,Partial Payment,Total Paid,Outstanding,Payment Date,Status,Remarks\n";
        state.collections.forEach(c => {
            const paid = Number(c.partialPayment || 0) + Number(c.advancePayment || 0) + Number(c.extraContribution || 0);
            const expected = Number(c.standardContribution || 1000) + Number(c.extraContribution || 0);
            const out = Math.max(0, expected - paid);
            const status = calculatePaymentStatus(c);
            
            const row = [
                c.month,
                `"${c.memberName}"`,
                c.standardContribution,
                c.extraContribution,
                c.advancePayment,
                c.partialPayment,
                paid,
                out,
                c.paymentDate || '',
                status,
                `"${c.remarks || ''}"`
            ].join(",");
            csvContent += row + "\n";
        });
    } else if (type === 'utilities') {
        csvContent += "Month,Water,Electricity,Internet,Gas,Cleaning,Other,Total,Paid Date,Paid By,Remarks\n";
        state.utilities.forEach(u => {
            const total = Number(u.water || 0) + Number(u.electricity || 0) + Number(u.internet || 0) + 
                          Number(u.gas || 0) + Number(u.cleaning || 0) + Number(u.other || 0);
            const row = [
                u.month,
                u.water,
                u.electricity,
                u.internet,
                u.gas,
                u.cleaning,
                u.other,
                total,
                u.paidDate || '',
                u.paidBy || '',
                `"${u.remarks || ''}"`
            ].join(",");
            csvContent += row + "\n";
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `boarding_house_${type}_log_${state.settings.financialYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported CSV spreadsheet download started!');
}

// Modal Helpers
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
    }
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Tab Switching logic
document.addEventListener('DOMContentLoaded', () => {
    // Nav menu trigger
    const navLinks = document.querySelectorAll('.nav-link');
    const panes = document.querySelectorAll('.tab-pane');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-tab');
            
            navLinks.forEach(l => l.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            link.classList.add('active');
            const targetPane = document.getElementById(target);
            if (targetPane) targetPane.classList.add('active');
            
            // Reload settings forms when showing settings
            if (target === 'settings') {
                loadSettingsFields();
            }
            
            // Re-render chart canvas layout dimensions if switching back to dashboard
            if (target === 'dashboard') {
                renderDashboard();
            }
        });
    });

    // Theme Toggle Handler
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.body.setAttribute('data-theme', nextTheme);
            state.settings.theme = nextTheme;
            saveToStorage();
            
            themeBtn.innerHTML = nextTheme === 'dark'
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z"/></svg> Light Mode`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Dark Mode`;
            
            // Re-render dashboard charts for next theme contrasting colors
            const activePane = document.querySelector('.tab-pane.active');
            if (activePane && activePane.id === 'dashboard') {
                renderDashboard();
            }
        });
    }

    // Modal click-outside backdrop close
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => {
        b.addEventListener('click', (e) => {
            if (e.target === b) {
                hideModal(b.id);
            }
        });
    });

    // Check for clear hash URL command
    if (window.location.hash === '#clear') {
        localStorage.removeItem('boarding_house_data');
        window.location.hash = '';
        window.location.reload();
        return;
    }

    // Initial setup
    initApp();
});

/* ==========================================
   Authentication & Session Controller Logic
   ========================================== */
function showLoginScreen() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-wrapper').style.display = 'none';
}

function showAppScreen() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
}

function handleAuthExpiration() {
    localStorage.removeItem('boarding_house_token');
    showNotification('Session expired or unauthorized. Please sign in again.', 'error');
    showLoginScreen();
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error-msg');
    
    errorEl.style.display = 'none';
    errorEl.innerText = '';
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            localStorage.setItem('boarding_house_token', data.token);
            usernameInput.value = '';
            passwordInput.value = '';
            showNotification('Signed in successfully!', 'success');
            await initApp();
        } else {
            errorEl.innerText = data.message || 'Incorrect username or password.';
            errorEl.style.display = 'block';
        }
    } catch (e) {
        console.error('Login error:', e);
        errorEl.innerText = 'Unable to connect to the authentication server.';
        errorEl.style.display = 'block';
    }
}

async function handleLogout() {
    try {
        const token = localStorage.getItem('boarding_house_token');
        if (token) {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch (e) {
        console.warn('Logout connection error:', e);
    }
    
    localStorage.removeItem('boarding_house_token');
    showNotification('Signed out successfully.', 'success');
    window.location.reload();
}

function toggleLoginPasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const eyeOpen = document.getElementById('eye-open-icon');
    const eyeClosed = document.getElementById('eye-closed-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
}

function populateAuthSettingsForm() {
    const usernameEl = document.getElementById('settings-username');
    const passwordEl = document.getElementById('settings-password');
    if (usernameEl && passwordEl) {
        usernameEl.value = state.settings.username || 'admin';
        passwordEl.value = state.settings.password || 'admin123';
    }
}

async function saveAuthSettings(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('settings-username');
    const passwordInput = document.getElementById('settings-password');
    
    if (!usernameInput || !passwordInput) return;
    
    const newUsername = usernameInput.value.trim();
    const newPassword = passwordInput.value;
    
    if (!newUsername || !newPassword) {
        showNotification('Username and password cannot be empty.', 'error');
        return;
    }
    
    state.settings.username = newUsername;
    state.settings.password = newPassword;
    
    await saveToStorage();
    showNotification('Administrative credentials updated successfully!', 'success');
}
