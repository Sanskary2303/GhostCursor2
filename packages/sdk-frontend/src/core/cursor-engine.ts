/**
 * AI Cursor Animation Engine.
 * 
 * Renders an animated ghost cursor SVG on the host DOM.
 * Uses Web Animations API for smooth 60fps GPU-accelerated motion.
 * Supports prefers-reduced-motion.
 */

export class CursorEngine {
  private container: HTMLElement;
  private cursorEl: HTMLElement;
  private spotlightEl: HTMLElement;
  private isVisible = false;
  private reducedMotion: boolean;
  private cursorColor: string;

  constructor(cursorColor: string = '#6366f1') {
    this.cursorColor = cursorColor;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create cursor container on host DOM (not shadow DOM)
    this.container = document.createElement('div');
    this.container.id = 'ghost-cursor-overlay';
    this.container.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 999998;
    `;

    // Ghost cursor element
    this.cursorEl = document.createElement('div');
    this.cursorEl.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#shadow)">
          <path d="M8 4L26 16L18 18L14 26L8 4Z" fill="${this.cursorColor}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        </g>
        <defs>
          <filter id="shadow" x="4" y="2" width="28" height="30" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
      </svg>
    `;
    this.cursorEl.style.cssText = `
      position: fixed; top: 0; left: 0;
      pointer-events: none; z-index: 999999;
      opacity: 0; transition: opacity 0.2s;
      transform: translate(-4px, -2px);
      will-change: transform;
    `;

    // Spotlight ring
    this.spotlightEl = document.createElement('div');
    this.spotlightEl.style.cssText = `
      position: fixed; pointer-events: none; z-index: 999997;
      border: 2px solid ${this.cursorColor}; border-radius: 8px;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1);
      opacity: 0; transition: all 0.3s ease;
      will-change: transform, opacity;
    `;

    this.container.appendChild(this.cursorEl);
    this.container.appendChild(this.spotlightEl);
    document.body.appendChild(this.container);
  }

  /**
   * Animate the cursor to a target element with smooth motion.
   */
  async animateTo(element: HTMLElement): Promise<void> {
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    // Show cursor
    this.cursorEl.style.opacity = '1';
    this.isVisible = true;

    if (this.reducedMotion) {
      // Instant move for reduced motion
      this.cursorEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
    } else {
      // Smooth animation using Web Animations API
      const animation = this.cursorEl.animate(
        [{ transform: this.cursorEl.style.transform || 'translate(0px, 0px)' }, { transform: `translate(${targetX}px, ${targetY}px)` }],
        { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
      );
      await animation.finished;
    }

    this.cursorEl.style.transform = `translate(${targetX}px, ${targetY}px)`;

    // Show spotlight around target
    this.showSpotlight(element);

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Brief pause for visual effect
    await new Promise(r => setTimeout(r, 200));
  }

  /** Show spotlight ring around an element. */
  showSpotlight(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const pad = 6;
    this.spotlightEl.style.left = `${rect.left - pad}px`;
    this.spotlightEl.style.top = `${rect.top - pad}px`;
    this.spotlightEl.style.width = `${rect.width + pad * 2}px`;
    this.spotlightEl.style.height = `${rect.height + pad * 2}px`;
    this.spotlightEl.style.opacity = '1';

    // Pulse animation
    if (!this.reducedMotion) {
      this.spotlightEl.animate(
        [
          { boxShadow: `0 0 0 4px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1)` },
          { boxShadow: `0 0 0 8px rgba(99, 102, 241, 0.25), 0 0 30px rgba(99, 102, 241, 0.2)` },
          { boxShadow: `0 0 0 4px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1)` },
        ],
        { duration: 1500, iterations: 2 }
      );
    }
  }

  /** Hide spotlight. */
  hideSpotlight(): void {
    this.spotlightEl.style.opacity = '0';
  }

  /** Hide the cursor. */
  hide(): void {
    this.cursorEl.style.opacity = '0';
    this.spotlightEl.style.opacity = '0';
    this.isVisible = false;
  }

  /** Remove from DOM. */
  dispose(): void {
    this.hide();
    this.container.remove();
  }
}

