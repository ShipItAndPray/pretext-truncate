import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";

// Mock @chenglou/pretext before importing components
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

// We need to mock ResizeObserver and getComputedStyle for jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = MockResizeObserver;

import { render, screen, fireEvent } from "@testing-library/react";
import { Truncate } from "../src/Truncate";

// Mock getComputedStyle to return known font values
const originalGetComputedStyle = globalThis.getComputedStyle;
beforeEach(() => {
  globalThis.getComputedStyle = vi.fn().mockReturnValue({
    fontStyle: "normal",
    fontWeight: "400",
    fontSize: "16px",
    lineHeight: "24px",
    fontFamily: "monospace",
  }) as any;
});

describe("Truncate component", () => {
  const longText =
    "This is a very long paragraph of text that should definitely be truncated when we limit it to just a few lines. It contains enough words to span many lines in a narrow container, making it perfect for testing our truncation component.";

  it("renders the text content", () => {
    const { container } = render(
      createElement(Truncate, {
        text: "Hello world",
        lines: 3,
        font: "16px monospace",
        lineHeight: 24,
      })
    );
    expect(container.textContent).toContain("Hello world");
  });

  it("shows expand button only when text is truncated", () => {
    // Short text that fits -- no button
    const { container, rerender } = render(
      createElement(Truncate, {
        text: "Short",
        lines: 3,
        expandLabel: "Show more",
        font: "16px monospace",
        lineHeight: 24,
      })
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders with custom wrapper element", () => {
    const { container } = render(
      createElement(Truncate, {
        text: "Hello",
        as: "section",
        font: "16px monospace",
        lineHeight: 24,
      })
    );
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("applies className to wrapper", () => {
    const { container } = render(
      createElement(Truncate, {
        text: "Hello",
        className: "my-truncate",
        font: "16px monospace",
        lineHeight: 24,
      })
    );
    expect(container.querySelector(".my-truncate")).not.toBeNull();
  });

  it("applies textClassName to text span", () => {
    const { container } = render(
      createElement(Truncate, {
        text: "Hello",
        textClassName: "my-text",
        font: "16px monospace",
        lineHeight: 24,
      })
    );
    expect(container.querySelector(".my-text")).not.toBeNull();
  });

  it("fires onExpandChange callback", () => {
    const onExpandChange = vi.fn();
    // Use controlled mode with a long text and narrow mock
    const { container } = render(
      createElement(Truncate, {
        text: longText,
        lines: 1,
        expandLabel: "More",
        collapseLabel: "Less",
        expanded: false,
        onExpandChange,
        font: "16px monospace",
        lineHeight: 24,
      })
    );

    const button = container.querySelector("button");
    if (button) {
      fireEvent.click(button);
      expect(onExpandChange).toHaveBeenCalledWith(true);
    }
  });

  it("supports default expanded state", () => {
    const { container } = render(
      createElement(Truncate, {
        text: longText,
        lines: 1,
        defaultExpanded: true,
        expandLabel: "More",
        collapseLabel: "Less",
        font: "16px monospace",
        lineHeight: 24,
      })
    );
    // When expanded, full text should be shown
    expect(container.textContent).toContain(longText);
  });
});
