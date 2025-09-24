// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  build: {
    assets: 'assets'
  },
  server: {
    port: 4323,
    host: true
  },
  vite: {
    server: {
      port: 4323,
      // Allow access from Cloudflare Tunnel (trycloudflare.com) and fix HMR over HTTPS
      // Vite blocks unknown hosts by default; adding allowedHosts enables tunnel domains.
      allowedHosts: ['.trycloudflare.com', '.loca.lt'],
      hmr: {
        // Required when accessing dev server via HTTPS reverse proxy/tunnel
        // so the client connects HMR over port 443 instead of the dev port.
        clientPort: 443,
        // Optional: if you plan to use LocalTunnel with a fixed subdomain, set host for HMR
        // host: 'komplekkita.loca.lt',
      },
      proxy: {
        // Development proxy - will be ignored in production
        '/api': {
          target: process.env.API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            // Add error handling for development
            proxy.on('error', (err, req, res) => {
              console.warn('Proxy error - Backend unavailable:', err.message);
              console.log('Fallback should be handled by fetch-wrapper');
              // Let the request fail so fetch-wrapper can handle fallback
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend service unavailable', fallback_available: true }));
            });
          }
        },
      },
    },
  },
});
