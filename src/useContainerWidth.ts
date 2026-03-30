import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Track the content width of a container element using ResizeObserver.
 * Returns [ref callback, width].
 *
 * On mount, reads clientWidth synchronously in useLayoutEffect to avoid
 * a frame of zero-width. Width changes from ResizeObserver trigger
 * re-computation of truncation.
 */
export function useContainerWidth(): [
  (node: HTMLElement | null) => void,
  number,
] {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  // Sync read on mount to avoid a frame at width=0
  useLayoutEffect(() => {
    if (nodeRef.current) {
      setWidth(nodeRef.current.clientWidth);
    }
  }, []);

  const refCallback = useCallback((node: HTMLElement | null) => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    nodeRef.current = node;

    if (!node) return;

    // Read initial width synchronously
    setWidth(node.clientWidth);

    // Watch for resize
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            const boxSize = Array.isArray(entry.contentBoxSize)
              ? entry.contentBoxSize[0]
              : entry.contentBoxSize;
            setWidth(boxSize.inlineSize);
          } else {
            setWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  return [refCallback, width];
}
