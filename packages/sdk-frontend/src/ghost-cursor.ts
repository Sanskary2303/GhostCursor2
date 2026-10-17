/**
 * Ghost Cursor — Main orchestration class.
 *
 * Ties together the widget, cursor engine, context provider,
 * API client, tour engine, and action executor into a single
 * unified co-pilot experience.
 */

import { GhostCursorWidget } from './ui/widget';
import { CursorEngine } from './core/cursor-engine';
import { TourEngine } from './core/tour-engine';
import { ApiClient } from './core/api-client';
import { ContextProvider } from './core/context-provider';
import { executeActions } from './core/executor/action-executor';
import type { GhostCursorConfig, GhostCursorInstance, RunResponse, ActionItem } from './types';

/**
 * Create and initialize a Ghost Cursor instance.
 *
 * @param config - Configuration options including gateway URL, theme, etc.
 * @returns Instance with dispose() cleanup method
 */
export function createGhostCursor(config: GhostCursorConfig): GhostCursorInstance {
  const {
    gatewayUrl,
    theme = {},
    requireApproval = true,
    mount = null,
  } = config;

  const primaryColor = theme.primaryColor || '#6366f1';
  const cursorColor = theme.cursorColor || primaryColor;

  const getPage = config.page || (() => (typeof window !== 'undefined' ? window.location.pathname : '/'));
  const targets = config.targets || {};

  // Initialize subsystems
  const apiClient = new ApiClient(gatewayUrl, config.headers);
  const contextProvider = new ContextProvider(targets);
  const cursorEngine = new CursorEngine(cursorColor);
  const tourEngine = new TourEngine();

  // Run state
  let currentRunId: string | null = null;
  let currentRevision = 0;
  let pendingActions: ActionItem[] = [];
  let isExecuting = false;
  let disposed = false;

  // Initialize widget
  const widget = new GhostCursorWidget(
    mount,
    primaryColor,
    {
      onSendMessage: handleSendMessage,
      onApproveActions: handleApprove,
      onRejectActions: handleReject,
      onAnswerQuestion: handleAnswer,
      onStop: handleStop,
    },
    theme.icon,
  );

  async function handleSendMessage(message: string): Promise<void> {
    if (disposed || isExecuting) return;

    widget.addUserMessage(message);
    widget.showLoading();
    widget.setInputDisabled(true);

    try {
      const context = contextProvider.scanContext(getPage());
      const response = await apiClient.startRun(message, context);
      handleResponse(response);
    } catch (error) {
      widget.removeLoading();
      widget.addAssistantMessage('Sorry, I encountered an error. Please try again.');
      widget.setInputDisabled(false);
    }
  }


  function handleResponse(response: RunResponse): void {
    if (disposed) return;

    currentRunId = response.runId;
    currentRevision = response.revision;

    widget.removeLoading();

    switch (response.status) {
      case 'awaiting_actions': {
        const actions = response.actions || [];
        // Check if any action is a guided tour
        const tourAction = actions.find(a => a.tool === 'guided_tour');
        if (tourAction) {
          // Auto-approve tours
          widget.addAssistantMessage(response.reply || "Let me show you!");
          executeTour(tourAction);
        } else if (requireApproval && actions.length > 0) {
          pendingActions = actions;
          widget.showActionPlan(actions, response.reply || undefined);
        } else {
          pendingActions = actions;
          handleApprove();
        }
        break;
      }
      case 'awaiting_answer': {
        const questions = response.questions || [];
        if (questions.length > 0) {
          widget.showQuestion(questions[0]);
        }
        widget.setInputDisabled(false);
        break;
      }
      case 'completed': {
        if (response.reply) {
          widget.addAssistantMessage(response.reply);
        }
        currentRunId = null;
        widget.setInputDisabled(false);
        break;
      }
      case 'failed': {
        widget.addAssistantMessage(response.reply || 'Something went wrong. Please try again.');
        currentRunId = null;
        widget.setInputDisabled(false);
        break;
      }
      default:
        widget.setInputDisabled(false);
    }
  }

  async function handleApprove(): Promise<void> {
    if (disposed || isExecuting || pendingActions.length === 0) return;

    isExecuting = true;
    widget.setInputDisabled(true);
    widget.addSystemMessage('Executing actions...');

    // Close the chat interface so it does not hide elements on screen while actions execute
    widget.close();

    try {
      const results = await executeActions(
        pendingActions,
        cursorEngine,
        (action, idx) => {
          widget.updateStepStatus(action.id, 'running');
        },
        (action, idx, result) => {
          widget.updateStepStatus(action.id, result.ok ? 'done' : 'failed');
        },
      );

      cursorEngine.hide();

      // Reopen the chat interface once actions are complete to display response
      widget.open();

      // Continue the run with results
      if (currentRunId) {
        widget.showLoading();
        const eventId = crypto.randomUUID();
        const context = contextProvider.scanContext(getPage());
        const response = await apiClient.continueRun(
          currentRunId, eventId, currentRevision, 'action_results', results, undefined, context
        );
        handleResponse(response);
      } else {
        const allOk = results.every(r => r.ok);
        widget.addAssistantMessage(allOk ? 'Done! All actions completed successfully. ✓' : 'Some actions could not be completed.');
        widget.setInputDisabled(false);
      }
    } catch (error) {
      widget.open();
      widget.addAssistantMessage('An error occurred during execution.');
      widget.setInputDisabled(false);
    } finally {
      isExecuting = false;
      pendingActions = [];
      cursorEngine.hide();
    }
  }

  async function handleReject(): Promise<void> {
    pendingActions = [];
    widget.addSystemMessage('Actions cancelled.');

    if (currentRunId) {
      try {
        const eventId = crypto.randomUUID();
        await apiClient.continueRun(currentRunId, eventId, currentRevision, 'cancel');
      } catch { /* ignore */ }
    }

    currentRunId = null;
    widget.setInputDisabled(false);
  }

  async function handleAnswer(answer: string): Promise<void> {
    if (disposed || !currentRunId) return;

    widget.addUserMessage(answer);
    widget.showLoading();
    widget.setInputDisabled(true);

    try {
      const eventId = crypto.randomUUID();
      const context = contextProvider.scanContext(getPage());
      const response = await apiClient.continueRun(
        currentRunId, eventId, currentRevision, 'answer', undefined, answer, context
      );
      handleResponse(response);
    } catch {
      widget.addAssistantMessage('Sorry, I encountered an error processing your answer.');
      widget.setInputDisabled(false);
    }
  }

  function handleStop(): void {
    isExecuting = false;
    cursorEngine.hide();
    widget.addSystemMessage('Stopped. Applied changes remain.');
    widget.setInputDisabled(false);
  }

  async function executeTour(tourAction: ActionItem): Promise<void> {
    const rawSteps = tourAction.parameters?.steps;
    const steps = Array.isArray(rawSteps) ? (rawSteps as any) : [];
    if (steps.length === 0) return;

    // Close the chat interface so the guided tour highlights are not covered
    widget.close();
    widget.setInputDisabled(true);
    tourEngine.startTour(steps, () => {
      // Reopen the chat interface once the tour completes
      widget.open();
      widget.addSystemMessage('Tour complete!');
      widget.setInputDisabled(false);

      // Continue the run
      if (currentRunId) {
        widget.showLoading();
        const eventId = crypto.randomUUID();
        apiClient.continueRun(
          currentRunId, eventId, currentRevision, 'action_results',
          [{ id: tourAction.id, ok: true, output: 'Tour completed' }]
        ).then(handleResponse).catch(() => widget.setInputDisabled(false));
      }
    });
  }


  return {
    dispose() {
      disposed = true;
      widget.dispose();
      cursorEngine.dispose();
      tourEngine.dispose();
    },
    open() {
      widget.open();
    },
    close() {
      widget.close();
    },
  };
}

