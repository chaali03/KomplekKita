import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({
      success: true,
      data: [
        {
          id: 1,
          title: 'Program Kebersihan Lingkungan',
          description: 'Program rutin pembersihan lingkungan komplek',
          date: '2025-10-15',
          status: 'active'
        },
        {
          id: 2,
          title: 'Posyandu Bulanan',
          description: 'Pemeriksaan kesehatan rutin untuk balita dan lansia',
          date: '2025-10-20',
          status: 'upcoming'
        },
        {
          id: 3,
          title: 'Kegiatan RT 01',
          description: 'Rapat rutin warga RT 01',
          date: '2025-10-25',
          status: 'upcoming'
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
