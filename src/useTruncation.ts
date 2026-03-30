import { useMemo } from "react";
import {
  prepareWithSegments,
  layoutWithLines,
  prepare,
  layout,
} from "@chenglou/pretext";

import {
  findTruncationPoint,
  backToWordBoundary,
  computeLineBreaks,
} from "./truncationEngine";
import type { TruncationResult } from "./types";

/**
 * React hook that computes the truncation point for a block of text.
 *
 * This runs synchronously during render (via useMemo) so the truncated
 * text is available on first paint -- no useEffect measure/re-render cycle.
 * The full text is never placed in the DOM when truncated.
 */
export function useTruncation(
  text: string,
  options: {
    lines: number;
    containerWidth: number;
    font: string;
    letterSpacing?: number;
    wordSpacing?: number;
    ellipsis?: string;
    breakOnWord?: boolean;
  }
): TruncationResult {
  const {
    lines: maxLines,
    containerWidth,
    font,
    letterSpacing,
    wordSpacing,
    ellipsis = "...",
    breakOnWord = true,
  } = options;

  return useMemo(() => {
    if (!text || containerWidth <= 0 || maxLines <= 0) {
      return {
        truncatedText: text || "",
        isTruncated: false,
        visibleCharCount: text ? text.length : 0,
        totalLines: text ? 1 : 0,
        truncationIndex: text ? text.length : 0,
      };
    }

    // Compute total lines for the full text
    const allLines = computeLineBreaks(text, containerWidth, {
      font,
      letterSpacing,
      wordSpacing,
    });
    const totalLines = allLines.length || 1;

    // No truncation needed
    if (totalLines <= maxLines) {
      return {
        truncatedText: text,
        isTruncated: false,
        visibleCharCount: text.length,
        totalLines,
        truncationIndex: text.length,
      };
    }

    // Measure the ellipsis string width
    let ellipsisWidth = 0;
    if (ellipsis) {
      const ellipsisPrepared = prepareWithSegments(ellipsis, font);
      const ellipsisLayout = layoutWithLines(ellipsisPrepared, Infinity, 1);
      ellipsisWidth =
        ellipsisLayout.lines.length > 0 ? ellipsisLayout.lines[0].width : 0;
    }

    const point = findTruncationPoint(
      text,
      maxLines,
      containerWidth,
      { font, letterSpacing, wordSpacing },
      ellipsisWidth
    );

    let charIndex = point.charIndex;

    // Apply word boundary breaking
    if (breakOnWord && charIndex < text.length) {
      charIndex = backToWordBoundary(text, charIndex);
    }

    // Trim trailing whitespace
    let truncated = text.slice(0, charIndex);
    truncated = truncated.replace(/\s+$/, "");

    return {
      truncatedText: truncated,
      isTruncated: true,
      visibleCharCount: truncated.length,
      totalLines,
      truncationIndex: charIndex,
    };
  }, [text, maxLines, containerWidth, font, letterSpacing, wordSpacing, ellipsis, breakOnWord]);
}
