import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeLineBreaks,
  findTruncationPoint,
  backToWordBoundary,
} from "../src/truncationEngine";

// Mock @chenglou/pretext since it needs a browser environment for font measurement
vi.mock("@chenglou/pretext", () => {
  // Simulate monospace font: each character is 10px wide
  const CHAR_WIDTH = 10;

  function makeLines(text: string, maxWidth: number) {
    if (!text) return [];
    const charsPerLine = Math.max(1, Math.floor(maxWidth / CHAR_WIDTH));
    const lines: Array<{ text: string; width: number; start: { segmentIndex: number; graphemeIndex: number }; end: { segmentIndex: number; graphemeIndex: number } }> = [];

    // Simple word-wrap simulation
    let pos = 0;
    while (pos < text.length) {
      let end = Math.min(pos + charsPerLine, text.length);

      // Try to break at a word boundary if not at end
      if (end < text.length && text[end] !== " ") {
        let lastSpace = -1;
        for (let i = end - 1; i > pos; i--) {
          if (text[i] === " ") {
            lastSpace = i;
            break;
          }
        }
        if (lastSpace > pos) {
          end = lastSpace + 1; // include the space
        }
      }

      const lineText = text.slice(pos, end);
      lines.push({
        text: lineText,
        width: lineText.length * CHAR_WIDTH,
        start: { segmentIndex: 0, graphemeIndex: pos },
        end: { segmentIndex: 0, graphemeIndex: end },
      });
      pos = end;
    }
    return lines;
  }

  return {
    prepare: vi.fn((text: string, _font: string) => ({ __text: text })),
    prepareWithSegments: vi.fn((text: string, _font: string) => ({
      __text: text,
      segments: [text],
    })),
    layout: vi.fn((prepared: any, maxWidth: number, lineHeight: number) => {
      const lines = makeLines(prepared.__text, maxWidth);
      return {
        lineCount: lines.length,
        height: lines.length * lineHeight,
      };
    }),
    layoutWithLines: vi.fn(
      (prepared: any, maxWidth: number, lineHeight: number) => {
        const lines = makeLines(prepared.__text, maxWidth);
        return {
          lineCount: lines.length,
          height: lines.length * lineHeight,
          lines,
        };
      }
    ),
    layoutNextLine: vi.fn(),
    walkLineRanges: vi.fn(),
    clearCache: vi.fn(),
    setLocale: vi.fn(),
  };
});

describe("computeLineBreaks", () => {
  it("returns empty array for empty text", () => {
    const result = computeLineBreaks("", 200, { font: "16px monospace" });
    expect(result).toEqual([]);
  });

  it("returns empty array for zero width", () => {
    const result = computeLineBreaks("hello", 0, { font: "16px monospace" });
    expect(result).toEqual([]);
  });

  it("returns single line for short text", () => {
    // 5 chars * 10px = 50px, container is 200px
    const result = computeLineBreaks("hello", 200, { font: "16px monospace" });
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(5);
  });

  it("wraps text across multiple lines", () => {
    // 20 chars, container = 100px (10 chars per line) => 2 lines
    const text = "abcdefghij klmnopqrs";
    const result = computeLineBreaks(text, 100, { font: "16px monospace" });
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("handles single character", () => {
    const result = computeLineBreaks("x", 100, { font: "16px monospace" });
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(1);
  });
});

describe("findTruncationPoint", () => {
  const font = { font: "16px monospace" };
  // Mock char width = 10px, ellipsis "..." = 30px

  it("returns full text index when text fits within maxLines", () => {
    // "hello" = 50px, container = 200px, 1 line, maxLines = 3
    const result = findTruncationPoint("hello", 3, 200, font, 30);
    expect(result.charIndex).toBe(5);
    expect(result.lineNumber).toBe(1);
  });

  it("returns truncation point for multi-line text", () => {
    // 30 chars, container = 100px (10 chars/line) => 3+ lines
    // maxLines = 2, so truncation on line 2
    const text = "abcdefghij klmnopqrst uvwxyz123";
    const result = findTruncationPoint(text, 2, 100, font, 30);
    expect(result.charIndex).toBeLessThan(text.length);
    expect(result.lineNumber).toBe(2);
  });

  it("handles empty text", () => {
    const result = findTruncationPoint("", 3, 200, font, 30);
    expect(result.charIndex).toBe(0);
  });

  it("handles zero container width", () => {
    const result = findTruncationPoint("hello", 3, 0, font, 30);
    expect(result.charIndex).toBe(0);
  });

  it("handles maxLines = 1", () => {
    const text = "this is a long sentence that wraps";
    const result = findTruncationPoint(text, 1, 100, font, 30);
    expect(result.lineNumber).toBe(1);
    expect(result.charIndex).toBeLessThan(text.length);
  });
});

describe("backToWordBoundary", () => {
  it("returns same index if at end of text", () => {
    expect(backToWordBoundary("hello", 5)).toBe(5);
  });

  it("returns same index if previous char is space", () => {
    expect(backToWordBoundary("hello world", 6)).toBe(6);
  });

  it("backs up to word boundary", () => {
    // Index 8 is in the middle of "world"
    expect(backToWordBoundary("hello world", 8)).toBe(6);
  });

  it("backs up to hyphen boundary", () => {
    expect(backToWordBoundary("well-known fact", 7)).toBe(5);
  });

  it("falls back to character break when no boundary found", () => {
    expect(backToWordBoundary("abcdefghij", 5)).toBe(5);
  });

  it("handles index 0", () => {
    expect(backToWordBoundary("hello", 0)).toBe(0);
  });
});
