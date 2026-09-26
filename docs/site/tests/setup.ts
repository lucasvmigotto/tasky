import '@testing-library/jest-dom/vitest'
import { expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import 'vitest-axe/extend-expect'

expect.extend(matchers)

// jsdom lacks matchMedia, used by nothing critical but harmless to stub.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// axe probes canvas for icon ligatures; jsdom has no canvas. Null is enough.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof HTMLCanvasElement.prototype.getContext
}
