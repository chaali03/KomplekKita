// Lightweight fetch helpers for client-side usage
// Exports: fetchJson(url, options?), safeFetch(url, options?)

export async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, { cache: 'no-store', ...options });
    return res;
  } catch (e) {
    console.error('[fetch-wrapper] fetch failed:', e);
    throw e;
  }
}

export async function fetchJson(url, options = {}) {
  const res = await safeFetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${res.statusText} for ${url}\n${text}`);
    console.error('[fetch-wrapper] bad status:', err);
    throw err;
  }
  try {
    return await res.json();
  } catch (e) {
    console.error('[fetch-wrapper] invalid JSON:', e);
    throw e;
  }
}
