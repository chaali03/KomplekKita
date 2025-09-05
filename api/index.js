// Vercel serverless function to handle API requests in production
// This replaces the Laravel backend with mock responses

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
  ],
  
  warga: [
    {
      id: 1,
      nama: "Ahmad Rahman",
      alamat: "Blok A No. 1",
      no_hp: "081234567890",
      email: "ahmad.rahman@email.com",
      status: "aktif",
      komplek_id: 1
    },
    {
      id: 2,
      nama: "Dewi Sartika",
      alamat: "Blok A No. 2",
      no_hp: "081234567891",
      email: "dewi.sartika@email.com",
      status: "aktif",
      komplek_id: 1
    }
  ],
  
  transaksi: [
    {
      id: 1,
      tanggal: "2024-08-01",
      deskripsi: "Iuran Keamanan Agustus",
      kategori: "Keamanan",
      jenis: "masuk",
      jumlah: 2500000,
      komplek_id: 1
    },
    {
      id: 2,
      tanggal: "2024-08-05",
      deskripsi: "Pembelian Peralatan Kebersihan",
      kategori: "Kebersihan",
      jenis: "keluar",
      jumlah: 500000,
      komplek_id: 1
    }
  ]
};

// In-memory mock iuran storage keyed by periode (YYYY-MM)
const mockIuran = {
  // example: '2025-09': { nominal: 250000, total_warga: 40, payments: [{ warga_id: 1, warga_name: 'Demo', amount: 250000, payment_date: '2025-09-05', status:'paid', notes: '' }], created_at: '2025-09-01' }
};

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, method, query } = req;
    const path = url.replace('/api', '');

    console.log(`API Request: ${method} ${path}`, query);

    // Route requests
    if (path === '/komplek' && method === 'GET') {
      return res.status(200).json(mockData.komplek);
    }

    if (path.startsWith('/komplek/') && path.includes('/warga') && method === 'GET') {
      const komplekId = parseInt(path.split('/')[2]);
      const warga = mockData.warga.filter(w => w.komplek_id === komplekId);
      return res.status(200).json(warga);
    }

    if (path.startsWith('/komplek/') && path.includes('/transaksi') && method === 'GET') {
      const komplekId = parseInt(path.split('/')[2]);
      const transaksi = mockData.transaksi.filter(t => t.komplek_id === komplekId);
      return res.status(200).json(transaksi);
    }

    if (path.startsWith('/komplek/') && path.includes('/dashboard') && method === 'GET') {
      const komplekId = parseInt(path.split('/')[2]);
      const transaksi = mockData.transaksi.filter(t => t.komplek_id === komplekId);
      const totalMasuk = transaksi.filter(t => t.jenis === 'masuk').reduce((sum, t) => sum + t.jumlah, 0);
      const totalKeluar = transaksi.filter(t => t.jenis === 'keluar').reduce((sum, t) => sum + t.jumlah, 0);
      
      return res.status(200).json({
        totalKas: totalMasuk - totalKeluar,
        totalMasuk,
        totalKeluar,
        countTransaksi: transaksi.length
      });
    }

    if (path === '/komplek/check' && method === 'GET') {
      const lat = parseFloat(query.lat || '0');
      const lng = parseFloat(query.lng || '0');
      const existing = mockData.komplek.find(k => 
        Math.abs(k.lat - lat) < 0.001 && Math.abs(k.lng - lng) < 0.001
      );
      
      return res.status(200).json(existing ? { exists: true, name: existing.nama } : { exists: false });
    }

    // ==== IURAN (Mock) ====
    if (path.startsWith('/iuran/status') && method === 'GET') {
      const periode = (query.periode || new Date().toISOString().slice(0,7));
      const data = mockIuran[periode] || { nominal: 250000, total_warga: 40, payments: [], created_at: new Date().toISOString().slice(0,10) };
      const total_pemasukan = data.payments.reduce((s, p) => s + (p.amount || 0), 0);
      const target_pemasukan = (data.nominal || 0) * (data.total_warga || 0);
      const warga_sudah_bayar = data.payments.filter(p => p.status === 'paid').length;
      const warga_belum_bayar = Math.max(0, (data.total_warga || 0) - warga_sudah_bayar);
      const completion_percentage = target_pemasukan > 0 ? Math.round((total_pemasukan / target_pemasukan) * 100) : 0;
      const remaining_amount = Math.max(0, target_pemasukan - total_pemasukan);
      return res.status(200).json({
        success: true,
        data: {
          periode,
          nominal: data.nominal,
          total_warga: data.total_warga,
          warga_sudah_bayar,
          warga_belum_bayar,
          total_pemasukan,
          target_pemasukan,
          is_completed: remaining_amount === 0,
          is_closed: false,
          completion_percentage,
          remaining_amount,
          payments: data.payments
        }
      });
    }

    if (path === '/iuran/create-or-update' && method === 'POST') {
      const body = req.body || {};
      const periode = body.periode || new Date().toISOString().slice(0,7);
      const nominal = Number(body.nominal || 0);
      if (!mockIuran[periode]) mockIuran[periode] = { nominal, total_warga: 40, payments: [], created_at: new Date().toISOString().slice(0,10) };
      mockIuran[periode].nominal = nominal;
      return res.status(200).json({ success: true, data: mockIuran[periode] });
    }

    if (path === '/iuran/mark-paid' && method === 'POST') {
      const body = req.body || {};
      const periode = body.periode || new Date().toISOString().slice(0,7);
      const warga_id = Number(body.warga_id);
      if (!mockIuran[periode]) mockIuran[periode] = { nominal: 250000, total_warga: 40, payments: [], created_at: new Date().toISOString().slice(0,10) };
      const data = mockIuran[periode];
      const idx = data.payments.findIndex(p => p.id === warga_id || p.warga_id === warga_id);
      const amount = data.nominal || 0;
      const payment = { id: warga_id, warga_id, warga_name: `Warga ${warga_id}`, amount, payment_date: new Date().toISOString().slice(0,10), status: 'paid', notes: '' };
      if (idx >= 0) data.payments[idx] = payment; else data.payments.push(payment);
      return res.status(200).json({ success: true });
    }

    if (path === '/iuran/mark-unpaid' && method === 'POST') {
      const body = req.body || {};
      const periode = body.periode || new Date().toISOString().slice(0,7);
      const warga_id = Number(body.warga_id);
      if (!mockIuran[periode]) mockIuran[periode] = { nominal: 250000, total_warga: 40, payments: [], created_at: new Date().toISOString().slice(0,10) };
      const data = mockIuran[periode];
      const idx = data.payments.findIndex(p => p.id === warga_id || p.warga_id === warga_id);
      if (idx >= 0) data.payments.splice(idx, 1);
      return res.status(200).json({ success: true });
    }

    if (path === '/iuran/reset' && method === 'POST') {
      const body = req.body || {};
      const periode = body.periode || new Date().toISOString().slice(0,7);
      mockIuran[periode] = { nominal: 250000, total_warga: 40, payments: [], created_at: new Date().toISOString().slice(0,10) };
      return res.status(200).json({ success: true });
    }

    if (path.startsWith('/templates/') && method === 'GET') {
      const type = path.split('/').pop();
      const csvContent = type === 'keuangan' 
        ? 'Tanggal,Deskripsi,Kategori,Jenis,Jumlah\n2024-08-01,Contoh Pemasukan,Iuran,masuk,100000\n2024-08-02,Contoh Pengeluaran,Operasional,keluar,50000'
        : 'Nama,Alamat,No HP,Email,Status\nContoh Warga,Blok A No 1,081234567890,contoh@email.com,aktif';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="template-${type}.csv"`);
      return res.status(200).send(csvContent);
    }

    // Default response for unknown endpoints
    return res.status(404).json({ 
      error: 'Endpoint not found', 
      path,
      message: 'This is a mock API endpoint' 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
