// Type definitions for enhanced-animations.js
declare namespace EnhancedAnimations {
  interface AnimateOptions {
    duration?: number;
    easing?: string;
    precision?: number;
    currency?: string;
    locale?: string;
    formatter?: (value: number, options?: any) => string;
  }

  type Formatter = (value: number, options?: any) => string;

  interface Formatters {
    currency: Formatter;
    number: Formatter;
    percent: Formatter;
    compact: Formatter;
  }

  const FORMATTERS: Formatters;

  function animateValue(element: HTMLElement, targetValue: number, formatter?: Formatter, options?: AnimateOptions): void;
  function animateCurrency(element: HTMLElement, targetValue: number, options?: AnimateOptions): void;
  function animateNumber(element: HTMLElement, targetValue: number, options?: AnimateOptions): void;
  function animatePercent(element: HTMLElement, targetValue: number, options?: AnimateOptions): void;
  function animateCompact(element: HTMLElement, targetValue: number, options?: AnimateOptions): void;
  function animateKPICards(cards: HTMLElement[], totals: number[], options?: AnimateOptions): void;
  function animateCounterWithProgress(element: HTMLElement, targetValue: number, formatter?: Formatter, options?: AnimateOptions): void;
  function animateValueAccessible(element: HTMLElement, targetValue: number, formatter?: Formatter, options?: AnimateOptions): void;
  function cleanupAnimations(): void;
}

// Extend the Window interface
declare global {
  interface Window {
    animateValue: typeof EnhancedAnimations.animateValue;
    animateCurrency: typeof EnhancedAnimations.animateCurrency;
    animateNumber: typeof EnhancedAnimations.animateNumber;
    animatePercent: typeof EnhancedAnimations.animatePercent;
    animateCompact: typeof EnhancedAnimations.animateCompact;
    animateKPICards: typeof EnhancedAnimations.animateKPICards;
    animateCounterWithProgress: typeof EnhancedAnimations.animateCounterWithProgress;
    animateValueAccessible: typeof EnhancedAnimations.animateValueAccessible;
    cleanupAnimations: typeof EnhancedAnimations.cleanupAnimations;
  }
}

export {};
