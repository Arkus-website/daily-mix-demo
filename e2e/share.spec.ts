import { expect, test } from '@playwright/test';

test('a listener shares their mix and a friend opens it without signing in', async ({ page, context, browser }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Ana Ruiz/ }).click();
  await page.getByRole('link', { name: 'Open mix' }).click();
  await expect(page.getByTestId('mix-item')).toHaveCount(3);
  const title = (await page.getByRole('heading').first().textContent())!.trim();

  // Grant clipboard permissions so the Share button's fallback copy path can be exercised.
  await context.grantPermissions(['clipboard-write', 'clipboard-read']);
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toMatch(/\/share\/.+/);

  // A friend, in a browser context with no cookies at all, opens the link.
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(shareUrl);
  await expect(guestPage.getByRole('heading', { name: title })).toBeVisible();
  await expect(guestPage.getByTestId('mix-item')).toHaveCount(3);
  // No sign-in prompt, and no app navigation chrome meant for a signed-in listener.
  await expect(guestPage).toHaveURL(shareUrl);
  await expect(guestPage.getByRole('link', { name: 'Home' })).toHaveCount(0);
  // The mix still plays.
  await guestPage.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(guestPage.getByTestId('mini-player')).toContainText(
    (await guestPage.getByTestId('mix-item').first().getByTestId('track-title').textContent())!.trim(),
  );

  await guest.close();
});
