/**
 * Ghost Cursor React Wrapper Component.
 *
 * SSR-safe wrapper that initializes createGhostCursor on mount
 * and disposes on unmount.
 *
 * Usage:
 *   <GhostCursor apiEndpoint="/api/ghost-cursor" />
 */

import { useEffect, useRef } from 'react';
import type { GhostCursorInstance, GhostCursorTheme } from '../types';

export interface GhostCursorProps {
  /** Customer backend gateway URL (same-origin). */
  apiEndpoint: string;
  /** Theme customization. */
  theme?: GhostCursorTheme;
  /** Whether to require user approval before executing actions. Default: true. */
  requireApprovalForActions?: boolean;
  /** Custom headers callback for auth tokens, CSRF, etc. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Optional callback returning current logical page ID (defaults to location.pathname) */
  page?: () => string;
}

/**
 * React component that mounts the Ghost Cursor AI co-pilot widget.
 *
 * Place this at the root of your app layout for persistent mounting
 * across SPA navigation.
 */
export function GhostCursor({
  apiEndpoint,
  theme,
  requireApprovalForActions = true,
  headers,
  page,
}: GhostCursorProps): JSX.Element | null {
  const instanceRef = useRef<GhostCursorInstance | null>(null);

  useEffect(() => {
    // SSR guard: only mount in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Dynamic import to avoid SSR issues
    import('../ghost-cursor').then(({ createGhostCursor }) => {
      if (instanceRef.current) return; // Already initialized

      instanceRef.current = createGhostCursor({
        gatewayUrl: apiEndpoint,
        theme: theme || {},
        requireApproval: requireApprovalForActions,
        headers,
        page: page || (() => (typeof window !== 'undefined' ? window.location.pathname : '/')),
      });
    });


    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, [apiEndpoint]);

  // This component renders nothing — the widget creates its own DOM elements
  return null;
}

export default GhostCursor;

