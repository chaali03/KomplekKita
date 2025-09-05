/**
 * Admin Dashboard JavaScript
 * Modern UI/UX Dashboard functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize sidebar toggle functionality
  initSidebar();
  
  // Initialize charts if Chart.js is available
  if (typeof Chart !== 'undefined') {
    initCharts();
    initSparklines();
    initChartCardActions();
    // Start real-time chart updates
    initRealTimeUpdates();
  }
  // If Chart.js wasn't ready yet, wait for a later signal and then init once
  if (typeof Chart === 'undefined') {
    const onChartsReady = () => {
      // Avoid double init
      if (window.dashboardCharts && window.dashboardCharts.size > 0) return;
      if (typeof Chart === 'undefined') return;
      initCharts();
      initSparklines();
      initChartCardActions();
      // Start real-time chart updates
      initRealTimeUpdates();
      window.removeEventListener('charts-ready', onChartsReady);
    };
    window.addEventListener('charts-ready', onChartsReady);
    // Safety re-check in case Chart loads without event
    setTimeout(onChartsReady, 1500);
  }
  
  // Initialize other UI features
  initTopbarElevation();
  initAnimations();
  initCounters();
  initTooltips();
  initDataTables();
  // initPremiumLocks(); // Disabled - all features unlocked
});

/**
 * Elevate topbar when scrolling
 */
function initTopbarElevation() {
  const topbar = document.querySelector('.admin-topbar');
  if (!topbar) return;
  const handler = () => {
    if (window.scrollY > 2) topbar.classList.add('elevated');
    else topbar.classList.remove('elevated');
  };
  handler();
  window.addEventListener('scroll', handler, { passive: true });
}

/**
 * Initialize sidebar interactions (idempotent)
 */
function initSidebar() {
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const adminSidebar = document.querySelector('.admin-sidebar');
  const adminFrame = document.querySelector('.admin-frame');

  // Toggle sidebar expand/collapse
  if (sidebarToggle && !sidebarToggle.dataset.bound) {
    sidebarToggle.dataset.bound = '1';
    sidebarToggle.addEventListener('click', () => {
      if (adminSidebar) adminSidebar.classList.toggle('collapsed');
      if (adminFrame) adminFrame.classList.toggle('expanded');
      const icon = sidebarToggle.querySelector('i');
      if (icon && adminSidebar) {
        if (adminSidebar.classList.contains('collapsed')) {
          icon.classList.remove('fa-chevron-left');
          icon.classList.add('fa-chevron-right');
        } else {
          icon.classList.remove('fa-chevron-right');
          icon.classList.add('fa-chevron-left');
        }
      }
    });
  }

  // Section toggles
  const sectionToggles = document.querySelectorAll('.section-toggle');
  sectionToggles.forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      const expanded = target.getAttribute('aria-expanded') === 'true';
      target.setAttribute('aria-expanded', String(!expanded));
      const targetId = target.getAttribute('aria-controls');
      const targetList = targetId ? document.getElementById(targetId) : null;
      if (targetList) {
        if (expanded) {
          targetList.style.maxHeight = '0';
          targetList.classList.add('collapsed');
        } else {
          targetList.style.maxHeight = targetList.scrollHeight + 'px';
          targetList.classList.remove('collapsed');
        }
      }
      const icon = target.querySelector('.toggle-icon');
      if (icon) {
        const isExpanding = !expanded;
        icon.classList.remove(isExpanding ? 'fa-chevron-down' : 'fa-chevron-up');
        icon.classList.add(isExpanding ? 'fa-chevron-up' : 'fa-chevron-down');
        icon.style.transform = '';
      }
    });
  });

  // Active link highlighting and auto-expand parent section
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
      const parentList = link.closest('.nav-list');
      if (parentList && parentList.classList.contains('collapsed')) {
        const sectionToggle = parentList.previousElementSibling;
        if (sectionToggle && sectionToggle.classList.contains('section-toggle')) {
          sectionToggle.dispatchEvent(new Event('click'));
        }
      }
    }
  });
}

/**
 * Initialize animations for UI elements
 */
function initAnimations() {
  // Add entrance animations to cards
  const cards = document.querySelectorAll('.admin-topbar, .stat-card, .chart-card, .quick-action-card, .table-section');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    cards.forEach(card => {
      card.classList.add('pre-animation');
      observer.observe(card);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    cards.forEach(card => card.classList.add('animate-in'));
  }

  // Add hover animations
  const hoverElements = document.querySelectorAll('.stat-card, .quick-action-card');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', function() {
      this.classList.add('hover-effect');
    });
    el.addEventListener('mouseleave', function() {
      this.classList.remove('hover-effect');
    });
  });
}

/**
 * Enable Download and Zoom actions for chart cards
 */
function initChartCardActions() {
  const cards = document.querySelectorAll('.chart-card');
  cards.forEach(card => {
    const canvas = card.querySelector('canvas');
    if (!canvas) return;
    const buttons = card.querySelectorAll('.card-actions .action-button');
    if (!buttons.length) return;

    // Download button (first)
    const downloadBtn = buttons[0];
    if (downloadBtn && !downloadBtn.dataset.bound) {
      downloadBtn.dataset.bound = '1';
      downloadBtn.addEventListener('click', () => {
        try {
          const chart = window.dashboardCharts ? window.dashboardCharts.get(canvas.id) : null;
          const targetCanvas = (chart && chart.canvas) ? chart.canvas : canvas; // fallback when chart not registered
          if (targetCanvas && targetCanvas.toDataURL) {
            const link = document.createElement('a');
            link.href = targetCanvas.toDataURL('image/png');
            link.download = `${canvas.id || 'chart'}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
          }
        } catch (e) {
          console.error('Failed to download chart image', e);
        }
      });
    }

    // Zoom/fullscreen button (second)
    const zoomBtn = buttons[1];
    if (zoomBtn && !zoomBtn.dataset.bound) {
      zoomBtn.dataset.bound = '1';
      zoomBtn.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
          }
          if (card.requestFullscreen) {
            await card.requestFullscreen();
          } else if (card.webkitRequestFullscreen) {
            card.webkitRequestFullscreen();
          }
        } catch (e) {
          console.error('Fullscreen failed', e);
        }
      });
    }
  });
}

/**
 * Initialize charts
 */
function initCharts() {
  // Global registry to access chart instances by canvas id
  if (!window.dashboardCharts) window.dashboardCharts = new Map();

  // Theme helpers
  const palette = {
    primary: '#4361ee',
    primarySoft: 'rgba(67, 97, 238, 0.1)',
    green: '#06d6a0',
    red: '#ef476f',
    yellow: '#f9c74f',
    cyan: '#4cc9f0',
    grayTick: '#6b7280',
    grid: 'rgba(229, 231, 235, 0.5)'
  };

  const formatIDRCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  const makeGradient = (ctx, color, alpha = 0.15) => {
    const height = (ctx && ctx.canvas && ctx.canvas.height) ? ctx.canvas.height : 200;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const toRGBA = (c, a) => {
      if (!c) return `rgba(67, 97, 238, ${a})`;
      if (c.startsWith('#')) {
        const r = parseInt(c.substr(1, 2), 16);
        const g = parseInt(c.substr(3, 2), 16);
        const b = parseInt(c.substr(5, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      if (c.startsWith('rgba(')) {
        return c.replace(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*[^)]+\)/, `rgba($1, $2, $3, ${a})`);
      }
      if (c.startsWith('rgb(')) {
        return c.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
      }
      return `rgba(67, 97, 238, ${a})`;
    };
    gradient.addColorStop(0, toRGBA(color, alpha));
    gradient.addColorStop(1, toRGBA(color, 0));
    return gradient;
  };

  // Cash Flow Trend Chart
  const cashFlowCtx = document.getElementById('chartKas');
  if (cashFlowCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartKas')) {
        const ex = window.dashboardCharts.get('chartKas');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const ctx = cashFlowCtx.getContext ? cashFlowCtx.getContext('2d') : null;
    const cashFlowChart = new Chart(cashFlowCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Total Kas',
          data: [1000000, 1200000, 1350000, 1500000, 1800000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000],
          borderColor: palette.primary,
          backgroundColor: ctx ? makeGradient(ctx, palette.primary) : palette.primarySoft,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: palette.primary,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += formatIDRCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: palette.grayTick
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: palette.grid
            },
            ticks: {
              color: palette.grayTick,
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
    window.dashboardCharts.set('chartKas', cashFlowChart);
  }

  // Composition Pie Chart
  const compositionCtx = document.getElementById('chartPie');
  if (compositionCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartPie')) {
        const ex = window.dashboardCharts.get('chartPie');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const compositionChart = new Chart(compositionCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pemasukan', 'Pengeluaran'],
        datasets: [{
          data: [65, 35],
          backgroundColor: [palette.green, palette.red],
          borderColor: [palette.green, palette.red],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${percentage}%`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
    window.dashboardCharts.set('chartPie', compositionChart);
  }

  // Expense Categories Chart (Premium Feature)
  const expenseCategoriesCtx = document.getElementById('chartExpenseCategories');
  if (expenseCategoriesCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartExpenseCategories')) {
        const ex = window.dashboardCharts.get('chartExpenseCategories');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const expenseCategoriesChart = new Chart(expenseCategoriesCtx, {
      type: 'bar',
      data: {
        labels: ['Operasional', 'Keamanan', 'Kebersihan', 'Perbaikan', 'Lainnya'],
        datasets: [{
          label: 'Pengeluaran per Kategori',
          data: [1200000, 800000, 600000, 400000, 200000],
          backgroundColor: [
            'rgba(67, 97, 238, 0.7)',
            'rgba(76, 201, 240, 0.7)',
            'rgba(6, 214, 160, 0.7)',
            'rgba(249, 199, 79, 0.7)',
            'rgba(239, 71, 111, 0.7)'
          ],
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: function(context) {
            return context.dataIndex * 100;
          },
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }

                if (context.parsed.y !== null) {
                  label += formatIDRCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: palette.grayTick
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: palette.grid
            },
            ticks: {
              color: palette.grayTick,
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
    window.dashboardCharts.set('chartExpenseCategories', expenseCategoriesChart);
  }

  // Monthly Comparison Chart (Premium Feature)
  const monthlyComparisonCtx = document.getElementById('chartMonthlyComparison');
  if (monthlyComparisonCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartMonthlyComparison')) {
        const ex = window.dashboardCharts.get('chartMonthlyComparison');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const monthlyComparisonChart = new Chart(monthlyComparisonCtx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Pemasukan',
            data: [800000, 900000, 1000000, 1100000, 1200000, 1300000],
            backgroundColor: 'rgba(6, 214, 160, 0.7)',
            borderColor: 'rgba(6, 214, 160, 1)',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 20
          },
          {
            label: 'Pengeluaran',
            data: [500000, 600000, 550000, 700000, 650000, 800000],
            backgroundColor: 'rgba(239, 71, 111, 0.7)',
            borderColor: 'rgba(239, 71, 111, 1)',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 20
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          delay: function(context) {
            return context.datasetIndex * 100 + context.dataIndex * 50;
          },
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += formatIDRCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: palette.grayTick
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: palette.grid
            },
            ticks: {
              color: palette.grayTick,
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
    window.dashboardCharts.set('chartMonthlyComparison', monthlyComparisonChart);
  }

  // Optional: Stacked Area Chart (Pemasukan vs Pengeluaran)
  const areaCtx = document.getElementById('chartIncomeExpenseArea');
  if (areaCtx) {
    try {
      if (window.dashboardCharts && window.dashboardCharts.has('chartIncomeExpenseArea')) {
        const ex = window.dashboardCharts.get('chartIncomeExpenseArea');
        ex && typeof ex.destroy === 'function' && ex.destroy();
      }
    } catch (e) {}
    const ctx = areaCtx.getContext ? areaCtx.getContext('2d') : null;
    const areaChart = new Chart(areaCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [
          {
            label: 'Pemasukan',
            data: [900000, 950000, 1200000, 1150000, 1400000, 1500000, 1600000, 1700000],
            borderColor: palette.green,
            backgroundColor: ctx ? makeGradient(ctx, palette.green) : 'rgba(6, 214, 160, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: 'Pengeluaran',
            data: [600000, 500000, 700000, 650000, 800000, 900000, 850000, 950000],
            borderColor: palette.red,
            backgroundColor: ctx ? makeGradient(ctx, palette.red) : 'rgba(239, 71, 111, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatIDRCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.grayTick } },
          y: { grid: { color: palette.grid }, ticks: { color: palette.grayTick } }
        }
      }
    });
    window.dashboardCharts.set('chartIncomeExpenseArea', areaChart);
  }

  // Radar Kepuasan removed per request

  // Kontributor Teratas removed per request

}

/**
 * Initialize sparkline mini charts for any canvas.sparkline[data-values]
 */
function initSparklines() {
  if (typeof Chart === 'undefined') return;
  const canvases = document.querySelectorAll('canvas.sparkline');
  canvases.forEach(cv => {
    const valuesAttr = cv.getAttribute('data-values');
    if (!valuesAttr) return;
    const values = valuesAttr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (!values.length) return;
    // allow custom height to make the line clearer
    const desiredHeight = parseInt(cv.getAttribute('data-height') || '48', 10);
    if (!isNaN(desiredHeight) && desiredHeight > 0) {
      cv.style.height = desiredHeight + 'px';
      // align the internal canvas resolution as well to avoid blur/clipping
      try { cv.height = desiredHeight; } catch (e) {}
    }

    // pick a high-contrast color: CSS var --primary or fallback
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';
    const fillColor = 'rgba(37, 99, 235, 0.12)';

    // compute y-axis padding so the line doesn't touch the top/bottom edges
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = Math.max(1, maxVal - minVal);
    const pad = Math.max(0.5, range * 0.1);

    new Chart(cv, {
      type: 'line',
      data: { 
        labels: values.map((_, i) => i + 1), 
        datasets: [{ 
          data: values, 
          borderColor: primary, 
          backgroundColor: fillColor, 
          borderWidth: 3,
          borderCapStyle: 'round',
          borderJoinStyle: 'round', 
          pointRadius: 0, 
          fill: true, 
          tension: 0.4 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        layout: { padding: { left: 8, right: 10, top: 6, bottom: 6 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
        scales: { 
          x: { display: false, offset: true }, 
          y: { display: false, suggestedMin: minVal - pad, suggestedMax: maxVal + pad } 
        } 
      }
    });
  });
}

/**
 * Initialize data tables
 */
function initDataTables() {
  const tables = document.querySelectorAll('.data-table');
  
  tables.forEach(table => {
    const tableHeader = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    
    if (tableHeader && tableBody) {
      // Add sorting functionality
      const sortableHeaders = tableHeader.querySelectorAll('th.sortable');
      
      sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
          const index = Array.from(this.parentNode.children).indexOf(this);
          const isAscending = this.classList.contains('sort-asc');
          
          // Update sort direction indicators
          sortableHeaders.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
          });
          
          this.classList.add(isAscending ? 'sort-desc' : 'sort-asc');
          
          // Sort the table rows
          const rows = Array.from(tableBody.querySelectorAll('tr'));
          
          rows.sort((a, b) => {
            const cellA = a.children[index].textContent.trim();
            const cellB = b.children[index].textContent.trim();
            
            // Check if the cells contain numbers
            const numA = parseFloat(cellA.replace(/[^0-9.-]+/g, ''));
            const numB = parseFloat(cellB.replace(/[^0-9.-]+/g, ''));
            
            if (!isNaN(numA) && !isNaN(numB)) {
              return isAscending ? numA - numB : numB - numA;
            } else {
              return isAscending ? 
                cellA.localeCompare(cellB) : 
                cellB.localeCompare(cellA);
            }
          });
          
          // Reappend sorted rows
          rows.forEach(row => {
            tableBody.appendChild(row);
          });
        });
      });
      
      // Add pagination if needed
      const paginationContainer = table.nextElementSibling;
      if (paginationContainer && paginationContainer.classList.contains('pagination')) {
        const rowsPerPage = 5;
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const pageCount = Math.ceil(rows.length / rowsPerPage);
        
        // Create pagination buttons
        if (pageCount > 1) {
          const paginationButtons = paginationContainer.querySelectorAll('.pagination-button');
          
          // Show only the first page initially
          showPage(1);
          
          // Add click handlers to pagination buttons
          paginationButtons.forEach(button => {
            if (button.dataset.page) {
              button.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                showPage(page);
                
                // Update active button
                paginationButtons.forEach(btn => {
                  btn.classList.remove('active');
                });
                this.classList.add('active');
              });
            }
          });
        }
        
        function showPage(page) {
          const start = (page - 1) * rowsPerPage;
          const end = start + rowsPerPage;
          
          rows.forEach((row, index) => {
            row.style.display = (index >= start && index < end) ? '' : 'none';
          });
        }
      }
    }
  });
}

/**
 * Initialize counters animation
 */
function initCounters() {
  const counters = document.querySelectorAll('.stat-value');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = parseFloat(counter.getAttribute('data-target') || counter.innerText.replace(/[^0-9.-]+/g, ''));
          const duration = 1500;
          const step = Math.ceil(target / (duration / 16)); // 60fps
          
          let current = 0;
          const format = counter.getAttribute('data-format') || '';
          const formatOptions = counter.getAttribute('data-format-options') ? 
            JSON.parse(counter.getAttribute('data-format-options')) : {};
          
          const timer = setInterval(() => {
            current += step;
            
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            
            // Format the number based on data attributes
            if (format === 'currency') {
              counter.textContent = new Intl.NumberFormat('id-ID', { 
                style: 'currency', 
                currency: formatOptions.currency || 'IDR',
                maximumFractionDigits: formatOptions.maximumFractionDigits || 0
              }).format(current);
            } else if (format === 'number') {
              counter.textContent = new Intl.NumberFormat('id-ID', formatOptions).format(current);
            } else if (format === 'percent') {
              counter.textContent = `${current}%`;
            } else {
              counter.textContent = current;
            }
          }, 16);
          
          observer.unobserve(counter);
        }
      });
    }, { threshold: 0.1 });
    
    counters.forEach(counter => {
      observer.observe(counter);
    });
  }
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  const tooltips = document.querySelectorAll('[data-tooltip]');
  
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', function() {
      const text = this.getAttribute('data-tooltip');
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip';
      tooltipEl.textContent = text;
      document.body.appendChild(tooltipEl);
      
      const rect = this.getBoundingClientRect();
      const tooltipRect = tooltipEl.getBoundingClientRect();
      
      tooltipEl.style.top = `${rect.top - tooltipRect.height - 10 + window.scrollY}px`;
      tooltipEl.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltipEl.style.opacity = '1';
      
      this.addEventListener('mouseleave', function onMouseLeave() {
        tooltipEl.remove();
        this.removeEventListener('mouseleave', onMouseLeave);
      });
    });
  });
}

/**
 * Initialize premium feature locks
 */
function initPremiumLocks() {
  // Disabled to unlock all premium features
  return;
  const premiumFeatures = document.querySelectorAll('.premium-feature');
  
  premiumFeatures.forEach(feature => {
    // Check if user has premium access
    const userPlan = document.querySelector('.user-role .plan-badge');
    const hasPremium = userPlan && (userPlan.classList.contains('premium') || userPlan.classList.contains('plus'));
    
    // If not premium, add overlay
    if (!hasPremium && !feature.querySelector('.premium-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'premium-overlay';
      
      const message = document.createElement('div');
      message.className = 'premium-message';
      
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-lock';
      
      const text = document.createElement('span');
      text.textContent = 'Fitur Premium';
      
      const upgradeLink = document.createElement('a');
      upgradeLink.href = '/admin/upgrade';
      upgradeLink.className = 'upgrade-link';
      upgradeLink.textContent = 'Upgrade';
      
      message.appendChild(icon);
      message.appendChild(text);
      message.appendChild(upgradeLink);
      overlay.appendChild(message);
      
      feature.appendChild(overlay);
    }
  });
}

/**
 * Initialize real-time chart updates
 */
function initRealTimeUpdates() {
  // Set up interval for periodic updates
  const updateInterval = 10000; // Update every 10 seconds
  
  // Function to fetch and update chart data
  function updateChartData() {
    // Get latest data from localStorage or other sources
    const financialData = getLatestFinancialData();
    
    // Update each chart with new data
    updateCashFlowChart(financialData);
    updateCompositionChart(financialData);
    updateExpenseCategoriesChart(financialData);
    updateMonthlyComparisonChart(financialData);
    updateIncomeExpenseAreaChart(financialData);
  }
  
  // Get latest financial data from localStorage or API
  function getLatestFinancialData() {
    try {
      // Try to get data from localStorage first
      const transactions = JSON.parse(localStorage.getItem('financial_transactions_v2') || '[]');
      
      // Calculate totals and summaries
      const totals = calculateTotals(transactions);
      const categories = calculateCategoryBreakdown(transactions);
      const monthlyData = calculateMonthlyData(transactions);
      
      return {
        totals: totals,
        categories: categories,
        monthly: monthlyData
      };
    } catch (error) {
      console.error('Error fetching financial data:', error);
      return {
        totals: { income: 0, expense: 0, balance: 0 },
        categories: [],
        monthly: []
      };
    }
  }
  
  // Calculate totals from transactions
  function calculateTotals(transactions) {
    let income = 0;
    let expense = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'Masuk') {
        income += parseFloat(tx.amount) || 0;
      } else if (tx.type === 'Keluar') {
        expense += parseFloat(tx.amount) || 0;
      }
    });
    
    return {
      income: income,
      expense: expense,
      balance: income - expense
    };
  }
  
  // Calculate category breakdown
  function calculateCategoryBreakdown(transactions) {
    const categories = {};
    
    transactions.forEach(tx => {
      const category = tx.category || 'Lainnya';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += parseFloat(tx.amount) || 0;
    });
    
    return Object.entries(categories).map(([name, amount]) => ({ name, amount }));
  }
  
  // Calculate monthly data
  function calculateMonthlyData(transactions) {
    const months = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expense: 0 };
      }
      
      if (tx.type === 'Masuk') {
        months[monthKey].income += parseFloat(tx.amount) || 0;
      } else if (tx.type === 'Keluar') {
        months[monthKey].expense += parseFloat(tx.amount) || 0;
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({
      month: month,
      income: data.income,
      expense: data.expense
    }));
  }
  
  // Update Cash Flow Chart
  function updateCashFlowChart(data) {
    const chart = window.dashboardCharts.get('chartKas');
    if (!chart) return;
    
    // Calculate cumulative balance for each month
    const monthlyData = data.monthly.sort((a, b) => a.month.localeCompare(b.month));
    const labels = monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'short' });
    });
    
    let cumulativeBalance = 0;
    const balanceData = monthlyData.map(m => {
      cumulativeBalance += (m.income - m.expense);
      return cumulativeBalance;
    });
    
    // Update chart data
    chart.data.labels = labels;
    chart.data.datasets[0].data = balanceData;
    chart.update();
  }
  
  // Update Composition Pie Chart
  function updateCompositionChart(data) {
    const chart = window.dashboardCharts.get('chartPie');
    if (!chart) return;
    
    chart.data.datasets[0].data = [data.totals.income, data.totals.expense];
    chart.update();
  }
  
  // Update Expense Categories Chart
  function updateExpenseCategoriesChart(data) {
    const chart = window.dashboardCharts.get('chartExpenseCategories');
    if (!chart) return;
    
    // Filter only expense categories
    const expenseCategories = data.categories
      .filter(cat => {
        // Assume categories like 'Iuran', 'Donasi' are income, others are expenses
        const name = cat.name.toLowerCase();
        return !['iuran', 'donasi', 'pemasukan'].includes(name);
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categories
    
    chart.data.labels = expenseCategories.map(cat => cat.name);
    chart.data.datasets[0].data = expenseCategories.map(cat => cat.amount);
    chart.update();
  }
  
  // Update Monthly Comparison Chart
  function updateMonthlyComparisonChart(data) {
    const chart = window.dashboardCharts.get('chartMonthlyComparison');
    if (!chart) return;
    
    const monthlyData = data.monthly.sort((a, b) => a.month.localeCompare(b.month)).slice(-6); // Last 6 months
    
    const labels = monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'short' });
    });
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = monthlyData.map(m => m.income);
    chart.data.datasets[1].data = monthlyData.map(m => m.expense);
    chart.update();
  }
  
  // Update Income vs Expense Area Chart
  function updateIncomeExpenseAreaChart(data) {
    const chart = window.dashboardCharts.get('chartIncomeExpenseArea');
    if (!chart) return;
    
    const monthlyData = data.monthly.sort((a, b) => a.month.localeCompare(b.month)).slice(-8); // Last 8 months
    
    const labels = monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'short' });
    });
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = monthlyData.map(m => m.income);
    chart.data.datasets[1].data = monthlyData.map(m => m.expense);
    chart.update();
  }
  
  // Listen for storage events to update charts when data changes
  window.addEventListener('storage', function(e) {
    if (e.key === 'financial_transactions_v2') {
      updateChartData();
    }
  });
  
  // Initial update
  updateChartData();
  
  // Set interval for periodic updates
  setInterval(updateChartData, updateInterval);
}