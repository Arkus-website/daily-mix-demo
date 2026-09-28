import { expect, test } from '@playwright/test';

test('a listener shares their mix, a friend opens it with no account, and the owner can revoke it', async ({ page, context, request }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Ana Ruiz/ }).click();
  await page.getByRole('link', { name: 'Open mix' }).click();
  await expect(page.getByTestId('mix-item')).toHaveCount(3);

  const titles = (await page.getByTestId('track-title').allTextContents()).map((t) => t.trim());
  expect(titles).toHaveLength(3);

  await page.getByRole('button', { name: 'Share' }).click();
  const shareLink = (await page.getByTestId('share-link').textContent())!.trim();
  expect(shareLink).toMatch(/\/share\/[\w-]+$/);

  // A raw, cookie-less fetch never carries anything beyond the public allowlist.
  const rawHtml = await (await request.get(shareLink)).text();
  for (const forbidden of ['playIds', 'evidence', 'signals', 'computedFrom', 'userId', 'email', '"plan"', 'reason', 'Why we built this', 'late-night']) {
    expect(rawHtml).not.toContain(forbidden);
  }

  // A friend with a fresh browser (no cookies at all) opens the link.
  const guest = await context.browser()!.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(shareLink);
  await expect(guestPage.getByRole('heading', { name: /Ana's Daily Mix/ })).toBeVisible();
  await expect(guestPage.getByTestId('mix-item')).toHaveCount(3);
  await expect
    .poll(async () => (await guestPage.getByTestId('track-title').allTextContents()).map((t) => t.trim()))
    .toEqual(titles);

  await guestPage.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(guestPage.getByTestId('mini-player')).toBeVisible();
  await guest.close();

  // The owner revokes the link; it's gone for everyone else.
  await page.getByRole('button', { name: 'Stop sharing' }).click();
  expect((await request.get(shareLink)).status()).toBe(404);
});
