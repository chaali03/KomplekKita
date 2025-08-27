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
});

/**
 * Initialize animations for UI elements
 */
function initAnimations() {
  // Add entrance animations to cards
  const cards = document.querySelectorAll('.stat-card, .chart-card, .quick-action-card, .table-section');
  
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
 * Initialize search functionality
 */
function initSearch() {
  const searchInput = document.querySelector('.search-input');
  const searchableItems = document.querySelectorAll('.searchable');
  
  if (searchInput && searchableItems.length > 0) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      
      if (query.length > 1) {
        searchableItems.forEach(item => {
          const text = item.textContent.toLowerCase();
          if (text.includes(query)) {
            item.style.display = '';
            // Highlight matching text
            highlightMatches(item, query);
          } else {
            item.style.display = 'none';
          }
        });
      } else {
        // Reset display and remove highlights
        searchableItems.forEach(item => {
          item.style.display = '';
          removeHighlights(item);
        });
      }
    });
  }
}

/**
 * Highlight matching text in search results
 */
function highlightMatches(element, query) {
  // First remove any existing highlights
  removeHighlights(element);
  
  // Don't process element children that have form controls
  if (element.querySelector('input, select, textarea')) {
    return;
  }
  
  // Create a function to replace text with highlighted version
  const highlightText = (node) => {
    if (node.nodeType === 3) { // Text node
      const text = node.nodeValue;
      const lowerText = text.toLowerCase();
      const index = lowerText.indexOf(query);
      
      if (index >= 0) {
        const span = document.createElement('span');
        span.className = 'search-highlight';
        
        const before = document.createTextNode(text.substring(0, index));
        const match = document.createTextNode(text.substring(index, index + query.length));
        const after = document.createTextNode(text.substring(index + query.length));
        
        span.appendChild(match);
        
        const fragment = document.createDocumentFragment();
        fragment.appendChild(before);
        fragment.appendChild(span);
        fragment.appendChild(after);
        
        node.parentNode.replaceChild(fragment, node);
        return true;
      }
    } else if (node.nodeType === 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
      // Element node, process children
      for (let i = 0; i < node.childNodes.length; i++) {
        i += highlightText(node.childNodes[i]) ? 1 : 0;
      }
    }
    return false;
  };
  
  // Process the element
  highlightText(element);
}

/**
 * Remove highlights from search results
 */
function removeHighlights(element) {
  const highlights = element.querySelectorAll('.search-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
    parent.normalize();
  });
}

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const dropdown = this.nextElementSibling;
      if (dropdown && dropdown.classList.contains('dropdown-menu')) {
        dropdown.classList.toggle('show');
        
        // Close other open dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
          if (menu !== dropdown) {
            menu.classList.remove('show');
          }
        });
      }
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  });
}

/**
 * Initialize sidebar functionality
 */
function initSidebar() {
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  const sidebarContent = document.querySelector('.sidebar-content');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      
      // For mobile
      if (window.innerWidth < 768) {
        sidebarContent.classList.toggle('mobile-open');
      }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
      if (window.innerWidth < 768 && 
          !sidebar.contains(event.target) && 
          !sidebarToggle.contains(event.target) &&
          sidebarContent.classList.contains('mobile-open')) {
        sidebarContent.classList.remove('mobile-open');
      }
    });
  }
  
  // Set active link based on current page
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.sidebar-link');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
      
      // Expand parent section if in a collapsible section
      const parentSection = link.closest('.collapsible-section');
      if (parentSection) {
        parentSection.classList.add('expanded');
      }
    }
  });

  // Initialize collapsible sections
  const collapsibleToggles = document.querySelectorAll('.collapsible-toggle');
  collapsibleToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const section = this.closest('.collapsible-section');
      if (section) {
        section.classList.toggle('expanded');
      }
    });
  });
}

/**
 * Initialize charts
 */
function initCharts() {
  // Cash Flow Trend Chart
  const cashFlowCtx = document.getElementById('chartKas');
  if (cashFlowCtx) {
    const cashFlowChart = new Chart(cashFlowCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Total Kas',
          data: [1000000, 1200000, 1350000, 1500000, 1800000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000],
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#4361ee',
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
                  label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
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
              color: '#6b7280'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(229, 231, 235, 0.5)'
            },
            ticks: {
              color: '#6b7280',
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
          backgroundColor: ['#06d6a0', '#ef476f'],
          borderColor: ['#06d6a0', '#ef476f'],
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
                  label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
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
              color: '#6b7280'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(229, 231, 235, 0.5)'
            },
            ticks: {
              color: '#6b7280',
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
                  label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
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
              color: '#6b7280'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(229, 231, 235, 0.5)'
            },
            ticks: {
              color: '#6b7280',
              callback: function(value) {
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(value);
              }
            }
          }
        }
      }
    });
  }
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