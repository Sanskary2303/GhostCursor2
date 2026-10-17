/**
 * @ghost-cursor/sdk – TypeScript type definitions
 *
 * All public interfaces for the Ghost Cursor frontend SDK.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration passed to `createGhostCursor()`.
 */
export interface GhostCursorConfig {
  /** URL of the customer's backend gateway (e.g. "/api/ghost") */
  gatewayUrl: string;

  /**
   * Optional callback that returns the current logical page identifier.
   * If omitted, defaults to location.pathname.
   */
  page?: () => string;


  /**
   * Record of registered targets keyed by logical ID.
   * The SDK uses these to resolve elements, read values, and execute actions.
   */
  targets?: Record<string, Target>;

  /**
   * Optional async callback that returns extra HTTP headers
   * (e.g. auth tokens) to attach to every gateway request.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;

  /**
   * Optional DOM element to mount the chat widget into.
   * Defaults to `document.body`.
   */
  mountElement?: HTMLElement;
  mount?: HTMLElement | null;

  /** Optional theme overrides */
  theme?: ThemeConfig;

  /** If true, actions require explicit user approval before executing (default: true) */
  requireApprovalForActions?: boolean;
  requireApproval?: boolean;
}


/**
 * Theme configuration for the chat widget.
 */
export interface ThemeConfig {
  /** Primary brand color (CSS value). Default: "#6C5CE7" */
  primaryColor?: string;
  /** Cursor trail color. Default: same as primaryColor */
  cursorColor?: string;
  /** Widget position: "bottom-right" | "bottom-left". Default: "bottom-right" */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom icon URL or image data for the chat bubble */
  icon?: string;
}

/** Alias for ThemeConfig */
export type GhostCursorTheme = ThemeConfig;


// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/**
 * A registered UI target that the AI can interact with.
 *
 * Logical IDs must match: ^[a-zA-Z0-9_.:-]+$ (1-120 chars)
 */
export interface Target {
  /** The page(s) this target appears on. Can be a string or array. */
  page: string | string[];

  /**
   * Resolve the DOM element for this target.
   * Falls back to the target-resolver cascade if not provided.
   */
  resolve?: () => HTMLElement | null;

  /** Human-readable operations the AI can perform on this target */
  operations?: string[];

  /**
   * Optional: observe current value for context scanning.
   * Return undefined to skip.
   */
  observe?: () => string | number | boolean | undefined;

  /**
   * Optional: commit a value to this target (programmatic write).
   * Return true if successful.
   */
  commit?: (value: string) => boolean;

  /**
   * Optional: custom execute handler for this target.
   * Receives the tool name and parameters. Return true on success.
   */
  execute?: (tool: string, params: Record<string, unknown>) => boolean | Promise<boolean>;

  /**
   * Optional: verify that an action was applied successfully.
   * Called after execute/commit.
   */
  verify?: () => boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Snapshot of the current application context sent to the brain.
 */
export interface GhostContext {
  /** Current logical page identifier */
  page: string;

  /** Key-value pairs of observed target values on the current page */
  values: Record<string, string | number | boolean>;

  /** List of target IDs available (resolvable) on the current page */
  availableTargets: string[];
}

// ---------------------------------------------------------------------------
// Actions & Questions
// ---------------------------------------------------------------------------

/**
 * A single action the brain wants the SDK to execute.
 */
export interface ActionItem {
  /** Unique ID for this action within the run */
  id: string;

  /** Tool name: navigate, click, fill_input, toggle_switch, guided_tour, ask_clarification */
  tool: string;

  /** Tool-specific parameters */
  parameters: Record<string, unknown>;
}

/**
 * A clarification question the brain needs answered.
 */
export interface QuestionItem {
  /** The question text */
  question: string;

  /** Optional list of predefined answer options */
  options?: string[];
}

// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------

/**
 * Response from the gateway endpoint.
 */
export interface RunResponse {
  /** Protocol version (must be "1") */
  protocolVersion: string;

  /** Unique run identifier */
  runId: string;

  /** Monotonically-increasing revision for optimistic concurrency */
  revision: number;

  /** Current run status */
  status: 'awaiting_actions' | 'awaiting_answer' | 'completed' | 'failed';

  /** Human-readable reply text from the AI */
  reply?: string;

  /** Clarification questions (when status = "awaiting_answer") */
  questions?: QuestionItem[];

  /** Actions to execute (when status = "awaiting_actions") */
  actions?: ActionItem[];
}

// ---------------------------------------------------------------------------
// Action execution result
// ---------------------------------------------------------------------------

/**
 * Result of executing a single action.
 */
export interface ActionResult {
  /** The action ID */
  id: string;

  /** Whether the action succeeded */
  success: boolean;

  /** Optional error message on failure */
  error?: string;
}

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

/**
 * Handle returned by `createGhostCursor()`.
 */
export interface GhostCursorInstance {
  /** Tear down the SDK, remove widget and event listeners. */
  dispose(): void;
  /** Open the chat widget programmatically. */
  open(): void;
  /** Close the chat widget programmatically. */
  close(): void;
}


// ---------------------------------------------------------------------------
// Internal message types for the widget
// ---------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Attached action plan (shown as a card) */
  actions?: ActionItem[];
  /** Attached questions */
  questions?: QuestionItem[];
  /** Whether actions have been approved */
  actionsApproved?: boolean;
  /** Whether actions are currently executing */
  actionsExecuting?: boolean;
  /** Action results after execution */
  actionResults?: ActionResult[];
}
