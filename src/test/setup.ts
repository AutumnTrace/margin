import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom has no layout. CodeMirror measures text ranges after scrolling, so give it empty rects.
const emptyRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
Range.prototype.getClientRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList
Range.prototype.getBoundingClientRect = emptyRect
