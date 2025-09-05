import { apiClient } from '../utils/api-client';

interface IuranData {
  periode: string;
  total_warga: number;
  warga_sudah_bayar: number;
  warga_belum_bayar: number;
  nominal: number;
  total_pemasukan: number;
  target_pemasukan: number;
  is_completed: boolean;
  is_closed: boolean;
  completion_percentage: number;
  remaining_amount: number;
  payments: PaymentData[];
}

interface PaymentData {
  id: number;
  warga_id: number;
  warga_name: string;
  amount: number;
  payment_date: string | null;
  status: 'paid' | 'unpaid';
  notes: string | null;
}

class IuranManager {
  private currentData: IuranData | null = null;
  private currentPeriode: string = '';

  constructor() {
    this.currentPeriode = new Date().toISOString().slice(0, 7); // YYYY-MM format
  }

  async loadIuranData(periode?: string): Promise<IuranData | null> {
    try {
      const response = await apiClient.getIuranStatus(periode || this.currentPeriode);
      
      if (response.success) {
        this.currentData = response.data;
        this.currentPeriode = response.data.periode;
        return this.currentData;
      } else {
        console.error('Failed to load iuran data:', response.message);
        return null;
      }
    } catch (error) {
      console.error('Error loading iuran data:', error);
      return null;
    }
  }

  async saveIuran(nominal: number, periode?: string): Promise<boolean> {
    try {
      const response = await apiClient.createOrUpdateIuran(nominal, periode || this.currentPeriode);
      
      if (response.success) {
        // Reload data after saving
        await this.loadIuranData(periode || this.currentPeriode);
        return true;
      } else {
        console.error('Failed to save iuran:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error saving iuran:', error);
      return false;
    }
  }

  async updateNominal(nominal: number, periode?: string): Promise<boolean> {
    try {
      const response = await apiClient.updateIuranNominal(nominal, periode || this.currentPeriode);
      
      if (response.success) {
        // Reload data after updating
        await this.loadIuranData(periode || this.currentPeriode);
        return true;
      } else {
        console.error('Failed to update iuran nominal:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error updating iuran nominal:', error);
      return false;
    }
  }

  async markWargaAsPaid(wargaId: number, periode?: string): Promise<boolean> {
    try {
      const response = await apiClient.markWargaAsPaid(wargaId, periode || this.currentPeriode);
      
      if (response.success) {
        // Reload data after marking as paid
        await this.loadIuranData(periode || this.currentPeriode);
        return true;
      } else {
        console.error('Failed to mark warga as paid:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error marking warga as paid:', error);
      return false;
    }
  }

  async markWargaAsUnpaid(wargaId: number, periode?: string): Promise<boolean> {
    try {
      const response = await apiClient.markWargaAsUnpaid(wargaId, periode || this.currentPeriode);
      
      if (response.success) {
        // Reload data after marking as unpaid
        await this.loadIuranData(periode || this.currentPeriode);
        return true;
      } else {
        console.error('Failed to mark warga as unpaid:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error marking warga as unpaid:', error);
      return false;
    }
  }

  async resetIuran(periode?: string): Promise<boolean> {
    try {
      const response = await apiClient.resetIuran(periode || this.currentPeriode);
      
      if (response.success) {
        // Reload data after reset
        await this.loadIuranData(periode || this.currentPeriode);
        return true;
      } else {
        console.error('Failed to reset iuran:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error resetting iuran:', error);
      return false;
    }
  }

  getCurrentData(): IuranData | null {
    return this.currentData;
  }

  getCurrentPeriode(): string {
    return this.currentPeriode;
  }

  setPeriode(periode: string): void {
    this.currentPeriode = periode;
  }

  // Helper methods for UI
  getPaidWargas(): PaymentData[] {
    if (!this.currentData) return [];
    return this.currentData.payments.filter(payment => payment.status === 'paid');
  }

  getUnpaidWargas(): PaymentData[] {
    if (!this.currentData) return [];
    return this.currentData.payments.filter(payment => payment.status === 'unpaid');
  }

  isAllWargaPaid(): boolean {
    return this.currentData?.is_completed || false;
  }

  getCompletionPercentage(): number {
    return this.currentData?.completion_percentage || 0;
  }

  getRemainingAmount(): number {
    return this.currentData?.remaining_amount || 0;
  }

  getTotalPemasukan(): number {
    return this.currentData?.total_pemasukan || 0;
  }

  getTargetPemasukan(): number {
    return this.currentData?.target_pemasukan || 0;
  }

  getNominal(): number {
    return this.currentData?.nominal || 0;
  }

  getTotalWarga(): number {
    return this.currentData?.total_warga || 0;
  }

  getWargaSudahBayar(): number {
    return this.currentData?.warga_sudah_bayar || 0;
  }

  getWargaBelumBayar(): number {
    return this.currentData?.warga_belum_bayar || 0;
  }
}

// Create singleton instance
export const iuranManager = new IuranManager();

// Export types
export type { IuranData, PaymentData };
