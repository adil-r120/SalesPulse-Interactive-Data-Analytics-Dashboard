const API_BASE_URL = 'https://salespulse-interactive-data-analytics.onrender.com';

// Sales record structure
interface SalesRecordData {
  date: string;
  product: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
  region?: string;
  customer: string;
  [key: string]: unknown;
}

// Goal structure
interface GoalData {
  title: string;
  target_value: number;
  current_value: number;
  target_date: string;
  description?: string;
  [key: string]: unknown;
}

// API service class
class ApiService {
  // Get auth headers
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // GET request
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // POST request
  async post(endpoint: string, data: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // PUT request
  async put(endpoint: string, data: Record<string, unknown> | Partial<GoalData>) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // DELETE request
  async delete(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Upload file (FormData)
  async upload(endpoint: string, formData: FormData) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Login
  async login(username: string, password: string) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get profile
  async getProfile() {
    return this.get('/auth/profile');
  }

  // Dashboard overview
  async getOverview(filters?: { start_date?: string; end_date?: string }) {
    let endpoint = '/api/overview';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (params.toString()) endpoint += `?${params.toString()}`;
    }
    return this.get(endpoint);
  }

  // Revenue trend
  async getRevenueTrend(months: number = 12) {
    return this.get(`/api/revenue-trend?months=${months}`);
  }

  // Sales by category
  async getSalesByCategory() {
    return this.get('/api/sales-by-category');
  }

  // Revenue by region
  async getRevenueByRegion() {
    return this.get('/api/revenue-by-region');
  }

  // Get sales records
  async getSalesRecords(skip: number = 0, limit: number = 100) {
    return this.get(`/api/sales-records?skip=${skip}&limit=${limit}`);
  }

  // Create sales record
  async createSalesRecord(data: SalesRecordData) {
    return this.post('/api/sales-records', data);
  }

  // Delete sales record
  async deleteSalesRecord(id: string) {
    return this.delete(`/api/sales-records/${id}`);
  }

  // Get categories
  async getCategories() {
    return this.get('/api/categories');
  }

  // Get regions
  async getRegions() {
    return this.get('/api/regions');
  }

  // Generate AI insights
  async generateInsight(query: string) {
    return this.post('/api/insights', { query });
  }

  // Get insights
  async getInsights(limit: number = 10) {
    return this.get(`/api/insights?limit=${limit}`);
  }

  // Chat with AI
  async chatWithAI(message: string) {
    return this.post('/api/chat', { message });
  }

  // Get chat history
  async getChatHistory(limit: number = 20) {
    return this.get(`/api/chat/history?limit=${limit}`);
  }

  // Clear chat history
  async clearChatHistory() {
    return this.delete('/api/chat/history');
  }

  // AI status
  async getChatStatus() {
    return this.get('/api/chat/status');
  }

  // Get goals
  async getGoals(status?: string) {
    const endpoint = status ? `/api/reports/goals?status=${status}` : '/api/reports/goals';
    return this.get(endpoint);
  }

  // Create goal
  async createGoal(data: GoalData) {
    return this.post('/api/reports/goals', data);
  }

  // Update goal
  async updateGoal(id: string, data: Partial<GoalData>) {
    return this.put(`/api/reports/goals/${id}`, data);
  }

  // Delete goal
  async deleteGoal(id: string) {
    return this.delete(`/api/reports/goals/${id}`);
  }

  // Generate sales report
  async generateSalesReport(data: { start_date: string; end_date: string; format: string; include_charts: boolean }) {
    const response = await fetch(`${API_BASE_URL}/api/reports/sales`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.blob();
  }

  // Submit stock feedback
  async submitStockFeedback(data: { rating: number; feedback?: string; stock_symbol?: string }) {
    return this.post('/api/stock-feedback/', data);
  }

  // Get feedback stats
  async getFeedbackStats() {
    return this.get('/api/stock-feedback/stats');
  }
  // Get all users (Admin only)
  async getAllUsers() {
    return this.get('/auth/users');
  }

  // Update user role (Admin only)
  async updateUserRole(userId: string, role: string) {
    return this.put(`/auth/users/${userId}/role`, { role });
  }

  // Delete user (Admin only)
  async deleteUser(userId: string) {
    return this.delete(`/auth/users/${userId}`);
  }

  // Bulk actions on users (Admin only)
  async bulkUserAction(userIds: string[], action: string, role?: string) {
    return this.post('/auth/users/bulk-action', { user_ids: userIds, action, role });
  }

  // Send notification to users (Admin only)
  async notifyUsers(userIds: string[], title: string, message: string) {
    return this.post('/auth/users/notify', { user_ids: userIds, title, message });
  }

  // Get user activity stats (Admin only)
  async getUserActivity() {
    return this.get('/auth/users/activity');
  }

  // Get active sessions (Admin only)
  async getActiveSessions() {
    return this.get('/auth/users/sessions');
  }

  // Get login history (Admin only)
  async getLoginHistory(limit: number = 50) {
    return this.get(`/auth/users/login-history?limit=${limit}`);
  }
}

// API service singleton
export const apiService = new ApiService();
export default apiService;