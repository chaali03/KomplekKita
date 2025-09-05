/**
 * Real-time Chart Updates for KomplekKita
 * This file provides functionality to update charts in real-time without page refresh
 */

/**
 * Initialize real-time chart updates
 */
function initRealTimeUpdates() {
  // Set up interval for periodic updates
  const updateInterval = 10000; // Update every 10 seconds
  
  // Function to fetch and update chart data
  function updateChartData() {
    // Get latest data from localStorage or other sources
    const financialData = getLatestFinancialData();
    
    // Update each chart with new data
    updateCashFlowChart(financialData);
    updateCompositionChart(financialData);
    updateExpenseCategoriesChart(financialData);
    updateMonthlyComparisonChart(financialData);
    updateIncomeExpenseAreaChart(financialData);
  }
  
  // Get latest financial data from localStorage or API
  function getLatestFinancialData() {
    try {
      // Try to get data from localStorage first
      const transactions = JSON.parse(localStorage.getItem('financial_transactions_v2') || '[]');
      
      // Calculate totals and summaries
      const totals = calculateTotals(transactions);
      const categories = calculateCategoryBreakdown(transactions);
      const monthlyData = calculateMonthlyData(transactions);
      
      return {
        totals: totals,
        categories: categories,
        monthly: monthlyData
      };
    } catch (error) {
      console.error('Error fetching financial data:', error);
      return {
        totals: { income: 0, expense: 0, balance: 0 },
        categories: [],
        monthly: []
      };
    }
  }
  
  // Calculate totals from transactions
  function calculateTotals(transactions) {
    let income = 0;
    let expense = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'Masuk') {
        income += parseFloat(tx.amount) || 0;
      } else if (tx.type === 'Keluar') {
        expense += parseFloat(tx.amount) || 0;
      }
    });
    
    return {
      income: income,
      expense: expense,
      balance: income - expense
    };
  }
  
  // Calculate category breakdown
  function calculateCategoryBreakdown(transactions) {
    const categories = {};
    
    transactions.forEach(tx => {
      const category = tx.category || 'Lainnya';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += parseFloat(tx.amount) || 0;
    });
    
    return Object.entries(categories).map(([name, amount]) => ({ name, amount }));
  }
  
  // Calculate monthly data
  function calculateMonthlyData(transactions) {
    const months = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expense: 0 };
      }
      
      if (tx.type === 'Masuk') {
        months[monthKey].income += parseFloat(tx.amount) || 0;
      } else if (tx.type === 'Keluar') {
        months[monthKey].expense += parseFloat(tx.amount) || 0;
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({
      month: month,
      income: data.income,
      expense: data.expense
    }));
  }
  
  // Update Cash Flow Chart
  function updateCashFlowChart(data) {
    const chart = window.dashboardCharts.get('chartKas');
    if (!chart) return;
    
    // Calculate cumulative balance for each month
    const monthlyData = data.monthly.sort((a, b) => a.month.localeCompare(b.month));
    const labels = monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'short' });
    });
    
    let cumulativeBalance = 0;
    const balanceData = monthlyData.map(m => {
      cumulativeBalance += (m.income - m.expense);
      return cumulativeBalance;
    });
    
    // Update chart data
    chart.data.labels = labels;
    chart.data.datasets[0].data = balanceData;
    chart.update();
  }
  
  // Update Composition Pie Chart
  function updateCompositionChart(data) {
    const chart = window.dashboardCharts.get('chartPie');
    if (!chart) return;
    
    chart.data.datasets[0].data = [data.totals.income, data.totals.expense];
    chart.update();
  }
  
  // Update Expense Categories Chart
  function updateExpenseCategoriesChart(data) {
    const chart = window.dashboardCharts.get('chartExpenseCategories');
    if (!chart) return;
    
    // Filter only expense categories
    const expenseCategories = data.categories
      .filter(cat => {
        // Assume categories like 'Iuran', 'Donasi' are income, others are expenses
        const name = cat.name.toLowerCase();
        return !['iuran', 'donasi', 'pemasukan'].includes(name);
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categories
    
    chart.data.labels = expenseCategories.map(cat => cat.name);
    chart.data.datasets[0].data = expenseCategories.map(cat => cat.amount);
    chart.update();
  }
  
  // Update Monthly Comparison Chart
  function updateMonthlyComparisonChart(data) {
    const chart = window.dashboardCharts.get('chartMonthlyComparison');
    if (!chart) return;
    
    const monthlyData = data.monthly.sort((a, b) => a.month.localeCompare(b.month)).slice(-6); // Last 6 months
    
    const labels = monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'short' });
    });
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = monthlyData.map(m => m.income);
    chart.data.datasets[1].data = monthlyData.map(m => m.expense);
    chart.update();
  }
  
  // Update Income vs Expense Area Chart
  function updateIncomeExpenseAreaChart(data) {
    const chart = window.dashboardCharts.get('chartIncomeExpenseArea');
    if (!chart) return;
    
    const monthlyData = data.monthly.sort((a, b) => a.month.localeCompare(b.month)).slice(-8); // Last 8 months
    
    const labels = monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'short' });
    });
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = monthlyData.map(m => m.income);
    chart.data.datasets[1].data = monthlyData.map(m => m.expense);
    chart.update();
  }
  
  // Listen for storage events to update charts when data changes
  window.addEventListener('storage', function(e) {
    if (e.key === 'financial_transactions_v2') {
      updateChartData();
    }
  });
  
  // Initial update
  updateChartData();
  
  // Set interval for periodic updates
  setInterval(updateChartData, updateInterval);
}

// Export function to global scope
window.initRealTimeUpdates = initRealTimeUpdates;