import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createPreviewServer } from './serve.mjs';

test('mobile layout, hearts, letter, home-only toggle and default album', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: '밍꿍이 하트 뿅뿅' }).click();
  await expect(page.locator('.heart-burst i')).toHaveCount(12);
  await page.getByRole('button', { name: '생일 편지 열기' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.letter-paper p')).not.toHaveText('');
  await expect(page.getByRole('dialog').locator('textarea, input')).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '움직이는 캐릭터 끄기' }).click();
  await expect(page.locator('.roamers')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: '움직이는 캐릭터 켜기' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: '앨범' }).click();
  await expect(page.locator('.photo-card')).toHaveCount(9);
  await expect(page.getByRole('button', { name: '움직이는 캐릭터 켜기' })).toBeHidden();
  for (const img of await page.locator('.photo-card img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ['홈', '룰렛', '촛불', '소원권', '앨범']) {
      await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('navigation').getByRole('button', { name: '홈', exact: true }).click();
  await page.screenshot({ path: `test-results/home-iphone-${test.info().project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('all-in blank persists zero; carry-only spin recovers; wish and cake work', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .35; });
  await page.goto('./#roulette');
  await page.getByLabel('보유 꿍찰권 직접 입력').fill('4');
  await page.getByRole('button', { name: '적용', exact: true }).click();
  await expect(page.getByTestId('balance')).toHaveText('4');
  await page.getByRole('button', { name: '전부', exact: true }).click();
  await page.getByRole('button', { name: '4장으로 돌리기' }).click();
  await expect(page.locator('.result')).toContainText('꽝', { timeout: 6000 });
  await page.reload();
  await expect(page.getByTestId('balance')).toHaveText('0');
  await expect(page.getByRole('button', { name: '0장으로 돌리기' })).toBeDisabled();
  await page.getByLabel('보유 꿍찰권 직접 입력').fill('4');
  await page.getByRole('button', { name: '적용', exact: true }).click();
  await expect(page.getByTestId('balance')).toHaveText('4');
  await page.getByRole('button', { name: '전부', exact: true }).click();
  await page.evaluate(() => { Math.random = () => .95; });
  await page.getByRole('button', { name: '4장으로 돌리기' }).click();
  await expect(page.locator('.result')).toContainText('이월', { timeout: 6000 });
  await page.evaluate(() => { Math.random = () => .01; });
  await page.getByRole('button', { name: '4장으로 돌리기' }).click();
  await expect(page.getByTestId('balance')).toHaveText('8', { timeout: 6000 });
  await page.getByRole('navigation').getByRole('button', { name: '소원권', exact: true }).click();
  await page.getByRole('button', { name: '1번 소원권 사용', exact: true }).click();
  await expect(page.getByRole('button', { name: '1번 소원권 사용 취소' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '1번 소원권 사용 취소' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: '촛불', exact: true }).click();
  await page.getByRole('button', { name: '대신 터치로 후—!' }).click();
  await expect(page.getByRole('button', { name: '촛불 다시 켜기' })).toBeVisible();
});

test('photo upload, caption, backup roundtrip and deletion', async ({ page }) => {
  await page.goto('./#album');
  await expect(page.locator('.photo-card')).toHaveCount(9);
  await page.locator('input[type=file][multiple]').setInputFiles('public/photos/default-03.jpg');
  await expect(page.locator('.photo-card')).toHaveCount(10);
  await page.locator('.photo-card').first().click();
  await page.getByLabel('이 순간의 이야기').fill('우리의 새 추억 ♥');
  await page.getByRole('button', { name: '메모 저장' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.photo-card').first()).toContainText('우리의 새 추억 ♥');
  await page.getByRole('navigation').getByRole('button', { name: '홈', exact: true }).click();
  await page.getByRole('button', { name: '홈 화면에 추가 · 보관함' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '백업 파일 저장' }).click();
  const downloaded = await downloadPromise;
  const path = await downloaded.path();
  const backup = JSON.parse(await readFile(path!, 'utf8'));
  expect(backup.photos).toHaveLength(10);
  expect(backup.photos[0].image).toMatch(/^data:image\/jpeg;base64,/);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: '앨범', exact: true }).click();
  await page.locator('.photo-card').first().click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '사진 삭제' }).click();
  await expect(page.locator('.photo-card')).toHaveCount(9);
  await page.getByRole('navigation').getByRole('button', { name: '홈', exact: true }).click();
  await page.getByRole('button', { name: '홈 화면에 추가 · 보관함' }).click();
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(path!);
  await expect(page.locator('.backup [role=status]')).toContainText('복원했어요');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: '앨범', exact: true }).click();
  await expect(page.locator('.photo-card')).toHaveCount(10);
  await expect(page.locator('.photo-card').first()).toContainText('우리의 새 추억 ♥');
});

test('installed cache supports offline reload on repository subpath', async ({ page }) => {
  // Stop a dedicated origin instead of browser offline emulation, which also
  // blocks service-worker responses in some Playwright WebKit builds.
  const server = createPreviewServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  try {
    await page.goto(`http://127.0.0.1:${address.port}/abngandmingweb/`);
    await page.getByRole('button', { name: '홈 화면에 추가 · 보관함' }).click();
    await expect(page.locator('.install-guide')).toContainText('오프라인 준비 완료', { timeout: 15000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(await page.evaluate(async () => { try { await fetch('./uncached-offline-probe'); return false; } catch { return true; } })).toBe(true);
    await page.reload();
    await page.getByRole('navigation').getByRole('button', { name: '앨범', exact: true }).click();
    await expect(page.locator('.photo-card')).toHaveCount(9);
    await expect.poll(() => page.locator('.photo-card img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  } finally { if (server.listening) { server.closeAllConnections(); server.close(); } }
});
