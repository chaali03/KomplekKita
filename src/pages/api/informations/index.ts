import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({
      success: true,
      data: [
        {
          id: 1,
          title: 'Jadwal Pemadaman Listrik',
          content: 'Akan ada pemadaman listrik pada tanggal 15 Oktober 2025 pukul 09.00-15.00 WIB untuk perawatan jaringan.',
          date: '2025-10-10',
          isImportant: true
        },
        {
          id: 2,
          title: 'Pembayaran Iuran Bulanan',
          content: 'Pembayaran iuran bulan Oktober 2025 dapat dilakukan mulai tanggal 1-10 Oktober 2025.',
          date: '2025-10-01',
          isImportant: true
        },
        {
          id: 3,
          title: 'Kegiatan Jumat Bersih',
          content: 'Akan diadakan kegiatan Jumat Bersih pada tanggal 18 Oktober 2025 pukul 07.00 WIB. Diwajibkan kehadiran perwakilan keluarga.',
          date: '2025-10-05',
          isImportant: false
        }
      ]
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};
