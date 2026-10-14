const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:8000');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="age"]', '28');
  await page.fill('input[name="height"]', '170');
  await page.fill('input[name="weight"]', '65');
  await page.fill('input[name="email"]', 'test.user@example.com');
  await page.fill('input[name="phone"]', '+1 555 123 4567');
  await page.fill('input[name="password"]', 'Password123!');
  await page.fill('input[name="confirmPassword"]', 'Password123!');
  await page.click('#signup-form button[type="submit"]');
  await page.waitForTimeout(500);

  const appVisible = await page.locator('#app-shell').isVisible();
  console.log('after-signup-visible=' + appVisible);

  await page.reload();

  const authVisible = await page.locator('#auth-screen').isVisible();
  const appVisibleAfterReload = await page.locator('#app-shell').isVisible();
  console.log('after-reload-auth-visible=' + authVisible);
  console.log('after-reload-app-visible=' + appVisibleAfterReload);

  await browser.close();
})();
