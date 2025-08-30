// CDN fallback system for external dependencies
// Ensures the app works even if external CDNs fail

interface CDNResource {
  primary: string;
  fallback?: string;
  localPath?: string;
  test?: () => boolean;
}

const CDN_RESOURCES: Record<string, CDNResource> = {
  chartjs: {
    primary: 'https://cdn.jsdelivr.net/npm/chart.js',
    fallback: 'https://unpkg.com/chart.js',
    test: () => typeof window !== 'undefined' && !!(window as any).Chart
  },
  fontawesome: {
    primary: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    fallback: 'https://use.fontawesome.com/releases/v6.4.0/css/all.css'
  },
  aos: {
    primary: 'https://unpkg.com/aos@2.3.1/dist/aos.css',
    fallback: 'https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.css'
  },
  aosjs: {
    primary: 'https://unpkg.com/aos@2.3.1/dist/aos.js',
    fallback: 'https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.js',
    test: () => typeof window !== 'undefined' && !!(window as any).AOS
  },
  lottie: {
    primary: 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js',
    fallback: 'https://cdn.jsdelivr.net/npm/@lottiefiles/lottie-player/dist/lottie-player.js'
  },
  xlsx: {
    primary: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    fallback: 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
    test: () => typeof window !== 'undefined' && !!(window as any).XLSX
  },
  jspdf: {
    primary: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    fallback: 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
    test: () => typeof window !== 'undefined' && !!(window as any).jspdf
  },
  jspdfautotable: {
    primary: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
    fallback: 'https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'
  }
};

// Load script with fallback
export async function loadScript(resourceKey: string, timeout: number = 10000): Promise<boolean> {
  const resource = CDN_RESOURCES[resourceKey];
  if (!resource) {
    console.warn(`Unknown CDN resource: ${resourceKey}`);
    return false;
  }

  // Check if already loaded
  if (resource.test && resource.test()) {
    return true;
  }

  // Try primary CDN
  try {
    await loadScriptUrl(resource.primary, timeout);
    if (!resource.test || resource.test()) {
      return true;
    }
  } catch (error) {
    console.warn(`Primary CDN failed for ${resourceKey}:`, error);
  }

  // Try fallback CDN
  if (resource.fallback) {
    try {
      await loadScriptUrl(resource.fallback, timeout);
      if (!resource.test || resource.test()) {
        return true;
      }
    } catch (error) {
      console.warn(`Fallback CDN failed for ${resourceKey}:`, error);
    }
  }

  console.error(`All CDN sources failed for ${resourceKey}`);
  return false;
}

// Load CSS with fallback
export async function loadCSS(resourceKey: string): Promise<boolean> {
  const resource = CDN_RESOURCES[resourceKey];
  if (!resource) {
    console.warn(`Unknown CDN resource: ${resourceKey}`);
    return false;
  }

  // Try primary CDN
  try {
    await loadCSSUrl(resource.primary);
    return true;
  } catch (error) {
    console.warn(`Primary CDN failed for ${resourceKey}:`, error);
  }

  // Try fallback CDN
  if (resource.fallback) {
    try {
      await loadCSSUrl(resource.fallback);
      return true;
    } catch (error) {
      console.warn(`Fallback CDN failed for ${resourceKey}:`, error);
    }
  }

  console.error(`All CDN sources failed for ${resourceKey}`);
  return false;
}

// Helper: Load script from URL
function loadScriptUrl(url: string, timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    const timeoutId = setTimeout(() => {
      script.remove();
      reject(new Error(`Script load timeout: ${url}`));
    }, timeout);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      script.remove();
      reject(new Error(`Script load error: ${url}`));
    };

    document.head.appendChild(script);
  });
}

// Helper: Load CSS from URL
function loadCSSUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if CSS already exists
    const existing = document.querySelector(`link[href="${url}"]`);
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;

    const timeoutId = setTimeout(() => {
      link.remove();
      reject(new Error(`CSS load timeout: ${url}`));
    }, 10000);

    link.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    link.onerror = () => {
      clearTimeout(timeoutId);
      link.remove();
      reject(new Error(`CSS load error: ${url}`));
    };

    document.head.appendChild(link);
  });
}

// Preload critical resources
export async function preloadCriticalResources(): Promise<void> {
  const critical = ['fontawesome', 'aos'];
  
  await Promise.allSettled(
    critical.map(resource => loadCSS(resource))
  );
}

// Enhanced Chart.js loader with fallback
export async function ensureChartJS(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).Chart) {
    return true;
  }

  return loadScript('chartjs');
}

// Enhanced AOS loader with fallback
export async function ensureAOS(): Promise<boolean> {
  // Load CSS first
  await loadCSS('aos');
  
  // Then load JS
  return loadScript('aosjs');
}

// Enhanced XLSX loader with fallback
export async function ensureXLSX(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    return true;
  }

  return loadScript('xlsx');
}

// Enhanced jsPDF loader with fallback
export async function ensureJsPDF(): Promise<boolean> {
  const w = window as any;
  if (w.jspdf && w.jspdf.jsPDF && w.jspdf.autoTable) {
    return true;
  }

  // Load jsPDF first
  const jspdfLoaded = await loadScript('jspdf');
  if (!jspdfLoaded) return false;

  // Then load autoTable plugin
  return loadScript('jspdfautotable');
}
