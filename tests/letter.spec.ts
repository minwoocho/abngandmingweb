import { test, expect } from '@playwright/test';

declare global {
  interface Window { letterAudio: { contexts: AudioContext[]; starts: number[]; analysers: AnalyserNode[] } }
}

test.beforeEach(async ({ page }) => {
  // Observe real browser audio objects; no replacement for synthesis or playback.
  await page.addInitScript(() => {
    window.letterAudio = { contexts: [], starts: [], analysers: [] };
    const connect = AudioNode.prototype.connect;
    // Tap the real output in parallel, so a silent/disconnected graph fails too.
    AudioNode.prototype.connect = new Proxy(connect, {
      apply(target, node: AudioNode, args) {
        if (args[0] === node.context.destination) {
          const index = window.letterAudio.contexts.indexOf(node.context as AudioContext);
          const analyser = window.letterAudio.analysers[index];
          if (analyser) Reflect.apply(target, node, [analyser]);
        }
        return Reflect.apply(target, node, args);
      },
    });
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.letterAudio.contexts.push(this);
        window.letterAudio.analysers.push(this.createAnalyser());
      }
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when = 0) => {
          window.letterAudio.starts.push(performance.now() + (when - this.currentTime) * 1000);
          start(when);
        };
        return oscillator;
      }
    };
  });
  await page.goto('./');
});

test('letter waits for reveal, plays music, mutes and releases audio when closed', async ({ page }) => {
  const openedAt = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name: '생일 편지 열기' }).click();
  const mute = page.getByRole('button', { name: '음악 끄기', exact: true });
  await expect(mute).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.letterAudio.starts.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.letterAudio.starts[0]) - openedAt).toBeGreaterThan(1200);
  await expect.poll(() => page.evaluate(() => window.letterAudio.contexts.at(-1)?.state)).toBe('running');
  await expect.poll(() => page.evaluate(() => {
    const analyser = window.letterAudio.analysers.at(-1)!;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  })).toBeGreaterThan(.001);
  await mute.click();
  await expect.poll(() => page.evaluate(() => window.letterAudio.contexts.at(-1)?.state)).toBe('suspended');
  await page.getByRole('button', { name: '음악 켜기', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.letterAudio.contexts.at(-1)?.state)).toBe('running');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.letterAudio.contexts.every(c => c.state === 'closed'))).toBe(true);
  await page.getByRole('button', { name: '생일 편지 열기' }).click();
  await expect(mute).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.letterAudio.contexts.every(c => c.state === 'closed'))).toBe(true);
});

test('backgrounding stops music without auto-restarting it on return', async ({ page }) => {
  await page.getByRole('button', { name: '생일 편지 열기' }).click();
  await expect(page.getByRole('button', { name: '음악 끄기', exact: true })).toBeVisible();
  // WebKit automation does not background pages reliably; dispatch the page lifecycle event.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect.poll(() => page.evaluate(() => window.letterAudio.contexts.at(-1)?.state)).toBe('suspended');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await expect(page.getByRole('button', { name: '음악 켜기', exact: true })).toBeVisible();
});

test('handwritten letter remains readable and closable at the end on small screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '생일 편지 열기' }).click();
  await expect(page.locator('.letter-body')).toContainText('한나야, 어느덧 우리가 두 번째 생일');
  await expect(page.getByRole('dialog').locator('input, textarea, [contenteditable=true]')).toHaveCount(0);
  expect(await page.evaluate(async () => (await document.fonts.load('24px "Nanum Pen Script"', '한나')).length)).toBeGreaterThan(0);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.letter-signature').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: '닫기', exact: true })).toBeInViewport();
    expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.locator('.letter-paper h2').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/letter-${test.info().project.name}.png` });
});
