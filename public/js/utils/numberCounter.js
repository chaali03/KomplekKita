/**
 * Number counter animation utility
 * Animates numbers from 0 to their target value with smooth transitions
 * @param {HTMLElement} element - The element containing the number to animate
 * @param {number} [duration=1500] - Animation duration in milliseconds
 * @param {string} [easing='easeOutCubic'] - Easing function name
 */
function animateNumber(element, duration = 1500, easing = 'easeOutCubic') {
  const targetText = element.textContent.trim();
  const isCurrency = element.hasAttribute('data-format') && element.getAttribute('data-format') === 'currency';
  
  // For the "Tertunda" counter, don't show 0
  const isTertunda = element.id === 'dash-iuran-pending';
  
  // Parse the target value
  let target = 0;
  if (isCurrency) {
    target = parseFloat(targetText.replace(/[^0-9.-]+/g, '') || '0');
  } else {
    target = parseInt(targetText.replace(/\D/g, ''), 10) || 0;
  }
  
  // Special handling for "Tertunda" counter
  if (isTertunda && target === 0) {
    const parentCard = element.closest('.stat-card');
    if (parentCard) {
      parentCard.style.display = 'none';
    }
    return;
  }
  
  // Don't animate if target is 0 for currency values
  if (target === 0 && isCurrency) {
    element.textContent = 'Rp 0';
    return;
  }
  
  const start = 0;
  const startTime = performance.now();
  
  // Enhanced easing functions matching enhanced-animations.js
  const easingFunctions = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeOutBack: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
    easeOutSmooth: t => 1 - Math.pow(1 - t, 2.5),
    easeOutCounter: t => {
      if (t < 0.5) return 2 * t * t;
      return 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
  };

  const ease = easingFunctions[easing] || easingFunctions.easeOutQuad;

  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easedProgress = ease(progress);
    const current = Math.floor(easedProgress * (target - start) + start);
    
    element.textContent = formatNumber(current);
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      element.textContent = formatNumber(target);
    }
  }

  function formatNumber(num) {
    // Format number with thousands separators
    const isTertunda = element.id === 'dash-iuran-pending';
    
    // For currency values, use proper formatting
    if (element.hasAttribute('data-format') && element.getAttribute('data-format') === 'currency') {
      // Special handling for Tertunda counter
      if (isTertunda && num === 0) {
        const parentCard = element.closest('.stat-card');
        if (parentCard) {
          parentCard.style.display = 'none';
        }
        return '0';
      }
      
      // Format as currency with proper thousands separators
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num).replace('IDR', 'Rp').trim();
    }
    
    // For regular numbers, just add thousand separators
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  requestAnimationFrame(updateNumber);
}

/**
 * Initialize number animations for elements with data-animate-number attribute
 * Only runs once per page load
 */
function initNumberAnimations() {
  // Check if we've already animated on this page
  if (sessionStorage.getItem('numbersAnimated') === 'true') {
    // If already animated, just show the final values
    document.querySelectorAll('[data-animate-number]').forEach(el => {
      // Skip if this is a currency field that was 0
      const isCurrency = el.hasAttribute('data-format') && el.getAttribute('data-format') === 'currency';
      const target = isCurrency 
        ? parseFloat(el.textContent.replace(/[^0-9.-]+/g, '') || '0')
        : parseInt(el.textContent.replace(/\D/g, ''), 10);
      
      if (!(target === 0 && isCurrency)) {
        // Only show if not a zero currency value
        el.style.opacity = '1';
      }
    });
    return;
  }
  
  const numberElements = document.querySelectorAll('[data-animate-number]');
  
  if (numberElements.length > 0) {
    // Mark as animated immediately to prevent duplicate animations
    sessionStorage.setItem('numbersAnimated', 'true');
    
    // Hide all counters initially
    numberElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease-in-out';
    });
    
    // Use IntersectionObserver to start animations when elements are in view
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const duration = parseInt(element.getAttribute('data-duration') || '2000', 10);
          const easing = element.getAttribute('data-easing') || 'easeOutQuad';
          
          // Fade in the element
          element.style.opacity = '1';
          
          // Only animate if the value is not zero (for currency fields)
          const isCurrency = element.hasAttribute('data-format') && element.getAttribute('data-format') === 'currency';
          const target = isCurrency 
            ? parseFloat(element.textContent.replace(/[^0-9.-]+/g, '') || '0')
            : parseInt(element.textContent.replace(/\D/g, ''), 10);
            
          if (!(target === 0 && isCurrency)) {
            animateNumber(element, duration, easing);
          } else {
            // For zero currency values, just show the formatted value
            element.textContent = 'Rp 0';
          }
          observer.unobserve(element);
        }
      });
    }, {
      threshold: 0.5 // Start animation when 50% of the element is visible
    });
    
    numberElements.forEach(element => observer.observe(element));
  }
}

// Expose to window for direct script inclusion
window.initNumberAnimations = initNumberAnimations;
