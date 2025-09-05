// API Client for connecting frontend to PHP backend
// Replaces localStorage-based logic with real API calls

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // For demo mode (admin pages), route to demo endpoints
    const urlBase = this.isDemoMode() ? this.baseUrl : this.baseUrl;
    const finalEndpoint = this.isDemoMode() && endpoint.startsWith('/finance/') ? endpoint.replace('/finance/', '/demo/finance/') : endpoint;
    const url = `${urlBase}${finalEndpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    // Only add auth header if token exists
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
      });

      // Handle BOM and parse JSON safely
      let responseText = await response.text();
      
      // Remove BOM if present
      if (responseText.charCodeAt(0) === 0xFEFF) {
        responseText = responseText.slice(1);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', responseText);
        return {
          success: false,
          error: 'Invalid JSON response from server',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Request failed',
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private isDemoMode(): boolean {
    // Enable demo mode for admin pages automatically
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        // Check if we're on an admin page
        if (path.includes('/admin/') || path.includes('/admin')) {
          return true;
        }
        // Also check localStorage for explicit toggle
        return localStorage.getItem('use_mock_api') === '1';
      }
      return false;
    } catch {
      return false;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse> {
    const result = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const dataAny: any = result.data || {};
    if (result.success && dataAny.token) {
      this.token = dataAny.token as string;
      localStorage.setItem('auth_token', dataAny.token as string);
      localStorage.setItem('auth_user', JSON.stringify(dataAny.user || {}));
    }

    return result;
  }

  async register(userData: any): Promise<ApiResponse> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse> {
    const result = await this.request('/logout', {
      method: 'POST',
    });

    if (result.success) {
      this.token = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }

    return result;
  }

  async getMe(): Promise<ApiResponse> {
    return this.request('/me');
  }

  // Finance methods
  async getTransactions(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/finance/transactions?${queryParams}`);
  }

  async createTransaction(transactionData: any): Promise<ApiResponse> {
    return this.request('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async updateTransaction(id: number, transactionData: any): Promise<ApiResponse> {
    return this.request(`/finance/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
  }

  async deleteTransaction(id: number): Promise<ApiResponse> {
    return this.request(`/finance/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async getFinancialSummary(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/finance/summary?${queryParams}`);
  }

  async calculateTotals(transactions: any[]): Promise<ApiResponse> {
    return this.request('/finance/calculate-totals', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
  }

  async applyFilters(transactions: any[], filters: any): Promise<ApiResponse> {
    return this.request('/finance/apply-filters', {
      method: 'POST',
      body: JSON.stringify({ transactions, filters }),
    });
  }

  // Warga methods
  async getWarga(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/warga?${queryParams}`);
  }

  async createWarga(wargaData: any): Promise<ApiResponse> {
    return this.request('/warga', {
      method: 'POST',
      body: JSON.stringify(wargaData),
    });
  }

  async getWargaById(id: number): Promise<ApiResponse> {
    return this.request(`/warga/${id}`);
  }

  async updateWarga(id: number, wargaData: any): Promise<ApiResponse> {
    return this.request(`/warga/${id}`, {
      method: 'PUT',
      body: JSON.stringify(wargaData),
    });
  }

  async deleteWarga(id: number): Promise<ApiResponse> {
    return this.request(`/warga/${id}`, {
      method: 'DELETE',
    });
  }

  async verifyWarga(id: number, verified: boolean): Promise<ApiResponse> {
    return this.request(`/warga/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified }),
    });
  }

  async addWargaDocument(wargaId: number, documentData: any): Promise<ApiResponse> {
    return this.request(`/warga/${wargaId}/documents`, {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  }

  async deleteWargaDocument(documentId: number): Promise<ApiResponse> {
    return this.request(`/warga/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async getWargaStatistics(): Promise<ApiResponse> {
    return this.request('/warga/statistics');
  }

  // Report methods
  async generateReport(reportData: any): Promise<ApiResponse> {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  async getReports(filters: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/reports?${queryParams}`);
  }

  // Iuran methods
  async getIuranStatus(periode?: string): Promise<ApiResponse> {
    const params = periode ? `?periode=${periode}` : '';
    return this.request(`/iuran/status${params}`);
  }

  async createOrUpdateIuran(nominal: number, periode: string): Promise<ApiResponse> {
    return this.request('/iuran/create-or-update', {
      method: 'POST',
      body: JSON.stringify({ nominal, periode }),
    });
  }

  async markWargaAsPaid(wargaId: number, periode: string): Promise<ApiResponse> {
    return this.request('/iuran/mark-paid', {
      method: 'POST',
      body: JSON.stringify({ warga_id: wargaId, periode }),
    });
  }

  async markWargaAsUnpaid(wargaId: number, periode: string): Promise<ApiResponse> {
    return this.request('/iuran/mark-unpaid', {
      method: 'POST',
      body: JSON.stringify({ warga_id: wargaId, periode }),
    });
  }

  async resetIuran(periode: string): Promise<ApiResponse> {
    return this.request('/iuran/reset', {
      method: 'POST',
      body: JSON.stringify({ periode }),
    });
  }

  async updateIuranNominal(nominal: number, periode: string): Promise<ApiResponse> {
    return this.request('/iuran/update-nominal', {
      method: 'POST',
      body: JSON.stringify({ nominal, periode }),
    });
  }

  async getReport(id: number): Promise<ApiResponse> {
    return this.request(`/reports/${id}`);
  }

  async updateReport(id: number, reportData: any): Promise<ApiResponse> {
    return this.request(`/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reportData),
    });
  }

  async deleteReport(id: number): Promise<ApiResponse> {
    return this.request(`/reports/${id}`, {
      method: 'DELETE',
    });
  }

  async exportReport(id: number, format: string = 'json'): Promise<ApiResponse> {
    return this.request(`/reports/${id}/export?format=${format}`);
  }

  async getReportStatistics(): Promise<ApiResponse> {
    return this.request('/reports/statistics');
  }

  // Komplek methods
  async registerKomplek(komplekData: any): Promise<ApiResponse> {
    return this.request('/register-komplek', {
      method: 'POST',
      body: JSON.stringify(komplekData),
    });
  }

  async checkComplexName(name: string): Promise<ApiResponse> {
    return this.request('/check-complex-name', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Utility methods
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiResponse };

// Export individual methods for backward compatibility
export const {
  login,
  register,
  logout,
  getMe,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinancialSummary,
  calculateTotals,
  applyFilters,
  getWarga,
  createWarga,
  getWargaById,
  updateWarga,
  deleteWarga,
  verifyWarga,
  addWargaDocument,
  deleteWargaDocument,
  getWargaStatistics,
  generateReport,
  getReports,
  getReport,
  updateReport,
  deleteReport,
  exportReport,
  getReportStatistics,
  registerKomplek,
  checkComplexName,
  getIuranStatus,
  createOrUpdateIuran,
  updateIuranNominal,
  markWargaAsPaid,
  markWargaAsUnpaid,
  resetIuran,
} = apiClient;
