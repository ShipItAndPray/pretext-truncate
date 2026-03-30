import {
  prepareWithSegments,
  layoutWithLines,
  prepare,
  layout,
} from "@chenglou/pretext";

import type { TruncationPoint, LineBreak } from "./types";

/**
 * Compute where each visual line breaks in the text.
 * Uses @chenglou/pretext to determine line breaks from font metrics alone --
 * no DOM measurement required.
 */
export function computeLineBreaks(
  text: string,
  containerWidth: number,
  fontMetrics: {
    font: string;
    letterSpacing?: number;
    wordSpacing?: number;
  }
): LineBreak[] {
  if (!text || containerWidth <= 0) return [];

  const prepared = prepareWithSegments(text, fontMetrics.font);
  // Use a lineHeight of 1 -- we only care about line structure, not pixel height
  const result = layoutWithLines(prepared, containerWidth, 1);

  let charOffset = 0;
  const breaks: LineBreak[] = [];

  for (const line of result.lines) {
    const lineText = line.text;
    const start = charOffset;
    const end = start + lineText.length;
    breaks.push({ start, end, width: line.width });
    charOffset = end;
  }

  return breaks;
}

/**
 * Find the exact character index where text should be truncated to fit
 * within `maxLines` lines, reserving space for the ellipsis.
 *
 * This is a pure function -- no DOM access. It uses @chenglou/pretext
 * to compute line breaks from font metrics and then finds the truncation
 * point on the last visible line.
 */
export function findTruncationPoint(
  text: string,
  maxLines: number,
  containerWidth: number,
  fontMetrics: {
    font: string;
    letterSpacing?: number;
    wordSpacing?: number;
  },
  ellipsisWidth: number
): TruncationPoint {
  if (!text || containerWidth <= 0 || maxLines <= 0) {
    return { charIndex: 0, lineNumber: 1, xOffset: 0, remainingWidth: containerWidth };
  }

  const lines = computeLineBreaks(text, containerWidth, fontMetrics);

  // Text fits within maxLines -- no truncation needed
  if (lines.length <= maxLines) {
    const lastLine = lines[lines.length - 1];
    return {
      charIndex: text.length,
      lineNumber: lines.length,
      xOffset: lastLine ? lastLine.width : 0,
      remainingWidth: lastLine ? containerWidth - lastLine.width : containerWidth,
    };
  }

  // We need to truncate. Find the end of line `maxLines`.
  const targetLine = lines[maxLines - 1];
  const availableWidth = containerWidth - ellipsisWidth;

  if (availableWidth <= 0) {
    // Ellipsis itself is wider than container -- just show nothing
    return {
      charIndex: targetLine.start,
      lineNumber: maxLines,
      xOffset: 0,
      remainingWidth: containerWidth,
    };
  }

  // The target line text might extend beyond availableWidth after the ellipsis
  // is accounted for. We need to find the character that fits.
  const lineText = text.slice(targetLine.start, targetLine.end);

  // Measure progressively shorter substrings of the last line to find
  // the longest one that leaves room for the ellipsis.
  // We start from the full line and work backwards.
  let charIndex = targetLine.end;

  if (targetLine.width + ellipsisWidth <= containerWidth) {
    // Entire line fits with ellipsis appended at the end
    charIndex = targetLine.end;
  } else {
    // Need to shorten the line to fit ellipsis
    // Use pretext to measure progressively shorter substrings
    for (let i = lineText.length; i >= 0; i--) {
      const sub = lineText.slice(0, i);
      if (!sub) {
        charIndex = targetLine.start;
        break;
      }
      const subPrepared = prepare(sub, fontMetrics.font);
      const subLayout = layout(subPrepared, Infinity, 1);
      // layout with Infinity width gives us the text width on a single line
      // We approximate width using height=lineHeight assumption
      // Actually, with Infinity maxWidth, lineCount should be 1 and we can
      // use the line approach instead
      const subPreparedSeg = prepareWithSegments(sub, fontMetrics.font);
      const subLines = layoutWithLines(subPreparedSeg, Infinity, 1);
      const subWidth = subLines.lines.length > 0 ? subLines.lines[0].width : 0;

      if (subWidth <= availableWidth) {
        charIndex = targetLine.start + i;
        break;
      }
    }
  }

  // Compute the xOffset at the truncation point
  const truncatedLineText = text.slice(targetLine.start, charIndex);
  let xOffset = 0;
  if (truncatedLineText) {
    const measPrepared = prepareWithSegments(truncatedLineText, fontMetrics.font);
    const measLines = layoutWithLines(measPrepared, Infinity, 1);
    xOffset = measLines.lines.length > 0 ? measLines.lines[0].width : 0;
  }

  return {
    charIndex,
    lineNumber: maxLines,
    xOffset,
    remainingWidth: containerWidth - xOffset,
  };
}

/**
 * Given a truncation char index and the original text, back up to the
 * nearest word boundary (space, hyphen, en-dash, em-dash).
 */
export function backToWordBoundary(text: string, index: number): number {
  if (index >= text.length) return index;
  if (index <= 0) return 0;

  // If we're already at a boundary, use it
  if (/\s/.test(text[index - 1] ?? "")) return index;

  // Walk backwards to find a space or hyphen
  for (let i = index - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === " " || ch === "\t" || ch === "-" || ch === "\u2013" || ch === "\u2014") {
      return i + 1;
    }
  }

  // No word boundary found -- fall back to character break
  return index;
}
