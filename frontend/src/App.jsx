import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedUser, setSelectedUser] = useState(1);
  
  // Form states
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', monthly_budget: '' });
  const [newTransaction, setNewTransaction] = useState({ 
    user_id: '', 
    category_id: '', 
    amount: '', 
    description: '', 
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'expense'
  });
  const [newBudget, setNewBudget] = useState({ 
    user_id: '', 
    category_id: '', 
    amount: '', 
    month_year: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch data based on active tab
  useEffect(() => {
    fetchUsers();
    fetchCategories();
    
    switch (activeTab) {
      case 'transactions':
        fetchTransactions();
        break;
      case 'budgets':
        fetchBudgets();
        break;
      case 'analytics':
        fetchAnalyticsData();
        break;
      case 'dashboard':
        fetchDashboard();
        break;
      default:
        break;
    }
  }, [activeTab, selectedUser]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/`);
      setUsers(res.data);
    } catch (err) {
      setMessage('Error fetching users');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories/`);
      setCategories(res.data);
    } catch (err) {
      setMessage('Error fetching categories');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/transactions/`, {
        params: { user_id: selectedUser }
      });
      setTransactions(res.data);
    } catch (err) {
      setMessage('Error fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await axios.get(`${API_BASE}/budgets/`, {
        params: { user_id: selectedUser }
      });
      setBudgets(res.data);
    } catch (err) {
      setMessage('Error fetching budgets');
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const [summaryRes, expenseRes, budgetRes, categoryRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/monthly-summary`, { params: { user_id: selectedUser } }),
        axios.get(`${API_BASE}/analytics/expense-summary`, { params: { user_id: selectedUser } }),
        axios.get(`${API_BASE}/analytics/budget-vs-actual`, { params: { user_id: selectedUser } }),
        axios.get(`${API_BASE}/analytics/category-analysis`, { params: { user_id: selectedUser } })
      ]);
      
      setAnalytics({
        monthlySummary: summaryRes.data,
        expenseSummary: expenseRes.data,
        budgetVsActual: budgetRes.data,
        categoryAnalysis: categoryRes.data
      });
    } catch (err) {
      setMessage('Error fetching analytics');
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard`, {
        params: { user_id: selectedUser }
      });
      setAnalytics(prev => ({ ...prev, dashboard: res.data }));
    } catch (err) {
      setMessage('Error fetching dashboard');
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.full_name) {
      setMessage('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/users/`, newUser);
      setMessage('User created successfully!');
      setNewUser({ username: '', email: '', full_name: '', monthly_budget: '' });
      fetchUsers();
    } catch (err) {
      setMessage('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async () => {
    if (!newTransaction.user_id || !newTransaction.category_id || !newTransaction.amount) {
      setMessage('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/transactions/`, {
        ...newTransaction,
        user_id: parseInt(newTransaction.user_id),
        category_id: parseInt(newTransaction.category_id),
        amount: parseFloat(newTransaction.amount)
      });
      setMessage('Transaction added successfully!');
      setNewTransaction({ 
        user_id: '', 
        category_id: '', 
        amount: '', 
        description: '', 
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'expense'
      });
      fetchTransactions();
      fetchDashboard();
    } catch (err) {
      setMessage('Error adding transaction');
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async () => {
    if (!newBudget.user_id || !newBudget.category_id || !newBudget.amount) {
      setMessage('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/budgets/`, {
        ...newBudget,
        user_id: parseInt(newBudget.user_id),
        category_id: parseInt(newBudget.category_id),
        amount: parseFloat(newBudget.amount)
      });
      setMessage('Budget created successfully!');
      setNewBudget({ 
        user_id: '', 
        category_id: '', 
        amount: '', 
        month_year: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
      });
      fetchBudgets();
    } catch (err) {
      setMessage('Error creating budget');
    } finally {
      setLoading(false);
    }
  };

  const searchTransactions = async () => {
    if (!searchQuery) {
      setMessage('Please enter search query');
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/analytics/search-transactions`, {
        params: { query: searchQuery, user_id: selectedUser }
      });
      setSearchResults(res.data);
      setMessage(`Found ${res.data.length} transactions`);
    } catch (err) {
      setMessage('Error searching transactions');
    }
  };

  const exportMonthlyReport = async () => {
    const monthYear = prompt('Enter month and year (YYYY-MM):', new Date().toISOString().slice(0, 7));
    if (monthYear) {
      try {
        const response = await axios.get(`${API_BASE}/analytics/export-monthly-report`, {
          params: { user_id: selectedUser, month_year: `${monthYear}-01` },
          responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `financial_report_${monthYear}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setMessage('Report exported successfully!');
      } catch (err) {
        setMessage('Error exporting report');
      }
    }
  };

  const generateMonthlyReport = async () => {
    const monthYear = prompt('Enter month and year (YYYY-MM):', new Date().toISOString().slice(0, 7));
    if (monthYear) {
      try {
        await axios.post(`${API_BASE}/analytics/generate-report`, null, {
          params: { user_id: selectedUser, month_year: `${monthYear}-01` }
        });
        setMessage('Monthly report generated successfully!');
      } catch (err) {
        setMessage('Error generating report');
      }
    }
  };

  const getAmountColor = (type) => {
    return type === 'income' ? 'text-green-400' : 'text-red-400';
  };

  const getBudgetStatusColor = (status) => {
    switch (status) {
      case 'Over Budget': return 'text-red-400';
      case 'On Budget': return 'text-green-400';
      case 'Under Budget': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-500 mb-4">
            💰 Personal Finance Tracker
          </h1>
          <p className="text-white text-lg">
            Track your income, expenses, and budgets with advanced analytics
          </p>
        </div>

        {/* User Selection */}
        <div className="bg-gray-950 rounded-xl p-4 mb-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-purple-300 font-semibold">Select User:</span>
              <select 
                value={selectedUser}
                onChange={(e) => setSelectedUser(parseInt(e.target.value))}
                className="bg-black border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} - {user.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-purple-300">
              <span className="text-white">Monthly Budget: </span>
              ${users.find(u => u.id === selectedUser)?.monthly_budget || 0}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-950 rounded-xl p-2 mb-8 border border-gray-800">
          <div className="flex space-x-2">
            {['dashboard', 'transactions', 'budgets', 'analytics', 'reports', 'search'].map(tab => (
              <button
                key={tab}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-purple-300 hover:bg-black hover:text-white'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.includes('Error') 
              ? 'bg-red-900/20 border-red-500 text-red-200'
              : 'bg-green-900/20 border-green-500 text-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 bg-purple-600 rounded-lg text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
              Loading...
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && analytics.dashboard && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 border border-green-500/30 rounded-xl p-6 text-center shadow-lg">
                <div className="text-green-400 text-sm font-semibold mb-2">Total Income</div>
                <div className="text-3xl font-bold text-white">
                  ${analytics.dashboard.summary?.total_income || 0}
                </div>
              </div>
              <div className="bg-gray-950 border border-red-500/30 rounded-xl p-6 text-center shadow-lg">
                <div className="text-red-400 text-sm font-semibold mb-2">Total Expenses</div>
                <div className="text-3xl font-bold text-white">
                  ${analytics.dashboard.summary?.total_expenses || 0}
                </div>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-center shadow-lg">
                <div className="text-white text-sm font-semibold mb-2">Net Balance</div>
                <div className={`text-3xl font-bold ${
                  (analytics.dashboard.summary?.net_balance || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${analytics.dashboard.summary?.net_balance || 0}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Transactions */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
                <div className="space-y-3">
                  {analytics.dashboard.recent_transactions?.slice(0, 5).map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-black rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: transaction.color }}
                        ></div>
                        <div>
                          <div className="text-white font-semibold">{transaction.category_name}</div>
                          <div className="text-gray-400 text-sm">{transaction.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={getAmountColor(transaction.type)}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Category Breakdown</h2>
                <div className="space-y-4">
                  {analytics.dashboard.category_breakdown
                    ?.filter(cat => cat.total_amount > 0)
                    .map(category => (
                    <div key={category.category_name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-white">{category.category_name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">${category.total_amount}</div>
                        <div className="text-gray-400 text-sm">{category.transaction_count} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Add Transaction Form */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Add New Transaction</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <select
                  value={newTransaction.user_id}
                  onChange={(e) => setNewTransaction({...newTransaction, user_id: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
                
                <select
                  value={newTransaction.category_id}
                  onChange={(e) => setNewTransaction({...newTransaction, category_id: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                
                <input
                  type="number"
                  placeholder="Amount"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                
                <input
                  type="date"
                  value={newTransaction.transaction_date}
                  onChange={(e) => setNewTransaction({...newTransaction, transaction_date: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                />
                
                <button 
                  onClick={createTransaction}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors"
                >
                  Add
                </button>
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                className="mt-4 w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Transactions Table */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">All Transactions</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-white font-semibold">Date</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Category</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Description</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Type</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(transaction => (
                      <tr key={transaction.id} className="border-b border-purple-500/10 hover:bg-black">
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.color }}
                            ></div>
                            <span className="text-white">{transaction.category_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{transaction.description}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === 'income' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-semibold ${getAmountColor(transaction.type)}`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div className="space-y-6">
            {/* Add Budget Form */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Set Monthly Budget</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={newBudget.user_id}
                  onChange={(e) => setNewBudget({...newBudget, user_id: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
                
                <select
                  value={newBudget.category_id}
                  onChange={(e) => setNewBudget({...newBudget, category_id: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Category</option>
                  {categories.filter(c => c.type === 'expense').map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                
                <input
                  type="number"
                  placeholder="Budget Amount"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({...newBudget, amount: e.target.value})}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                
                <button 
                  onClick={createBudget}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors"
                >
                  Set Budget
                </button>
              </div>
            </div>

            {/* Budgets Table */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Current Budgets</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-white font-semibold">Category</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Month</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Budgeted</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map(budget => (
                      <tr key={budget.id} className="border-b border-purple-500/10 hover:bg-black">
                        <td className="py-3 px-4 text-white font-semibold">{budget.category_name}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(budget.month_year).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-white">${budget.amount}</td>
                        <td className="py-3 px-4">
                          <span className="text-green-400 font-semibold">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Monthly Summary */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Monthly Financial Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-white font-semibold">Month</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Income</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Expenses</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Net Balance</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Remaining Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.monthlySummary?.map(summary => (
                      <tr key={`${summary.user_id}-${summary.month_year}`} className="border-b border-purple-500/10 hover:bg-black">
                        <td className="py-3 px-4 text-white">
                          {new Date(summary.month_year).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-green-400">${summary.total_income}</td>
                        <td className="py-3 px-4 text-red-400">${summary.total_expenses}</td>
                        <td className={`py-3 px-4 font-semibold ${
                          summary.net_balance >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${summary.net_balance}
                        </td>
                        <td className={`py-3 px-4 ${
                          summary.remaining_budget >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${summary.remaining_budget}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Budget vs Actual */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Budget vs Actual Spending</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-white font-semibold">Category</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Month</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Budgeted</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Actual</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Difference</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.budgetVsActual?.map(item => (
                      <tr key={`${item.category_name}-${item.month_year}`} className="border-b border-purple-500/10 hover:bg-black">
                        <td className="py-3 px-4 text-white font-semibold">{item.category_name}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(item.month_year).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-white">${item.budgeted_amount}</td>
                        <td className="py-3 px-4 text-white">${item.actual_spent}</td>
                        <td className={`py-3 px-4 font-semibold ${
                          item.difference >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${item.difference}
                        </td>
                        <td className={`py-3 px-4 font-semibold ${getBudgetStatusColor(item.status)}`}>
                          {item.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-center shadow-lg">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-white mb-2">Export Monthly Report</h3>
                <p className="text-gray-400 mb-4">Download detailed financial report as CSV</p>
                <button 
                  onClick={exportMonthlyReport}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors"
                >
                  Export CSV
                </button>
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-center shadow-lg">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="text-xl font-bold text-white mb-2">Generate Analytics Report</h3>
                <p className="text-gray-400 mb-4">Run stored procedure for detailed analysis</p>
                <button 
                  onClick={generateMonthlyReport}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors"
                >
                  Generate Report
                </button>
              </div>
            </div>

            {/* Category Analysis */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Category Analysis (GROUP BY)</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-white font-semibold">Category</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Type</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Transactions</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Total Amount</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categoryAnalysis?.map(category => (
                      <tr key={category.category_name} className="border-b border-purple-500/10 hover:bg-black">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="text-white font-semibold">{category.category_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            category.type === 'income' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {category.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{category.transaction_count || 0}</td>
                        <td className={`py-3 px-4 font-semibold ${
                          category.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${category.total_amount || 0}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          ${category.avg_amount ? category.avg_amount.toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Search Transactions (LIKE Operator)</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search transaction descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <button 
                  onClick={searchTransactions}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg px-8 py-3 transition-colors"
                >
                  Search
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-white font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-white font-semibold">Category</th>
                        <th className="text-left py-3 px-4 text-white font-semibold">Description</th>
                        <th className="text-left py-3 px-4 text-white font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map(transaction => (
                        <tr key={transaction.id} className="border-b border-purple-500/10 hover:bg-black">
                          <td className="py-3 px-4 text-gray-300">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-white">{transaction.category_name}</td>
                          <td className="py-3 px-4 text-gray-300">{transaction.description}</td>
                          <td className={`py-3 px-4 font-semibold ${getAmountColor(transaction.type)}`}>
                            ${transaction.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;