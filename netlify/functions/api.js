// Netlify serverless function to handle API requests in production
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

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/api', '');
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};

    console.log(`API Request: ${method} ${path}`, query);

    // Route requests
    if (path === '/komplek' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mockData.komplek)
      };
    }

    if (path.startsWith('/komplek/') && path.includes('/warga') && method === 'GET') {
      const komplekId = parseInt(path.split('/')[2]);
      const warga = mockData.warga.filter(w => w.komplek_id === komplekId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(warga)
      };
    }

    if (path.startsWith('/komplek/') && path.includes('/transaksi') && method === 'GET') {
      const komplekId = parseInt(path.split('/')[2]);
      const transaksi = mockData.transaksi.filter(t => t.komplek_id === komplekId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transaksi)
      };
    }

    if (path.startsWith('/komplek/') && path.includes('/dashboard') && method === 'GET') {
      const komplekId = parseInt(path.split('/')[2]);
      const transaksi = mockData.transaksi.filter(t => t.komplek_id === komplekId);
      const totalMasuk = transaksi.filter(t => t.jenis === 'masuk').reduce((sum, t) => sum + t.jumlah, 0);
      const totalKeluar = transaksi.filter(t => t.jenis === 'keluar').reduce((sum, t) => sum + t.jumlah, 0);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          totalKas: totalMasuk - totalKeluar,
          totalMasuk,
          totalKeluar,
          countTransaksi: transaksi.length
        })
      };
    }

    if (path === '/komplek/check' && method === 'GET') {
      const lat = parseFloat(query.lat || '0');
      const lng = parseFloat(query.lng || '0');
      const existing = mockData.komplek.find(k => 
        Math.abs(k.lat - lat) < 0.001 && Math.abs(k.lng - lng) < 0.001
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(existing ? { exists: true, name: existing.nama } : { exists: false })
      };
    }

    if (path.startsWith('/templates/') && method === 'GET') {
      const type = path.split('/').pop();
      const csvContent = type === 'keuangan' 
        ? 'Tanggal,Deskripsi,Kategori,Jenis,Jumlah\n2024-08-01,Contoh Pemasukan,Iuran,masuk,100000\n2024-08-02,Contoh Pengeluaran,Operasional,keluar,50000'
        : 'Nama,Alamat,No HP,Email,Status\nContoh Warga,Blok A No 1,081234567890,contoh@email.com,aktif';
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="template-${type}.csv"`
        },
        body: csvContent
      };
    }

    // Default response for unknown endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Endpoint not found', 
        path,
        message: 'This is a mock API endpoint' 
      })
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
