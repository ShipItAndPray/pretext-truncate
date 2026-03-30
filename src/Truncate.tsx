import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { useContainerWidth } from "./useContainerWidth";
import { useTruncation } from "./useTruncation";
import type { TruncateProps } from "./types";

function useFontFromElement(el: HTMLElement | null): string {
  const [font, setFont] = useState("");

  useLayoutEffect(() => {
    if (!el) return;
    const style = getComputedStyle(el);
    // Build font shorthand from computed values
    const computed = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
    setFont(computed);
  }, [el]);

  // Re-check when web fonts finish loading
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || !el) return;
      const style = getComputedStyle(el);
      const computed = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
      setFont(computed);
    });
    return () => { cancelled = true; };
  }, [el]);

  return font;
}

function useLineHeightFromElement(el: HTMLElement | null): number {
  const [lh, setLh] = useState(0);

  useLayoutEffect(() => {
    if (!el) return;
    const style = getComputedStyle(el);
    const parsed = parseFloat(style.lineHeight);
    if (!isNaN(parsed) && parsed > 0) {
      setLh(parsed);
    } else {
      // "normal" lineHeight -- approximate as 1.2 * fontSize
      const fontSize = parseFloat(style.fontSize) || 16;
      setLh(fontSize * 1.2);
    }
  }, [el]);

  return lh;
}

/**
 * Multiline text truncation component with zero flash of content.
 *
 * Uses @chenglou/pretext to compute line breaks from font metrics alone,
 * finding the exact truncation point in pure JS. The full text is never
 * placed in the DOM when truncated -- zero flash, zero reflow.
 */
export function Truncate({
  text,
  lines = 3,
  ellipsis = "...",
  expandLabel,
  collapseLabel,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandChange,
  className,
  textClassName,
  buttonClassName,
  as: Component = "div",
  trimWhitespace = true,
  breakOnWord = true,
  font: fontProp,
  lineHeight: lineHeightProp,
}: TruncateProps) {
  const [containerRef, containerWidth] = useContainerWidth();
  const elementRef = useRef<HTMLElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      elementRef.current = node;
      containerRef(node);
    },
    [containerRef]
  );

  const detectedFont = useFontFromElement(elementRef.current);
  const detectedLineHeight = useLineHeightFromElement(elementRef.current);

  const font = fontProp || detectedFont;
  const lineHeight = lineHeightProp || detectedLineHeight;

  // Expand state -- support both controlled and uncontrolled
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = useCallback(() => {
    const next = !isExpanded;
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onExpandChange?.(next);
  }, [isExpanded, isControlled, onExpandChange]);

  // Compute truncation
  const { truncatedText, isTruncated } = useTruncation(text, {
    lines,
    containerWidth,
    font,
    ellipsis: typeof ellipsis === "string" ? ellipsis : "...",
    breakOnWord,
  });

  // Build the display text
  const displayText = isExpanded || !isTruncated ? text : truncatedText;

  // Build the ellipsis node
  const ellipsisNode: ReactNode =
    !isExpanded && isTruncated ? ellipsis : null;

  // Build the toggle button
  let toggleButton: ReactNode = null;
  if (isTruncated) {
    const label = isExpanded ? collapseLabel : expandLabel;
    if (label) {
      toggleButton = createElement(
        "button",
        {
          type: "button" as const,
          onClick: handleToggle,
          className: buttonClassName,
          style: {
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            font: "inherit",
          },
          "aria-expanded": isExpanded,
        },
        label
      );
    }
  }

  return createElement(
    Component,
    { ref: setRefs, className },
    createElement(
      "span",
      { className: textClassName },
      displayText,
      ellipsisNode
    ),
    toggleButton
  );
}
