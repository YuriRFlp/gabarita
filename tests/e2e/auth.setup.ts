import { expect, test as setup } from '@playwright/test';
import { createTestUser, readLocalSupabase } from '../../scripts/create-test-user.ts';
import { TEST_USER } from './data/test-user.ts';
import { SESSION_FILE } from './support/session.ts';
import { HomePage } from './pages/HomePage.ts';
import { LoginPage } from './pages/LoginPage.ts';

setup('creates the test user and saves its session', async ({ page }) => {
  const { url, secretKey } = readLocalSupabase();
  await createTestUser(url, secretKey);

  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(TEST_USER.email, TEST_USER.password);
  await expect(new HomePage(page).heading).toBeVisible();

  await page.context().storageState({ path: SESSION_FILE });
});
