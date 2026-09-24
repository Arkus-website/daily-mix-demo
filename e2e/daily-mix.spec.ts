import { expect, test } from '@playwright/test';

test('a listener shares their mix, and a friend opens it with no account', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Ben Okafor/ }).click();
  await page.getByRole('link', { name: 'Open mix' }).click();

  await page.getByRole('button', { name: 'Share' }).click();
  const shareUrl = await page.getByTestId('share-url').inputValue();
  expect(shareUrl).toMatch(/\/share\/[\w-]+$/);

  // A friend with no session at all.
  const friendContext = await browser.newContext();
  const friendPage = await friendContext.newPage();
  await friendPage.goto(shareUrl);

  await expect(friendPage.getByRole('heading', { name: /\w+day, \w+ \d+/ })).toBeVisible();
  await expect(friendPage.getByTestId('mix-item')).toHaveCount(3);
  await expect(friendPage.getByRole('button', { name: /^(Save|Saved)$/ })).toHaveCount(0);
  await expect(friendPage.getByRole('button', { name: 'Share' })).toHaveCount(0);

  await friendContext.close();
});

test('a listener signs in, opens the mix, and saves it', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('button', { name: /Ana Ruiz/ }).click();
  await expect(page.getByRole('heading', { name: /Your Daily Mix for/ })).toBeVisible();

  await page.getByRole('link', { name: 'Open mix' }).click();
  const items = page.getByTestId('mix-item');
  await expect(items).toHaveCount(3);
  for (const reason of await page.getByTestId('reason').all()) {
    await expect(reason).toHaveText(/\S+/);
  }

  const saveButton = page.getByRole('button', { name: /^(Save|Saved)$/ });
  const before = (await saveButton.textContent())?.trim();
  const after = before === 'Saved' ? 'Save' : 'Saved';
  await saveButton.click();
  await expect(saveButton).toHaveText(after);

  await page.reload();
  await expect(page.getByRole('button', { name: /^(Save|Saved)$/ })).toHaveText(after);
});
