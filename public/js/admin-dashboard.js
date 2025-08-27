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
  }

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
  
  // Initialize data tables
  initDataTables();
  
  // Initialize counters animation
  initCounters();
  
  // Initialize tooltips
  initTooltips();
  
  // Initialize premium feature locks
  initPremiumLocks();

  // Initialize animations
  initAnimations();

  // Initialize search functionality
  initSearch();

  // Initialize dropdown menus
  initDropdowns();

  // Elevate topbar on scroll
  initTopbarElevation();
});

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
 * Initialize charts
 */
function initCharts() {
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
  }

  // Composition Pie Chart
  const compositionCtx = document.getElementById('chartPie');
  if (compositionCtx) {
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
  }

  // Expense Categories Chart (Premium Feature)
  const expenseCategoriesCtx = document.getElementById('chartExpenseCategories');
  if (expenseCategoriesCtx) {
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
  }

  // Monthly Comparison Chart (Premium Feature)
  const monthlyComparisonCtx = document.getElementById('chartMonthlyComparison');
  if (monthlyComparisonCtx) {
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
  }

  // Optional: Stacked Area Chart (Pemasukan vs Pengeluaran)
  const areaCtx = document.getElementById('chartIncomeExpenseArea');
  if (areaCtx) {
    const ctx = areaCtx.getContext ? areaCtx.getContext('2d') : null;
    new Chart(areaCtx, {
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
  }

  // Optional: Radar Chart for Category Performance
  const radarCtx = document.getElementById('chartRadarCategories');
  if (radarCtx) {
    new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Keamanan', 'Kebersihan', 'Fasilitas', 'Kegiatan', 'Pelayanan', 'Transparansi'],
        datasets: [
          {
            label: 'Kepuasan',
            data: [80, 70, 75, 65, 85, 78],
            backgroundColor: 'rgba(67, 97, 238, 0.2)',
            borderColor: palette.primary,
            pointBackgroundColor: palette.primary
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          r: {
            angleLines: { color: 'rgba(229, 231, 235, 0.5)' },
            grid: { color: 'rgba(229, 231, 235, 0.5)' },
            pointLabels: { color: palette.grayTick },
            ticks: { display: false }
          }
        }
      }
    });
  }

  // Optional: Horizontal Bar for Top Contributors
  const topContribCtx = document.getElementById('chartTopContributors');
  if (topContribCtx) {
    new Chart(topContribCtx, {
      type: 'bar',
      data: {
        labels: ['RT 01', 'RT 02', 'RT 03', 'RT 04', 'RT 05'],
        datasets: [{
          label: 'Iuran Terkumpul',
          data: [3200000, 2900000, 2600000, 2400000, 2000000],
          backgroundColor: palette.primary,
          borderRadius: 8,
          barThickness: 18
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => formatIDRCurrency(ctx.parsed.x) } }
        },
        scales: {
          x: { grid: { color: palette.grid }, ticks: { color: palette.grayTick } },
          y: { grid: { display: false }, ticks: { color: palette.grayTick } }
        }
      }
    });
  }
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
    new Chart(cv, {
      type: 'line',
      data: { labels: values.map((_, i) => i + 1), datasets: [{ data: values, borderColor: '#4cc9f0', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.35 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
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
      icon.className = 'fas fa-lock';
      
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