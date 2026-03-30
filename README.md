# @shipitandpray/pretext-truncate

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://shipitandpray.github.io/pretext-truncate/) [![npm](https://img.shields.io/npm/v/@shipitandpray/pretext-truncate?color=blue)](https://www.npmjs.com/package/@shipitandpray/pretext-truncate)

[![npm version](https://img.shields.io/npm/v/@shipitandpray/pretext-truncate.svg)](https://www.npmjs.com/package/@shipitandpray/pretext-truncate)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@shipitandpray/pretext-truncate)](https://bundlephobia.com/package/@shipitandpray/pretext-truncate)
[![license](https://img.shields.io/npm/l/@shipitandpray/pretext-truncate.svg)](https://github.com/ShipItAndPray/pretext-truncate/blob/main/LICENSE)

**Multiline text truncation ("Show More") without flash of full content.**

## The Problem

Every existing React truncation library uses the same broken approach:

1. Render the **full text** into the DOM
2. Measure it
3. Truncate it

This causes a visible **flash of content (FOC)** where the user sees the full text for 1-2 frames before it collapses. On slow devices or long text, this flash is jarring and unprofessional.

**pretext-truncate fixes this.** It uses [@chenglou/pretext](https://github.com/chenglou/pretext) to compute line breaks from font metrics alone, finding the exact truncation point in pure JS. The truncated text is available on first paint. Zero flash, zero reflow.

## Install

```bash
npm install @shipitandpray/pretext-truncate @chenglou/pretext react react-dom
```

## Quick Start

```tsx
import { Truncate } from "@shipitandpray/pretext-truncate";

<Truncate
  text="Your long text here..."
  lines={3}
  expandLabel="Show more"
  collapseLabel="Show less"
/>
```

## API

### `<Truncate />` Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | *required* | Text to truncate |
| `lines` | `number` | `3` | Max visible lines before truncation |
| `ellipsis` | `string \| ReactNode` | `"..."` | Truncation indicator |
| `expandLabel` | `string \| ReactNode` | `undefined` | "Show more" button label |
| `collapseLabel` | `string \| ReactNode` | `undefined` | "Show less" button label |
| `expanded` | `boolean` | `undefined` | Controlled expand state |
| `defaultExpanded` | `boolean` | `false` | Initial expand state (uncontrolled) |
| `onExpandChange` | `(expanded: boolean) => void` | `undefined` | Callback on toggle |
| `className` | `string` | `undefined` | Wrapper CSS class |
| `textClassName` | `string` | `undefined` | Text span CSS class |
| `buttonClassName` | `string` | `undefined` | Toggle button CSS class |
| `as` | `ElementType` | `"div"` | Wrapper element type |
| `trimWhitespace` | `boolean` | `true` | Trim trailing whitespace at truncation |
| `breakOnWord` | `boolean` | `true` | Break at word boundary |
| `font` | `string` | *auto-detected* | Font shorthand for measurement |
| `lineHeight` | `number` | *auto-detected* | Line height in px |

### `useTruncation()` Hook

For custom UI when you need direct access to truncation data:

```tsx
import { useTruncation } from "@shipitandpray/pretext-truncate";

const { truncatedText, isTruncated, totalLines } = useTruncation(text, {
  lines: 3,
  containerWidth: 400,
  font: "16px Inter, sans-serif",
  breakOnWord: true,
  ellipsis: "...",
});
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `truncatedText` | `string` | Text up to line N |
| `isTruncated` | `boolean` | Whether text was actually truncated |
| `visibleCharCount` | `number` | Characters visible before ellipsis |
| `totalLines` | `number` | Total lines if fully rendered |
| `truncationIndex` | `number` | Character index where truncation occurs |

### `useContainerWidth()` Hook

ResizeObserver-based width tracking:

```tsx
import { useContainerWidth } from "@shipitandpray/pretext-truncate";

const [ref, width] = useContainerWidth();
return <div ref={ref}>Width: {width}px</div>;
```

### `findTruncationPoint()` / `computeLineBreaks()`

Pure functions for framework-agnostic usage:

```ts
import { findTruncationPoint, computeLineBreaks } from "@shipitandpray/pretext-truncate";

const lines = computeLineBreaks(text, 400, { font: "16px sans-serif" });
const point = findTruncationPoint(text, 3, 400, { font: "16px sans-serif" }, 30);
```

## Comparison

| Feature | pretext-truncate | react-truncate | react-lines-ellipsis | CSS line-clamp |
|---------|:---:|:---:|:---:|:---:|
| Zero flash of content | Yes | No | No | Yes |
| "Show more" button | Yes | Manual | Yes | No |
| Programmatic truncation index | Yes | No | No | No |
| Word boundary breaking | Yes | Yes | Yes | No |
| Custom ellipsis | Yes | Yes | Yes | No |
| No DOM measurement | Yes | No | No | Yes |
| Server-side rendering | Yes | No | No | Yes |
| Resize responsive | Yes | Yes | Yes | Yes |
| Bundle size (gzipped) | ~1.5KB* | ~3KB | ~4KB | 0 |

*\* Excludes @chenglou/pretext peer dependency*

### Why not CSS `-webkit-line-clamp`?

CSS `line-clamp` works for pure visual truncation but has no "show more" button, no programmatic access to the truncation point, no word-boundary control, and no callback when text is truncated. If you just need visual ellipsis without interactivity, `line-clamp` is fine. For everything else, use this.

## How It Works

1. **Font metrics**: `@chenglou/pretext` computes character widths from font metrics alone (no canvas, no DOM)
2. **Line breaks**: `computeLineBreaks()` determines where each visual line wraps, matching browser behavior
3. **Truncation point**: `findTruncationPoint()` finds the exact character index on line N that leaves room for the ellipsis
4. **Synchronous render**: `useTruncation()` runs in `useMemo` during render, so truncated text is ready on first paint
5. **Width tracking**: `useContainerWidth()` uses `ResizeObserver` + `useLayoutEffect` for responsive updates

## Build

```bash
npm run build    # ESM + CJS + types
npm run test     # vitest
npm run check    # TypeScript type check
```

## License

MIT
