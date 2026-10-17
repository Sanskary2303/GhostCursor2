/**
 * @ghost-cursor/sdk – API Client
 *
 * HTTP client for communicating with the customer's backend gateway.
 * Handles start/continue run commands with 64KiB request size validation.
 */

import type { GhostContext, RunResponse } from '../types.js';

/** Maximum request body size: 64 KiB */
const MAX_REQUEST_BODY_BYTES = 64 * 1024;

/**
 * API client for the Ghost Cursor gateway.
 */
export class ApiClient {
  private gatewayUrl: string;
  private getHeaders: () => Record<string, string> | Promise<Record<string, string>>;

  constructor(
    gatewayUrl: string,
    getHeaders?: () => Record<string, string> | Promise<Record<string, string>>,
  ) {
    this.gatewayUrl = gatewayUrl;
    this.getHeaders = getHeaders ?? (() => ({}));
  }

  /**
   * Start a new run with a user message.
   *
   * @param message - The user's natural-language instruction
   * @param context - Current application context snapshot
   * @returns The gateway response
   */
  async startRun(message: string, context: GhostContext): Promise<RunResponse> {
    const body = {
      protocolVersion: '1',
      command: 'start',
      message,
      context,
    };
    return this.post(body);
  }

  /**
   * Continue an existing run with action results or an answer.
   *
   * @param runId      - Active run ID
   * @param eventId    - Event ID for this continuation
   * @param revision   - Current revision for optimistic concurrency
   * @param kind       - Type of continuation: "action_results" or "answer"
   * @param results    - Action execution results (when kind = "action_results")
   * @param answer     - User's answer to a clarification question (when kind = "answer")
   * @param context    - Updated application context snapshot
   * @returns The gateway response
   */
  async continueRun(
    runId: string,
    eventId: string,
    revision: number,
    kind: 'action_results' | 'answer' | 'actions' | 'cancel',
    results?: Array<{ id: string; success?: boolean; ok?: boolean; output?: string; error?: string }>,
    answer?: string,
    context?: GhostContext,
  ): Promise<RunResponse> {
    const normalizedKind = (kind === 'action_results' || kind === 'actions') ? 'actions' : kind;
    const normalizedResults = results?.map(r => ({
      id: r.id,
      ok: r.ok ?? r.success ?? true,
      success: r.success ?? r.ok ?? true,
      output: r.output,
      error: r.error,
    }));

    const body: Record<string, unknown> = {
      protocolVersion: '1',
      command: 'continue',
      runId,
      eventId,
      revision,
      kind: normalizedKind,
    };

    if (normalizedKind === 'actions' && normalizedResults) {
      body.results = normalizedResults;
    }
    if (normalizedKind === 'answer' && answer !== undefined) {
      body.answer = answer;
    }
    if (context) {
      body.context = context;
    }


    return this.post(body);
  }

  /**
   * Fetch contextual suggested questions for the current page.
   *
   * @param page    - Current logical page
   * @param targets - Registered targets IDs on current screen
   * @returns Array of 2-3 suggested question strings
   */
  async getSuggestions(page: string, targets?: string[]): Promise<string[]> {
    try {
      const baseUrl = this.gatewayUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/suggestions?page=${encodeURIComponent(page)}`;
      const headers = await this.getHeaders();
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...headers,
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.suggestions) ? data.suggestions : [];
    } catch {
      return [];
    }
  }


  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Send a POST request to the gateway with size validation.
   */
  private async post(body: unknown): Promise<RunResponse> {
    const json = JSON.stringify(body);
    const bodyBytes = new TextEncoder().encode(json).byteLength;

    if (bodyBytes > MAX_REQUEST_BODY_BYTES) {
      throw new GhostApiError(
        `Request body exceeds 64 KiB limit (${bodyBytes} bytes). ` +
        `Reduce context or message size.`,
        413,
      );
    }

    const customHeaders = await this.getHeaders();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    let response: Response;
    try {
      response = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers,
        body: json,
        credentials: 'same-origin',
      });
    } catch (err) {
      throw new GhostApiError(
        `Network error communicating with Ghost gateway: ${(err as Error).message}`,
        0,
      );
    }

    if (!response.ok) {
      let errorText: string;
      try {
        errorText = await response.text();
      } catch {
        errorText = response.statusText;
      }
      throw new GhostApiError(
        `Gateway returned ${response.status}: ${errorText}`,
        response.status,
      );
    }

    const data = (await response.json()) as RunResponse;

    // Basic protocol version check
    if (data.protocolVersion && data.protocolVersion !== '1') {
      console.warn(
        `[ghost-cursor] Unexpected protocol version: ${data.protocolVersion}. Expected "1".`,
      );
    }

    return data;
  }
}

/**
 * Error class for API communication failures.
 */
export class GhostApiError extends Error {
  /** HTTP status code (0 for network errors) */
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'GhostApiError';
    this.statusCode = statusCode;
  }
}
