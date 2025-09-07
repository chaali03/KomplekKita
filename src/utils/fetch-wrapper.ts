// Production-ready fetch wrapper with fallback system
import { fetchWithMock } from './api-mock';

// Environment detection
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

// Enhanced fetch with automatic fallback
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Add default headers, but avoid forcing Content-Type for FormData
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const defaultHeaders: HeadersInit = {
    'Accept': 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  const defaultOptions: RequestInit = {
    ...options,
    headers: defaultHeaders
  };

  // In production, always use mock for API calls
  if (isProduction && url.startsWith('/api/')) {
    console.info(`Production mode: Using mock data for ${url}`);
    return fetchWithMock(url, defaultOptions);
  }

  // Special-case: always use mock for letter-templates during development
  if (!isProduction && url.startsWith('/api/letter-templates')) {
    return fetchWithMock(url, defaultOptions);
  }

  // In development, try real API first, then fallback to mock
  if (url.startsWith('/api/')) {
    try {
      const response = await fetch(url, defaultOptions);
      
      // If response is ok, return it
      if (response.ok) {
        return response;
      }
      
      // For any non-OK status in dev, fallback to mock
      console.warn(`API ${url} returned ${response.status}, trying mock fallback`);
      return fetchWithMock(url, defaultOptions);
      
    } catch (error) {
      console.warn(`API ${url} failed with error:`, error);
      console.info('Network error - falling back to mock data');
      // For network errors, always use mock
      return fetchWithMock(url, defaultOptions);
    }
  }

  // For non-API requests, use regular fetch
  return fetch(url, defaultOptions);
}

// Utility function to parse JSON safely
export async function safeJsonParse(response: Response): Promise<any> {
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return { error: 'Invalid JSON response' };
  }
}

// Combined fetch and parse function
export async function fetchJson(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await safeFetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
    }
    
    return safeJsonParse(response);
  } catch (error) {
    console.error(`fetchJson failed for ${url}:`, error);
    // Return a safe fallback object instead of throwing
    return { error: 'Request failed', url, details: error };
  }
}

// POST helper
export async function postJson(url: string, data: any, options: RequestInit = {}): Promise<any> {
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

// PUT helper
export async function putJson(url: string, data: any, options: RequestInit = {}): Promise<any> {
  return fetchJson(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
}

// DELETE helper
export async function deleteJson(url: string, options: RequestInit = {}): Promise<any> {
  return fetchJson(url, {
    method: 'DELETE',
    ...options
  });
}
