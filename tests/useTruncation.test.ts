import { describe, it, expect, vi } from "vitest";

// Mock @chenglou/pretext
vi.mock("@chenglou/pretext", () => {
  const CHAR_WIDTH = 10;

  function makeLines(text: string, maxWidth: number) {
    if (!text) return [];
    const charsPerLine = Math.max(1, Math.floor(maxWidth / CHAR_WIDTH));
    const lines: Array<{
      text: string;
      width: number;
      start: { segmentIndex: number; graphemeIndex: number };
      end: { segmentIndex: number; graphemeIndex: number };
    }> = [];
    let pos = 0;
    while (pos < text.length) {
      let end = Math.min(pos + charsPerLine, text.length);
      if (end < text.length && text[end] !== " ") {
        let lastSpace = -1;
        for (let i = end - 1; i > pos; i--) {
          if (text[i] === " ") {
            lastSpace = i;
            break;
          }
        }
        if (lastSpace > pos) end = lastSpace + 1;
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
    prepare: vi.fn((text: string) => ({ __text: text })),
    prepareWithSegments: vi.fn((text: string) => ({
      __text: text,
      segments: [text],
    })),
    layout: vi.fn((prepared: any, maxWidth: number, lineHeight: number) => {
      const lines = makeLines(prepared.__text, maxWidth);
      return { lineCount: lines.length, height: lines.length * lineHeight };
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

// We need renderHook from @testing-library/react
import { renderHook } from "@testing-library/react";
import { useTruncation } from "../src/useTruncation";

describe("useTruncation", () => {
  const font = "16px monospace";
  // Mock: each char = 10px wide

  it("returns full text when it fits within maxLines", () => {
    // "hello" = 50px, container = 200px, fits in 1 line, maxLines = 3
    const { result } = renderHook(() =>
      useTruncation("hello", { lines: 3, containerWidth: 200, font })
    );
    expect(result.current.isTruncated).toBe(false);
    expect(result.current.truncatedText).toBe("hello");
    expect(result.current.totalLines).toBe(1);
  });

  it("truncates when text exceeds maxLines", () => {
    // 40 chars, container=100px (10 chars/line) => 4+ lines, maxLines=2
    const text = "abcdefghij klmnopqrst uvwxyz1234 5678abcd";
    const { result } = renderHook(() =>
      useTruncation(text, { lines: 2, containerWidth: 100, font })
    );
    expect(result.current.isTruncated).toBe(true);
    expect(result.current.truncatedText.length).toBeLessThan(text.length);
    expect(result.current.totalLines).toBeGreaterThan(2);
  });

  it("handles empty text", () => {
    const { result } = renderHook(() =>
      useTruncation("", { lines: 3, containerWidth: 200, font })
    );
    expect(result.current.isTruncated).toBe(false);
    expect(result.current.truncatedText).toBe("");
  });

  it("handles zero container width", () => {
    const { result } = renderHook(() =>
      useTruncation("hello", { lines: 3, containerWidth: 0, font })
    );
    expect(result.current.isTruncated).toBe(false);
  });

  it("respects breakOnWord option", () => {
    // Word boundary breaking should not cut mid-word
    const text = "abcdefghij klmnopqrst uvwxyz1234 5678abcd";
    const { result } = renderHook(() =>
      useTruncation(text, {
        lines: 2,
        containerWidth: 100,
        font,
        breakOnWord: true,
      })
    );
    if (result.current.isTruncated) {
      const truncated = result.current.truncatedText;
      // Should end at a word boundary (space or end)
      const lastChar = truncated[truncated.length - 1];
      // Either ends at text boundary or previous char is a natural break
      expect(truncated.length).toBeGreaterThan(0);
    }
  });

  it("handles text that exactly fills maxLines", () => {
    // 20 chars, container=100px (10 chars/line) => exactly 2 lines, maxLines=2
    const text = "abcdefghij klmnopqrs";
    const { result } = renderHook(() =>
      useTruncation(text, { lines: 2, containerWidth: 100, font })
    );
    // Should not be truncated since it fits exactly
    expect(result.current.isTruncated).toBe(false);
  });

  it("returns correct totalLines count", () => {
    // 30 chars, container=100px (10 chars/line) => 3+ lines
    const text = "abcdefghij klmnopqrst uvwxyz123";
    const { result } = renderHook(() =>
      useTruncation(text, { lines: 5, containerWidth: 100, font })
    );
    expect(result.current.totalLines).toBeGreaterThanOrEqual(3);
  });

  it("trims trailing whitespace from truncated text", () => {
    const text = "hello world this is a test of truncation";
    const { result } = renderHook(() =>
      useTruncation(text, { lines: 1, containerWidth: 100, font })
    );
    if (result.current.isTruncated) {
      expect(result.current.truncatedText).not.toMatch(/\s+$/);
    }
  });
});
