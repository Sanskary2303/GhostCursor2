/**
 * AI Cursor Animation Engine.
 * 
 * Renders an animated ghost cursor SVG on the host DOM, styled to match
 * the solid cursor part of the Ghost Cursor brand icon.
 * Supports launch/dock animations from the chat bubble docking station.
 */

export class CursorEngine {
  private container: HTMLElement;
  private cursorEl: HTMLElement;
  private spotlightEl: HTMLElement;
  private isVisible = false;
  private reducedMotion: boolean;
  private cursorColor: string;

  constructor(cursorColor: string = '#FF6B35') {
    this.cursorColor = cursorColor;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create cursor container on host DOM (not shadow DOM)
    this.container = document.createElement('div');
    this.container.id = 'ghost-cursor-overlay';
    this.container.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 999998;
    `;

    // Ghost cursor element — exact shape of the icon's solid cursor
    this.cursorEl = document.createElement('div');
    this.cursorEl.innerHTML = `
      <svg width="28" height="39" viewBox="324 150 372 518" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow: visible; filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));">
        <path d="M521.952087,631.016663 C513.349121,611.790955 504.826996,592.528503 496.123535,573.348389 C484.193176,547.056946 472.125244,520.827881 459.964417,493.937317 C459.050812,491.896698 458.289062,490.490936 457.527313,489.085144 C454.825684,482.870636 452.124023,476.656097 449.097382,469.694000 C407.778442,511.579224 367.044678,552.871216 325.659027,594.824036 C325.659027,447.033783 325.659027,300.159363 325.659027,152.234039 C448.522461,246.284775 570.946655,339.999298 693.370850,433.713806 C693.271667,434.088165 693.172485,434.462524 693.073242,434.836884 C687.024292,434.836884 680.975281,434.836884 674.001465,434.809753 C662.085693,434.884613 651.094788,434.986603 640.103943,435.088623 C639.915771,435.044250 639.727539,434.999908 639.021240,434.918701 C638.337830,434.933197 638.172546,434.984558 638.007324,435.035889 C626.885864,434.947601 615.764404,434.797150 604.642883,434.783264 C577.067566,434.748810 549.492188,434.776764 521.073486,434.843018 C520.087219,435.283295 519.944336,435.660217 519.801453,436.037140 C526.872986,451.943634 533.856323,467.889984 541.032410,483.749146 C563.191772,532.721497 585.424622,581.660706 607.816406,631.026001 C606.118103,631.901062 604.248840,632.864197 601.732178,634.032471 C594.760925,637.336731 588.437134,640.435852 582.113342,643.535034 C567.506042,650.642212 552.898743,657.749329 537.664124,665.161682 C535.626587,660.677734 533.666748,656.364685 531.449219,651.423950 C528.111694,644.203064 525.031921,637.609863 521.952087,631.016663 z" fill="${this.cursorColor}" stroke="#FFFFFF" stroke-width="14" stroke-linejoin="round"/>
      </svg>
    `;
    this.cursorEl.style.cssText = `
      position: fixed; top: 0; left: 0;
      pointer-events: none; z-index: 999999;
      opacity: 0;
      transform: translate(0px, 0px);
      will-change: transform, opacity;
    `;

    // Spotlight ring
    this.spotlightEl = document.createElement('div');
    this.spotlightEl.style.cssText = `
      position: fixed; pointer-events: none; z-index: 999997;
      border: 2px solid ${this.cursorColor}; border-radius: 8px;
      box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 20px rgba(255, 107, 53, 0.15);
      opacity: 0; transition: all 0.3s ease;
      will-change: transform, opacity;
    `;

    this.container.appendChild(this.cursorEl);
    this.container.appendChild(this.spotlightEl);
    document.body.appendChild(this.container);
  }

  /**
   * Launch the cursor out from the docking station (toggle bubble).
   */
  async launchFrom(stationRect: DOMRect): Promise<void> {
    const startX = stationRect.left + stationRect.width / 2 - 14;
    const startY = stationRect.top + stationRect.height / 2 - 18;
    const endX = startX - 45;
    const endY = startY - 55;

    this.cursorEl.style.opacity = '1';
    this.isVisible = true;

    if (this.reducedMotion) {
      this.cursorEl.style.transform = `translate(${endX}px, ${endY}px)`;
      return;
    }

    const anim = this.cursorEl.animate(
      [
        { transform: `translate(${startX}px, ${startY}px) scale(0.2)`, opacity: 0 },
        { transform: `translate(${endX}px, ${endY}px) scale(1)`, opacity: 1 }
      ],
      { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
    );
    await anim.finished;
    this.cursorEl.style.transform = `translate(${endX}px, ${endY}px)`;
  }

  /**
   * Return the cursor back into the docking station (toggle bubble).
   */
  async dockTo(stationRect: DOMRect): Promise<void> {
    this.hideSpotlight();
    const targetX = stationRect.left + stationRect.width / 2 - 14;
    const targetY = stationRect.top + stationRect.height / 2 - 18;

    if (this.reducedMotion) {
      this.hide();
      return;
    }

    const currentTransform = this.cursorEl.style.transform || `translate(${targetX}px, ${targetY}px)`;
    const anim = this.cursorEl.animate(
      [
        { transform: currentTransform, opacity: 1 },
        { transform: `translate(${targetX}px, ${targetY}px) scale(0.2)`, opacity: 0 }
      ],
      { duration: 450, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    );
    await anim.finished;
    this.hide();
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
          { boxShadow: `0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 20px rgba(255, 107, 53, 0.15)` },
          { boxShadow: `0 0 0 8px rgba(255, 107, 53, 0.35), 0 0 30px rgba(255, 107, 53, 0.25)` },
          { boxShadow: `0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 20px rgba(255, 107, 53, 0.15)` },
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
