/**
 * Ghost Cursor Chat Widget — Shadow DOM encapsulated UI.
 *
 * Custom element that renders the chat interface inside a shadow root
 * for complete CSS isolation from the host application.
 */

import { getWidgetStyles } from './styles';
import { GHOST_CURSOR_ICON } from './ghost-icon';
import type { ActionItem, QuestionItem } from '../types';

export interface WidgetCallbacks {
  onSendMessage: (message: string) => void;
  onApproveActions: () => void;
  onRejectActions: () => void;
  onAnswerQuestion: (answer: string) => void;
  onStop: () => void;
}

export class GhostCursorWidget {
  private hostEl: HTMLElement;
  private shadow: ShadowRoot;
  private toggleBtn!: HTMLElement;
  private panel!: HTMLElement;
  private messagesEl!: HTMLElement;
  private textareaEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLElement;
  private isOpen = false;
  private callbacks: WidgetCallbacks;
  private disabled = false;
  private iconUrl: string;

  constructor(
    mountPoint: HTMLElement | null,
    primaryColor: string = '#6366f1',
    callbacks: WidgetCallbacks,
    iconUrl: string = GHOST_CURSOR_ICON,
  ) {
    this.callbacks = callbacks;
    this.iconUrl = iconUrl;

    // Create custom element host
    this.hostEl = document.createElement('ghost-cursor-widget');
    this.hostEl.style.cssText = 'all: initial; position: fixed; z-index: 999996;';
    (mountPoint || document.body).appendChild(this.hostEl);

    // Shadow root for CSS isolation
    this.shadow = this.hostEl.attachShadow({ mode: 'open' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getWidgetStyles(primaryColor);
    this.shadow.appendChild(styleEl);

    // Build UI
    this.buildUI();
  }

  private renderIconHtml(): string {
    const icon = (this.iconUrl || '').trim();
    if (icon.startsWith('<svg')) {
      return icon;
    }
    return `<img src="${icon}" class="gc-toggle-img" alt="Ghost Cursor" />`;
  }

  private buildUI(): void {
    // Toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'gc-toggle';
    this.toggleBtn.innerHTML = `<div class="gc-toggle-icon">${this.renderIconHtml()}</div>`;
    this.toggleBtn.setAttribute('aria-label', 'Open Ghost Cursor AI assistant');
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.shadow.appendChild(this.toggleBtn);

    // Chat panel
    this.panel = document.createElement('div');
    this.panel.className = 'gc-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Ghost Cursor AI Assistant');
    this.panel.innerHTML = `
      <div class="gc-header">
        <div class="gc-header-avatar">${this.renderIconHtml()}</div>
        <div class="gc-header-info">
          <h3>Ghost Cursor</h3>
          <p>AI Co-pilot • Ready to help</p>
        </div>
        <button class="gc-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="gc-messages" role="log" aria-live="polite">
        <div class="gc-msg assistant">
          Hi! I'm Ghost Cursor, your AI co-pilot. I can navigate the app, fill forms, and answer questions for you. What would you like to do? 🚀
        </div>
      </div>
      <div class="gc-input-area">
        <textarea class="gc-textarea" placeholder="Ask me anything..." rows="1" aria-label="Type your message"></textarea>
        <button class="gc-send-btn" aria-label="Send message">↑</button>
      </div>
    `;
    this.shadow.appendChild(this.panel);

    // Cache elements
    this.messagesEl = this.panel.querySelector('.gc-messages')!;
    this.textareaEl = this.panel.querySelector('.gc-textarea')!;
    this.sendBtn = this.panel.querySelector('.gc-send-btn')!;

    // Event listeners
    this.panel.querySelector('.gc-close-btn')!.addEventListener('click', () => this.toggle());

    this.sendBtn.addEventListener('click', () => this.handleSend());

    this.textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Auto-resize textarea
    this.textareaEl.addEventListener('input', () => {
      this.textareaEl.style.height = 'auto';
      this.textareaEl.style.height = Math.min(this.textareaEl.scrollHeight, 120) + 'px';
    });
  }

  private toggle(): void {
    this.isOpen = !this.isOpen;
    this.panel.classList.toggle('visible', this.isOpen);
    this.toggleBtn.classList.toggle('open', this.isOpen);
    this.toggleBtn.innerHTML = this.isOpen
      ? '<span class="gc-toggle-close">✕</span>'
      : `<div class="gc-toggle-icon">${this.renderIconHtml()}</div>`;
    if (this.isOpen) {
      this.textareaEl.focus();
    }
  }

  private handleSend(): void {
    if (this.disabled) return;
    const msg = this.textareaEl.value.trim();
    if (!msg) return;
    this.textareaEl.value = '';
    this.textareaEl.style.height = 'auto';
    this.callbacks.onSendMessage(msg);
  }

  // ── Public API ──

  /** Add a user message bubble. */
  addUserMessage(text: string): void {
    const div = document.createElement('div');
    div.className = 'gc-msg user';
    div.textContent = text;
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  /** Add an assistant text reply. */
  addAssistantMessage(text: string): void {
    this.removeLoading();
    const div = document.createElement('div');
    div.className = 'gc-msg assistant';
    div.textContent = text;
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  /** Add a system message. */
  addSystemMessage(text: string): void {
    const div = document.createElement('div');
    div.className = 'gc-msg system';
    div.textContent = text;
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  /** Show the action plan with approve/reject buttons. */
  showActionPlan(actions: ActionItem[], reply?: string): void {
    this.removeLoading();

    if (reply) {
      this.addAssistantMessage(reply);
    }

    const card = document.createElement('div');
    card.className = 'gc-action-plan';

    const stepsHtml = actions.map((a, i) => {
      const p = a.parameters || {};
      const rawExp = p.explanation ?? `${a.tool}(${p.target_id ?? p.target_page ?? ''})`;
      const explanation = String(rawExp);
      return `
        <div class="gc-action-step" data-step-id="${a.id}">
          <div class="gc-step-icon">${i + 1}</div>
          <div>
            <strong>${this.escapeHtml(a.tool)}</strong>
            <div style="color: var(--gc-text-secondary); font-size: 12px;">${this.escapeHtml(explanation)}</div>
          </div>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <h4>🎯 Planned Actions</h4>
      ${stepsHtml}
      <div class="gc-action-buttons">
        <button class="gc-btn gc-btn-primary gc-approve-btn">✓ Approve and Run</button>
        <button class="gc-btn gc-btn-secondary gc-reject-btn">✕ Cancel</button>
      </div>
    `;

    card.querySelector('.gc-approve-btn')!.addEventListener('click', () => {
      this.setActionsDisabled(card, true);
      this.callbacks.onApproveActions();
    });
    card.querySelector('.gc-reject-btn')!.addEventListener('click', () => {
      this.setActionsDisabled(card, true);
      this.callbacks.onRejectActions();
    });

    this.messagesEl.appendChild(card);
    this.scrollToBottom();
  }

  /** Update a step's visual status during execution. */
  updateStepStatus(stepId: string, status: 'running' | 'done' | 'failed'): void {
    const step = this.messagesEl.querySelector(`[data-step-id="${CSS.escape(stepId)}"]`);
    if (!step) return;
    const icon = step.querySelector('.gc-step-icon') as HTMLElement;
    if (!icon) return;

    icon.className = `gc-step-icon ${status}`;
    if (status === 'done') icon.textContent = '✓';
    else if (status === 'failed') icon.textContent = '✕';
  }

  /** Show clarification question with option buttons. */
  showQuestion(question: QuestionItem): void {
    this.removeLoading();

    const div = document.createElement('div');
    div.className = 'gc-question';

    const opts = question.options || [];
    const optionsHtml = opts.map(opt =>
      `<button class="gc-option-btn">${this.escapeHtml(opt)}</button>`
    ).join('');


    div.innerHTML = `
      <div class="gc-msg assistant">${this.escapeHtml(question.question)}</div>
      ${optionsHtml}
    `;

    div.querySelectorAll('.gc-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.callbacks.onAnswerQuestion(btn.textContent || '');
        // Disable all option buttons
        div.querySelectorAll('.gc-option-btn').forEach(b => {
          (b as HTMLButtonElement).disabled = true;
          (b as HTMLElement).style.opacity = '0.5';
        });
        (btn as HTMLElement).style.opacity = '1';
        (btn as HTMLElement).style.borderColor = 'var(--gc-primary)';
        (btn as HTMLElement).style.color = 'var(--gc-primary)';
      });
    });

    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  /** Show loading dots. */
  showLoading(): void {
    this.removeLoading();
    const div = document.createElement('div');
    div.className = 'gc-loading';
    div.id = 'gc-loading';
    div.innerHTML = '<div class="gc-dot"></div><div class="gc-dot"></div><div class="gc-dot"></div>';
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  /** Remove loading indicator. */
  removeLoading(): void {
    this.shadow.getElementById('gc-loading')?.remove();
  }

  /** Disable/enable the input. */
  setInputDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.textareaEl.disabled = disabled;
    (this.sendBtn as HTMLButtonElement).disabled = disabled;
  }

  private setActionsDisabled(card: HTMLElement, disabled: boolean): void {
    card.querySelectorAll('button').forEach(btn => {
      (btn as HTMLButtonElement).disabled = disabled;
    });
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Open the chat panel. */
  open(): void {
    if (!this.isOpen) this.toggle();
  }

  /** Close the chat panel. */
  close(): void {
    if (this.isOpen) this.toggle();
  }

  /** Check if the chat panel is currently open. */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /** Remove widget from DOM. */
  dispose(): void {
    this.hostEl.remove();
  }
}

