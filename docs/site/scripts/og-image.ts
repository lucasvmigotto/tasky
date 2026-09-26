import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
/**
 * Renders the Open Graph image (1200×630) to public/og-image.png, the exact
 * filename the site's index.html advertises.
 *
 *   bun run og
 */
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '..', 'public')
const TAGLINE = process.env.OG_TAGLINE || 'Trabalho, projetos e horas para equipes internas'
const TITLE = process.env.OG_TITLE || 'Documentação'

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    font-family: Inter, system-ui, sans-serif;
    background: radial-gradient(1200px 630px at 80% -10%, #2e1065 0%, #09090b 55%);
    color: #fafafa; display: flex; align-items: center; gap: 56px; padding: 72px;
  }
  .ring {
    width: 168px; height: 168px; border-radius: 40px; flex: none;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 24px 80px rgba(124, 58, 237, .45);
  }
  .ring svg { width: 96px; height: 96px; }
  .brand { font-size: 116px; font-weight: 800; letter-spacing: -3px; line-height: 1; }
  .brand .y { color: #a78bfa; }
  .title { margin-top: 22px; font-size: 40px; font-weight: 600; color: #e4e4e7; }
  .tagline { margin-top: 18px; font-size: 28px; color: #a1a1aa; max-width: 780px; }
  .rule { margin-top: 40px; width: 120px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #8b5cf6, #22d3ee); }
</style></head>
<body>
  <div class="ring" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="#fff" stroke-width="2.4" />
      <path d="M16 9.5v7l4.6 2.9" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
  <div>
    <div class="brand">Task<span class="y">Y</span></div>
    <div class="title">${TITLE}</div>
    <div class="tagline">${TAGLINE}</div>
    <div class="rule"></div>
  </div>
</body></html>`

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  const out = resolve(OUT_DIR, 'og-image.png')
  await page.screenshot({ path: out })
  await browser.close()
  console.log(`og image: ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
