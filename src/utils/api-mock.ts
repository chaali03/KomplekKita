// Mock API system for production deployment
// This replaces Laravel backend with client-side mock data

export interface KomplekData {
  id: number;
  nama: string;
  alamat: string;
  lat: number;
  lng: number;
  ketua_rt: string;
  ketua_rt_foto: string;
  bendahara: string;
  bendahara_foto: string;
  total_warga: number;
  created_at: string;
}

export interface WargaData {
  id: number;
  nama: string;
  alamat: string;
  no_hp: string;
  email: string;
  status: 'aktif' | 'nonaktif';
  komplek_id: number;
}

export interface TransaksiData {
  id: number;
  tanggal: string;
  deskripsi: string;
  kategori: string;
  jenis: 'masuk' | 'keluar';
  jumlah: number;
  komplek_id: number;
}

// Mock data storage
const mockData = {
  komplek: [
    {
      id: 1,
      nama: "Anggrek Asri",
      alamat: "Jl. Anggrek Mas Blok A, Tangerang",
      lat: -6.1701,
      lng: 106.6403,
      ketua_rt: "Ahmad Rahman",
      ketua_rt_foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      bendahara: "Dewi Sartika",
      bendahara_foto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      total_warga: 45,
      created_at: "2024-01-15"
    },
    {
      id: 2,
      nama: "Melati Indah",
      alamat: "Jl. Melati Raya No. 123, Jakarta Selatan",
      lat: -6.2088,
      lng: 106.8456,
      ketua_rt: "Budi Santoso",
      ketua_rt_foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      bendahara: "Siti Nurhaliza",
      bendahara_foto: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      total_warga: 32,
      created_at: "2024-02-10"
    }
  ] as KomplekData[],
  
  warga: [
    {
      id: 1,
      nama: "Ahmad Rahman",
      alamat: "Blok A No. 1",
      no_hp: "081234567890",
      email: "ahmad.rahman@email.com",
      status: "aktif" as const,
      komplek_id: 1
    },
    {
      id: 2,
      nama: "Dewi Sartika",
      alamat: "Blok A No. 2",
      no_hp: "081234567891",
      email: "dewi.sartika@email.com",
      status: "aktif" as const,
      komplek_id: 1
    }
  ] as WargaData[],
  
  transaksi: [
    {
      id: 1,
      tanggal: "2024-08-01",
      deskripsi: "Iuran Keamanan Agustus",
      kategori: "Keamanan",
      jenis: "masuk" as const,
      jumlah: 2500000,
      komplek_id: 1
    },
    {
      id: 2,
      tanggal: "2024-08-05",
      deskripsi: "Pembelian Peralatan Kebersihan",
      kategori: "Kebersihan",
      jenis: "keluar" as const,
      jumlah: 500000,
      komplek_id: 1
    }
  ] as TransaksiData[]
};

// API Mock Functions
export class ApiMock {
  private static delay(ms: number = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Komplek endpoints
  static async getKomplek(): Promise<KomplekData[]> {
    await this.delay();
    return mockData.komplek;
  }

  static async getKomplekById(id: number): Promise<KomplekData | null> {
    await this.delay();
    return mockData.komplek.find(k => k.id === id) || null;
  }

  static async checkKomplek(lat: number, lng: number): Promise<{exists: boolean, name?: string}> {
    await this.delay();
    const existing = mockData.komplek.find(k => 
      Math.abs(k.lat - lat) < 0.001 && Math.abs(k.lng - lng) < 0.001
    );
    return existing ? { exists: true, name: existing.nama } : { exists: false };
  }

  // Warga endpoints
  static async getWarga(komplekId?: number): Promise<WargaData[]> {
    await this.delay();
    return komplekId 
      ? mockData.warga.filter(w => w.komplek_id === komplekId)
      : mockData.warga;
  }

  static async createWarga(data: Omit<WargaData, 'id'>): Promise<WargaData> {
    await this.delay();
    const newWarga = {
      ...data,
      id: Math.max(...mockData.warga.map(w => w.id), 0) + 1
    };
    mockData.warga.push(newWarga);
    return newWarga;
  }

  // Transaksi endpoints
  static async getTransaksi(komplekId?: number): Promise<TransaksiData[]> {
    await this.delay();
    return komplekId 
      ? mockData.transaksi.filter(t => t.komplek_id === komplekId)
      : mockData.transaksi;
  }

  static async createTransaksi(data: Omit<TransaksiData, 'id'>): Promise<TransaksiData> {
    await this.delay();
    const newTransaksi = {
      ...data,
      id: Math.max(...mockData.transaksi.map(t => t.id), 0) + 1
    };
    mockData.transaksi.push(newTransaksi);
    return newTransaksi;
  }

  // Dashboard summary
  static async getDashboardSummary(komplekId: number) {
    await this.delay();
    const transaksi = mockData.transaksi.filter(t => t.komplek_id === komplekId);
    const totalMasuk = transaksi.filter(t => t.jenis === 'masuk').reduce((sum, t) => sum + t.jumlah, 0);
    const totalKeluar = transaksi.filter(t => t.jenis === 'keluar').reduce((sum, t) => sum + t.jumlah, 0);
    
    return {
      totalKas: totalMasuk - totalKeluar,
      totalMasuk,
      totalKeluar,
      countTransaksi: transaksi.length
    };
  }

  // Template downloads (mock)
  static async getTemplate(type: string): Promise<Blob> {
    await this.delay();
    const csvContent = type === 'keuangan' 
      ? 'Tanggal,Deskripsi,Kategori,Jenis,Jumlah\n2024-08-01,Contoh Pemasukan,Iuran,masuk,100000\n2024-08-02,Contoh Pengeluaran,Operasional,keluar,50000'
      : 'Nama,Alamat,No HP,Email,Status\nContoh Warga,Blok A No 1,081234567890,contoh@email.com,aktif';
    
    return new Blob([csvContent], { type: 'text/csv' });
  }
}

// Enhanced fetch wrapper with mock fallback
export async function fetchWithMock(url: string, options: RequestInit = {}): Promise<Response> {
  // In production or when backend is unavailable, use mock data
  if (url.startsWith('/api/')) {
    try {
      // Try real API first (for development)
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // If API fails, fall back to mock
      console.warn(`API ${url} failed, using mock data`);
      return handleMockRequest(url, options);
    } catch (error) {
      console.warn(`API ${url} error, using mock data:`, error);
      return handleMockRequest(url, options);
    }
  }
  
  // Non-API requests go through normally
  return fetch(url, options);
}

async function handleMockRequest(url: string, options: RequestInit): Promise<Response> {
  const method = options.method || 'GET';
  const urlObj = new URL(url, 'http://localhost');
  const path = urlObj.pathname;
  
  try {
    let data: any;
    
    // Route mock requests
    if (path === '/api/komplek') {
      data = await ApiMock.getKomplek();
    } else if (path.startsWith('/api/komplek/') && path.includes('/warga')) {
      const komplekId = parseInt(path.split('/')[3]);
      data = await ApiMock.getWarga(komplekId);
    } else if (path.startsWith('/api/komplek/') && path.includes('/transaksi')) {
      const komplekId = parseInt(path.split('/')[3]);
      data = await ApiMock.getTransaksi(komplekId);
    } else if (path.startsWith('/api/komplek/') && path.includes('/dashboard')) {
      const komplekId = parseInt(path.split('/')[3]);
      data = await ApiMock.getDashboardSummary(komplekId);
    } else if (path === '/api/komplek/check') {
      const lat = parseFloat(urlObj.searchParams.get('lat') || '0');
      const lng = parseFloat(urlObj.searchParams.get('lng') || '0');
      data = await ApiMock.checkKomplek(lat, lng);
    } else if (path.startsWith('/api/templates/')) {
      const type = path.split('/').pop();
      const blob = await ApiMock.getTemplate(type || 'keuangan');
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': 'text/csv' }
      });
    } else {
      // Default empty response for unknown endpoints
      data = { message: 'Mock endpoint not implemented', path };
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Mock API error', details: error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
