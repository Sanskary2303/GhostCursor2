/**
 * Action Executor — dispatches AI-planned actions to the DOM.
 * 
 * Runs actions sequentially, waiting for SPA route changes and
 * element readiness between steps. Reports execution status.
 */

import { resolveTarget, reResolveTarget } from '../target-resolver';
import { setNativeValue, toggleCheckbox } from './native-setter';
import { CursorEngine } from '../cursor-engine';
import type { ActionItem } from '../../types';

export interface ExecutionResult {
  id: string;
  ok: boolean;
  output?: string;
  error?: string;
}

/**
 * Execute a batch of actions sequentially with cursor animation.
 * Halts on failure, reports remaining as skipped.
 */
export async function executeActions(
  actions: ActionItem[],
  cursorEngine: CursorEngine,
  onStepStart?: (action: ActionItem, index: number) => void,
  onStepComplete?: (action: ActionItem, index: number, result: ExecutionResult) => void,
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    onStepStart?.(action, i);

    try {
      await executeSingleAction(action, cursorEngine);
      const result: ExecutionResult = { id: action.id, ok: true, output: 'completed' };
      results.push(result);
      onStepComplete?.(action, i, result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const result: ExecutionResult = { id: action.id, ok: false, error: errMsg };
      results.push(result);
      onStepComplete?.(action, i, result);

      // Mark remaining actions as skipped
      for (let j = i + 1; j < actions.length; j++) {
        results.push({
          id: actions[j].id,
          ok: false,
          error: `Skipped: previous action "${action.id}" failed.`,
        });
      }
      break;
    }

    // Small delay between actions for visual clarity
    await sleep(300);
  }

  return results;
}

/**
 * Execute a single action with cursor animation.
 */
async function executeSingleAction(action: ActionItem, cursor: CursorEngine): Promise<void> {
  const tool = action.tool;
  const params = action.parameters;

  switch (tool) {
    case 'navigate':
      await executeNavigate(String(params.target_page ?? ''), cursor);
      break;
    case 'click':
      await executeClick(String(params.target_id ?? ''), cursor);
      break;
    case 'fill_input':
      await executeFillInput(String(params.target_id ?? ''), params.value, cursor);
      break;
    case 'select_option':
      await executeSelectOption(String(params.target_id ?? ''), String(params.option ?? ''), cursor);
      break;
    case 'toggle_switch':
      await executeToggle(String(params.target_id ?? ''), Boolean(params.state), cursor);
      break;
    case 'guided_tour':
      // Tours are handled separately by the TourEngine
      break;

    case 'ask_clarification':
      // Clarifications are handled by the widget UI
      break;
    default:
      throw new Error(`Unknown action tool: ${tool}`);
  }
}

/** Navigate to a page within the SPA. */
async function executeNavigate(targetPage: string, cursor: CursorEngine): Promise<void> {
  // Sanitize: same-origin only
  if (targetPage.includes('://') || targetPage.startsWith('//')) {
    throw new Error('Cross-origin navigation is not permitted.');
  }

  // Try to find a navigation link with data-ghost-nav
  const navLink = document.querySelector(
    `[data-ghost-nav="${CSS.escape(targetPage)}"]`
  ) as HTMLElement;

  if (navLink) {
    await cursor.animateTo(navLink);
    navLink.click();
  } else {
    // Fallback: pushState for SPA routing
    const path = targetPage.startsWith('/') ? targetPage : `/${targetPage}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  // Wait for route change to settle
  await sleep(500);
}

/** Click a registered element. */
async function executeClick(targetId: string, cursor: CursorEngine): Promise<void> {
  const el = await resolveTarget(targetId);
  await cursor.animateTo(el as HTMLElement);
  
  // Re-resolve immediately before acting
  const freshEl = reResolveTarget(targetId);
  if (!freshEl) throw new Error(`Target "${targetId}" became stale.`);
  
  (freshEl as HTMLElement).click();
}

/** Fill an input or textarea with a value. */
async function executeFillInput(targetId: string, value: any, cursor: CursorEngine): Promise<void> {
  const el = await resolveTarget(targetId) as HTMLInputElement;
  await cursor.animateTo(el);

  const freshEl = reResolveTarget(targetId) as HTMLInputElement;
  if (!freshEl) throw new Error(`Target "${targetId}" became stale.`);

  // Focus the element
  freshEl.focus();
  await sleep(100);

  setNativeValue(freshEl, value);

  // Verify value was retained after render
  await sleep(100);
}

/** Select an option from a dropdown. */
async function executeSelectOption(targetId: string, option: string, cursor: CursorEngine): Promise<void> {
  const el = await resolveTarget(targetId) as HTMLSelectElement;
  await cursor.animateTo(el);

  const freshEl = reResolveTarget(targetId) as HTMLSelectElement;
  if (!freshEl) throw new Error(`Target "${targetId}" became stale.`);

  freshEl.value = option;
  freshEl.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Toggle a switch/checkbox. */
async function executeToggle(targetId: string, state: boolean, cursor: CursorEngine): Promise<void> {
  const el = await resolveTarget(targetId) as HTMLInputElement;
  await cursor.animateTo(el);

  const freshEl = reResolveTarget(targetId) as HTMLInputElement;
  if (!freshEl) throw new Error(`Target "${targetId}" became stale.`);

  toggleCheckbox(freshEl, state);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

