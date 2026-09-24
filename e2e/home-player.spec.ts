import { expect, test } from '@playwright/test';

test('home shows the mix and recent listening, and Play opens the player', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Ana Ruiz/ }).click();

  await expect(page.getByRole('heading', { name: /^Good (morning|afternoon|evening), Ana$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open mix' })).toBeVisible();
  await expect(page.getByTestId('recent-tile')).toHaveCount(6);

  await page.getByRole('link', { name: 'Open mix' }).click();
  await expect(page.getByTestId('mix-item')).toHaveCount(3);
  const firstTitle = (await page.getByTestId('mix-item').first().getByTestId('track-title').textContent())!.trim();

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const mini = page.getByTestId('mini-player');
  await expect(mini).toContainText(firstTitle);

  await mini.getByRole('button', { name: /Open now playing/ }).click();
  const nowPlaying = page.getByTestId('now-playing');
  await expect(nowPlaying).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('now-playing-title')).toHaveText(firstTitle);
});
