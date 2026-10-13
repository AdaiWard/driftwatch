import { chromium, firefox, webkit, type Browser } from 'playwright';
import type { CaptureSpec } from '@driftwatch/core';

const launchers = { chromium, firefox, webkit } as const;

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

/**
 * Deterministic capture:
 *  - fixed timezone/locale/deviceScaleFactor
 *  - reducedMotion + screenshot-level `animations: "disabled"`
 *  - networkidle, then wait for webfonts, then optional settle delay
 *  - random regions (dates, avatars) covered via CSS selectors (Playwright mask)
 */
export async function capturePage(capture: CaptureSpec): Promise<Buffer> {
  const browserName = capture.browser ?? 'chromium';
  const viewport = capture.viewport ?? DEFAULT_VIEWPORT;

  const browser: Browser = await launchers[browserName].launch();
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      timezoneId: 'UTC',
      locale: 'en-US',
    });

    const page = await context.newPage();
    await page.goto(capture.url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    if ((capture.delayMs ?? 0) > 0) {
      await new Promise((resolve) => setTimeout(resolve, capture.delayMs));
    }

    const mask = (capture.maskSelectors ?? []).map((selector) => page.locator(selector));
    return await page.screenshot({
      fullPage: capture.fullPage ?? false,
      animations: 'disabled',
      ...(mask.length > 0 ? { mask } : {}),
    });
  } finally {
    await browser.close();
  }
}