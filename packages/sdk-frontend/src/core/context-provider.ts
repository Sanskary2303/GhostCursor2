/**
 * @ghost-cursor/sdk – Context Provider
 *
 * Scans registered targets on the current page to build a GhostContext
 * snapshot. Uses MutationObserver for reactive tracking and enforces a
 * ~5 KB output budget.
 */

import type { GhostContext, Target } from '../types.js';

/** Maximum serialised context payload size (~5 KB) */
const MAX_CONTEXT_BYTES = 5 * 1024;

/** Input types that are never observed for security/privacy. */
const EXCLUDED_INPUT_TYPES = new Set(['password', 'file', 'hidden']);

/**
 * Context provider that observes registered targets and produces snapshots.
 */
export class ContextProvider {
  private targets: Record<string, Target>;
  private observer: MutationObserver | null = null;
  private onChangeCallback: (() => void) | null = null;

  constructor(targets: Record<string, Target>) {
    this.targets = targets;
  }

  /**
   * Update the targets registry (e.g. when targets change at runtime).
   */
  setTargets(targets: Record<string, Target>): void {
    this.targets = targets;
  }

  /**
   * Scan all registered targets for the current page and build a
   * GhostContext snapshot.
   *
   * @param currentPage - The active logical page identifier
   * @returns A context snapshot bounded to ~5 KB
   */
  scanContext(currentPage: string): GhostContext {
    const values: Record<string, string | number | boolean> = {};
    const availableTargets: string[] = [];

    for (const [id, target] of Object.entries(this.targets)) {
      // Only include targets that belong to the current page
      if (!this.isOnPage(target, currentPage)) continue;

      // Check if the element is resolvable
      const el = this.tryResolveElement(id, target);
      if (el) {
        availableTargets.push(id);
      }

      // Observe value if an observer is registered
      if (target.observe) {
        try {
          const val = target.observe();
          if (val !== undefined) {
            values[id] = val;
          }
        } catch {
          // Silently skip targets whose observe() throws
        }
      } else if (el) {
        // Auto-observe common form elements
        const autoVal = this.autoObserve(el);
        if (autoVal !== undefined) {
          values[id] = autoVal;
        }
      }
    }

    const context: GhostContext = {
      page: currentPage,
      values,
      availableTargets,
    };

    // Enforce size budget
    return this.enforceLimit(context);
  }

  /**
   * Start observing the DOM for mutations. Calls `onChange` when elements
   * that could affect context are added/removed/changed.
   */
  startObserving(onChange: () => void): void {
    this.stopObserving();
    this.onChangeCallback = onChange;

    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver((mutations) => {
      // Only fire for relevant mutations (attributes, child list)
      const isRelevant = mutations.some(
        (m) =>
          m.type === 'childList' ||
          (m.type === 'attributes' &&
            ['value', 'checked', 'disabled', 'aria-label', 'data-ghost-id'].includes(
              m.attributeName ?? '',
            )),
      );
      if (isRelevant && this.onChangeCallback) {
        this.onChangeCallback();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'checked', 'disabled', 'aria-label', 'data-ghost-id'],
    });
  }

  /**
   * Stop the MutationObserver.
   */
  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.onChangeCallback = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Check if a target belongs to the given page. */
  private isOnPage(target: Target, page: string): boolean {
    if (Array.isArray(target.page)) {
      return target.page.includes(page) || target.page.includes('*');
    }
    return target.page === page || target.page === '*';
  }

  /**
   * Try to resolve an element for a target. Returns null if not found
   * or if it's a forbidden input type.
   */
  private tryResolveElement(id: string, target: Target): HTMLElement | null {
    let el: HTMLElement | null = null;

    // Use custom resolver first
    if (target.resolve) {
      try {
        el = target.resolve();
      } catch {
        return null;
      }
    }

    // Fall back to data-ghost-id attribute
    if (!el) {
      el = document.querySelector<HTMLElement>(`[data-ghost-id="${id}"]`);
    }

    if (!el) return null;

    // Reject excluded input types
    if (el instanceof HTMLInputElement && EXCLUDED_INPUT_TYPES.has(el.type)) {
      return null;
    }

    return el;
  }

  /**
   * Auto-observe value from common form elements.
   */
  private autoObserve(el: HTMLElement): string | number | boolean | undefined {
    if (el instanceof HTMLInputElement) {
      if (EXCLUDED_INPUT_TYPES.has(el.type)) return undefined;
      if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
      if (el.type === 'number' || el.type === 'range') {
        return el.value ? Number(el.value) : undefined;
      }
      return el.value || undefined;
    }
    if (el instanceof HTMLTextAreaElement) {
      return el.value || undefined;
    }
    if (el instanceof HTMLSelectElement) {
      return el.value || undefined;
    }
    return undefined;
  }

  /**
   * Enforce the ~5 KB output budget by truncating values if needed.
   */
  private enforceLimit(context: GhostContext): GhostContext {
    let json = JSON.stringify(context);
    const byteLength = new TextEncoder().encode(json).byteLength;

    if (byteLength <= MAX_CONTEXT_BYTES) return context;

    // Trim values to fit within budget — remove least-important entries
    const trimmed = { ...context, values: { ...context.values } };
    const keys = Object.keys(trimmed.values);

    while (keys.length > 0) {
      const key = keys.pop()!;
      const val = trimmed.values[key];
      // Truncate long string values first
      if (typeof val === 'string' && val.length > 100) {
        trimmed.values[key] = val.slice(0, 100) + '…';
      } else {
        delete trimmed.values[key];
      }

      json = JSON.stringify(trimmed);
      if (new TextEncoder().encode(json).byteLength <= MAX_CONTEXT_BYTES) break;
    }

    return trimmed;
  }
}
