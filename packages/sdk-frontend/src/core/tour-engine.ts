/**
 * Guided Tour Engine — multi-step spotlight walkthroughs.
 * 
 * Highlights elements sequentially with explanatory tooltips,
 * dark overlay with cutout, and next/prev/skip navigation.
 */

import { resolveTarget } from './target-resolver';

interface TourStep {
  target_id: string;
  message: string;
  spotlight?: boolean;
}

export class TourEngine {
  private overlay: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private steps: TourStep[] = [];
  private currentStep = 0;
  private onComplete?: () => void;
  private active = false;

  /**
   * Start a guided tour with multiple steps.
   */
  async startTour(steps: TourStep[], onComplete?: () => void): Promise<void> {
    this.steps = steps;
    this.currentStep = 0;
    this.onComplete = onComplete;
    this.active = true;

    this.createOverlay();
    await this.showStep(0);
  }

  private createOverlay(): void {
    // Dark overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'ghost-tour-overlay';
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.5); z-index: 999990;
      transition: opacity 0.3s; pointer-events: auto;
    `;

    // Tooltip container
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'ghost-tour-tooltip';
    this.tooltip.style.cssText = `
      position: fixed; z-index: 999995; max-width: 360px;
      background: white; border-radius: 12px; padding: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: all 0.3s ease;
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.tooltip);
  }

  private async showStep(index: number): Promise<void> {
    if (!this.active || index >= this.steps.length || !this.tooltip) return;

    const step = this.steps[index];
    this.currentStep = index;

    try {
      const el = await resolveTarget(step.target_id, 5000);
      const htmlEl = el as HTMLElement;

      // Scroll into view
      htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 300));

      // Position spotlight cutout
      const rect = htmlEl.getBoundingClientRect();
      const pad = 8;
      if (this.overlay) {
        this.overlay.style.clipPath = `polygon(
          0% 0%, 0% 100%, 
          ${rect.left - pad}px 100%, ${rect.left - pad}px ${rect.top - pad}px,
          ${rect.right + pad}px ${rect.top - pad}px, ${rect.right + pad}px ${rect.bottom + pad}px,
          ${rect.left - pad}px ${rect.bottom + pad}px, ${rect.left - pad}px 100%,
          100% 100%, 100% 0%
        )`;
      }

      // Highlight the target
      htmlEl.style.outline = '3px solid #6366f1';
      htmlEl.style.outlineOffset = '4px';
      htmlEl.style.borderRadius = '4px';
      htmlEl.style.position = 'relative';
      htmlEl.style.zIndex = '999993';

      // Update tooltip
      this.tooltip.innerHTML = `
        <div style="font-size: 13px; color: #6366f1; font-weight: 600; margin-bottom: 8px;">
          Step ${index + 1} of ${this.steps.length}
        </div>
        <div style="font-size: 15px; line-height: 1.5; color: #1e293b; margin-bottom: 16px;">
          ${this.escapeHtml(step.message)}
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          ${index > 0 ? '<button id="ghost-tour-prev" style="padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 13px; color: #64748b;">← Back</button>' : ''}
          <button id="ghost-tour-skip" style="padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 13px; color: #64748b;">Skip</button>
          <button id="ghost-tour-next" style="padding: 8px 16px; border: none; border-radius: 8px; background: #6366f1; color: white; cursor: pointer; font-size: 13px; font-weight: 500;">
            ${index === this.steps.length - 1 ? 'Done ✓' : 'Next →'}
          </button>
        </div>
      `;

      // Position tooltip near element
      const tooltipRect = this.tooltip.getBoundingClientRect();
      let top = rect.bottom + pad + 12;
      let left = rect.left;

      // Adjust if tooltip would go off screen
      if (top + 200 > window.innerHeight) {
        top = rect.top - pad - 200;
      }
      if (left + 360 > window.innerWidth) {
        left = window.innerWidth - 380;
      }
      left = Math.max(16, left);

      this.tooltip.style.top = `${top}px`;
      this.tooltip.style.left = `${left}px`;

      // Attach event listeners
      this.tooltip.querySelector('#ghost-tour-next')?.addEventListener('click', () => {
        this.cleanupStepHighlight(htmlEl);
        if (index === this.steps.length - 1) {
          this.endTour();
        } else {
          this.showStep(index + 1);
        }
      });

      this.tooltip.querySelector('#ghost-tour-prev')?.addEventListener('click', () => {
        this.cleanupStepHighlight(htmlEl);
        this.showStep(index - 1);
      });

      this.tooltip.querySelector('#ghost-tour-skip')?.addEventListener('click', () => {
        this.cleanupStepHighlight(htmlEl);
        this.endTour();
      });
    } catch {
      // Skip unreachable step
      if (index < this.steps.length - 1) {
        this.showStep(index + 1);
      } else {
        this.endTour();
      }
    }
  }

  private cleanupStepHighlight(el: HTMLElement): void {
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.zIndex = '';
  }

  private endTour(): void {
    this.active = false;
    this.overlay?.remove();
    this.tooltip?.remove();
    this.overlay = null;
    this.tooltip = null;
    this.onComplete?.();
  }

  /** Stop the tour immediately. */
  dispose(): void {
    this.active = false;
    this.overlay?.remove();
    this.tooltip?.remove();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

