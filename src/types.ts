import type { ReactNode, ElementType } from "react";

// --- Component Props ---

export interface TruncateProps {
  /** Text to truncate */
  text: string;
  /** Max visible lines before truncation (default: 3) */
  lines?: number;
  /** Truncation indicator appended after truncated text (default: "...") */
  ellipsis?: string | ReactNode;
  /** Label for the expand button (e.g. "Show more") */
  expandLabel?: string | ReactNode;
  /** Label for the collapse button (e.g. "Show less") */
  collapseLabel?: string | ReactNode;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Uncontrolled initial expanded state */
  defaultExpanded?: boolean;
  /** Callback when expanded state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** CSS class for the outer wrapper */
  className?: string;
  /** CSS class for the text span */
  textClassName?: string;
  /** CSS class for the toggle button */
  buttonClassName?: string;
  /** Wrapper element type (default: 'div') */
  as?: ElementType;
  /** Trim trailing whitespace at truncation point (default: true) */
  trimWhitespace?: boolean;
  /** Break at word boundary instead of mid-word (default: true) */
  breakOnWord?: boolean;
  /** Font shorthand for pretext measurement (e.g. "16px Inter, sans-serif"). Auto-detected from container if omitted. */
  font?: string;
  /** Line height in pixels. Auto-detected from container if omitted. */
  lineHeight?: number;
}

// --- Hook Result ---

export interface TruncationResult {
  /** Text visible before the ellipsis */
  truncatedText: string;
  /** Whether the text was actually truncated */
  isTruncated: boolean;
  /** Number of characters visible before ellipsis */
  visibleCharCount: number;
  /** Total lines the full text would occupy */
  totalLines: number;
  /** Character index in original string where truncation occurs */
  truncationIndex: number;
}

// --- Engine Types ---

export interface TruncationPoint {
  /** Index in original string where truncation occurs */
  charIndex: number;
  /** Which line this falls on (1-indexed) */
  lineNumber: number;
  /** Pixel offset from left edge on the truncation line */
  xOffset: number;
  /** Pixels remaining on the truncation line */
  remainingWidth: number;
}

export interface LineBreak {
  /** Start character index (inclusive) */
  start: number;
  /** End character index (exclusive) */
  end: number;
  /** Rendered width of this line in pixels */
  width: number;
}

