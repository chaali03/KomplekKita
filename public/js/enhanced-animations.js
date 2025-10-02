/**
 * Enhanced Number Animation System (Public Build)
 * Synchronized with src/utils/enhanced-animations.js
 */

// Animation configuration
const ANIMATION_CONFIG = {
  duration: 800,
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  delay: 50,
  stagger: 30,
  precision: 2,
  currency: 'IDR',
  locale: 'id-ID'
};

// Easing functions
const EASING_FUNCTIONS = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutBack: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeOutSmooth: (t) => 1 - Math.pow(1 - t, 2.5),
  easeOutSmoothBounce: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutLinear: (t) => t,
  easeOutCounter: (t) => {
    if (t < 0.5) return 2 * t * t;
    return 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
};

// Formatters
const FORMATTERS = {
  currency: (value, options = {}) => {
    const config = {
      style: 'currency',
      currency: options.currency || ANIMATION_CONFIG.currency,
      maximumFractionDigits: options.precision || 0,
      minimumFractionDigits: 0,
      ...options
    };
    return new Intl.NumberFormat(ANIMATION_CONFIG.locale, config).format(value);
  },
  number: (value, options = {}) => {
    const config = {
      maximumFractionDigits: options.precision || 0,
      minimumFractionDigits: 0,
      ...options
    };
    return new Intl.NumberFormat(ANIMATION_CONFIG.locale, config).format(value);
  },
  percent: (value, options = {}) => {
    const config = {
      style: 'percent',
      maximumFractionDigits: options.precision || 1,
      ...options
    };
    return new Intl.NumberFormat(ANIMATION_CONFIG.locale, config).format(value / 100);
  },
  compact: (value, options = {}) => {
    const config = {
      notation: 'compact',
      maximumFractionDigits: options.precision || 1,
      ...options
    };
    return new Intl.NumberFormat(ANIMATION_CONFIG.locale, config).format(value);
  }
};

class AnimationManager {
  constructor() {
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.isAnimating = false;
    this.observer = null;
    this.initIntersectionObserver();
  }
  initIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const config = element.dataset.animationConfig;
            if (config) {
              try { this.animateElement(element, JSON.parse(config)); } catch (e) { console.warn('Invalid animation config:', e); }
            }
            this.observer.unobserve(element);
          }
        });
      }, { threshold: 0.1, rootMargin: '50px' });
    }
  }
  observeElement(element, config) {
    if (this.observer && element) {
      element.dataset.animationConfig = JSON.stringify(config);
      this.observer.observe(element);
    }
  }
  animateElement(element, config) {
    if (!element) return;
    const { targetValue, formatter = FORMATTERS.number, duration = ANIMATION_CONFIG.duration, easing = 'easeOutCubic', delay = 0, onStart = null, onUpdate = null, onComplete = null, visualEffects = true } = config;
    this.cancelAnimation(element);
    const startTime = performance.now() + delay;
    const startValue = this.getCurrentValue(element) || 0;
    const distance = targetValue - startValue;
    const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.easeOutCubic;
    const animate = (currentTime) => {
      if (currentTime < startTime) { requestAnimationFrame(animate); return; }
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      const currentValue = startValue + (distance * easedProgress);
      this.updateElementValue(element, currentValue, formatter);
      if (visualEffects && progress < 1) this.addVisualEffects(element, progress);
      if (onUpdate) onUpdate(currentValue, progress);
      if (progress < 1) {
        const id = requestAnimationFrame(animate);
        this.activeAnimations.set(element, id);
      } else {
        this.activeAnimations.delete(element);
        this.removeVisualEffects(element);
        if (onComplete) onComplete(targetValue);
      }
    };
    if (onStart) onStart(startValue, targetValue);
    requestAnimationFrame(animate);
  }
  getCurrentValue(element) {
    const text = element.textContent || element.innerText || '0';
    const numericValue = parseFloat(text.replace(/[^\d.-]/g, ''));
    return isNaN(numericValue) ? 0 : numericValue;
  }
  updateElementValue(element, value, formatter) {
    if (typeof formatter === 'function') element.textContent = formatter(value);
    else if (typeof formatter === 'string' && FORMATTERS[formatter]) element.textContent = FORMATTERS[formatter](value);
    else element.textContent = value.toLocaleString(ANIMATION_CONFIG.locale);
  }
  addVisualEffects(element, progress) {
    const scale = 1 + (Math.sin(progress * Math.PI * 0.5) * 0.02);
    element.style.transform = `scale(${scale})`;
    const value = this.getCurrentValue(element);
    if (value > 0) {
      const intensity = 45 + (progress * 12);
      element.style.color = `hsl(142, 71%, ${Math.min(intensity, 55)}%)`;
    } else if (value < 0) {
      const intensity = 45 + (progress * 12);
      element.style.color = `hsl(0, 84%, ${Math.min(intensity, 55)}%)`;
    }
    if (progress > 0.5) {
      const glowIntensity = Math.pow(progress - 0.5, 0.8) * 3;
      element.style.textShadow = `0 0 ${glowIntensity * 6}px rgba(59, 130, 246, 0.15)`;
    }
    const opacity = 0.9 + (Math.sin(progress * Math.PI) * 0.1);
    element.style.opacity = Math.min(opacity, 1);
  }
  removeVisualEffects(element) {
    element.style.transform = '';
    element.style.color = '';
    element.style.textShadow = '';
    element.style.opacity = '';
  }
  cancelAnimation(element) {
    if (this.activeAnimations.has(element)) {
      cancelAnimationFrame(this.activeAnimations.get(element));
      this.activeAnimations.delete(element);
      this.removeVisualEffects(element);
    }
  }
  animateBatch(elements, config, staggerDelay = ANIMATION_CONFIG.stagger) {
    elements.forEach((element, index) => {
      if (element) setTimeout(() => { this.animateElement(element, { ...config, delay: index * staggerDelay }); }, index * staggerDelay);
    });
  }
  destroy() {
    this.activeAnimations.forEach(id => cancelAnimationFrame(id));
    this.activeAnimations.clear();
    if (this.observer) this.observer.disconnect();
  }
}

const animationManager = new AnimationManager();

export function animateValue(element, targetValue, formatter = FORMATTERS.number, options = {}) {
  if (!element) return;
  const config = { targetValue, formatter, duration: options.duration || ANIMATION_CONFIG.duration, easing: options.easing || 'easeOutSmooth', delay: options.delay || 0, visualEffects: options.visualEffects !== false, onStart: options.onStart, onUpdate: options.onUpdate, onComplete: options.onComplete, ...options };
  if (options.observe !== false && 'IntersectionObserver' in window) animationManager.observeElement(element, config);
  else animationManager.animateElement(element, config);
}
export function animateCurrency(element, targetValue, options = {}) { return animateValue(element, targetValue, FORMATTERS.currency, options); }
export function animateNumber(element, targetValue, options = {}) { return animateValue(element, targetValue, FORMATTERS.number, options); }
export function animatePercent(element, targetValue, options = {}) { return animateValue(element, targetValue, FORMATTERS.percent, options); }
export function animateCompact(element, targetValue, options = {}) { return animateValue(element, targetValue, FORMATTERS.compact, options); }
export function animateKPICards(cards, totals, options = {}) {
  const elements = [
    { el: cards.balance, value: totals.balance, formatter: FORMATTERS.currency },
    { el: cards.income, value: totals.income, formatter: FORMATTERS.currency },
    { el: cards.expense, value: totals.expense, formatter: FORMATTERS.currency },
    { el: cards.count, value: totals.count, formatter: FORMATTERS.number }
  ].filter(item => item.el);
  elements.forEach((item, index) => {
    setTimeout(() => { animateValue(item.el, item.value, item.formatter, { ...options, delay: index * (options.stagger || ANIMATION_CONFIG.stagger) }); }, index * (options.stagger || ANIMATION_CONFIG.stagger));
  });
}
export function animateCounterWithProgress(element, targetValue, formatter = FORMATTERS.number, options = {}) {
  if (!element) return;
  let progressBar = element.querySelector('.counter-progress');
  if (!progressBar && options.showProgress) {
    progressBar = document.createElement('div');
    progressBar.className = 'counter-progress';
    progressBar.style.cssText = `position: absolute; bottom: 0; left: 0; height: 2px; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 1px; transition: width 0.3s ease; width: 0%;`;
    element.style.position = 'relative';
    element.appendChild(progressBar);
  }
  return animateValue(element, targetValue, formatter, { ...options, onUpdate: (value, progress) => { if (progressBar) progressBar.style.width = `${progress * 100}%`; if (options.onUpdate) options.onUpdate(value, progress); }, onComplete: (value) => { if (progressBar) { setTimeout(() => { progressBar.style.width = '100%'; }, 100); } if (options.onComplete) options.onComplete(value); } });
}
export function animateValueAccessible(element, targetValue, formatter = FORMATTERS.number, options = {}) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    if (typeof formatter === 'function') element.textContent = formatter(targetValue);
    else if (typeof formatter === 'string' && FORMATTERS[formatter]) element.textContent = FORMATTERS[formatter](targetValue);
    else element.textContent = targetValue.toLocaleString(ANIMATION_CONFIG.locale);
    return;
  }
  return animateValue(element, targetValue, formatter, options);
}
export function cleanupAnimations() { animationManager.destroy(); }
if (typeof window !== 'undefined') {
  window.animateValue = animateValue;
  window.animateCurrency = animateCurrency;
  window.animateNumber = animateNumber;
  window.animatePercent = animatePercent;
  window.animateCompact = animateCompact;
  window.animateKPICards = animateKPICards;
  window.animateCounterWithProgress = animateCounterWithProgress;
  window.animateValueAccessible = animateValueAccessible;
}
export default { animateValue, animateCurrency, animateNumber, animatePercent, animateCompact, animateKPICards, animateCounterWithProgress, animateValueAccessible, cleanupAnimations, FORMATTERS, EASING_FUNCTIONS };
