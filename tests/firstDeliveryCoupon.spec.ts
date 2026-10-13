import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const restaurant = 'fa1b9bc1-eefd-489d-8ae4-fd3682efe4dd';
async function seed(page: Page, shipping: number, phone = '0000000070') {
  await page.addInitScript(({ phone }) => {
    localStorage.setItem('cookies_accepted', 'true');
    localStorage.setItem('estrella-cart-storage', JSON.stringify({ version: 0, state: {
      carrito: [{ cantidad: 1, item: { id: '32000000-0000-4000-8000-000000000001', cartItemId: 'fixture', nombre: 'Pollo de prueba', precio: 100, tipo: 'item', aplica_subsidio: false } }],
      checkoutStep: 1, tipoEntrega: 'domicilio', direccionEntrega: 'Dirección de prueba', clienteNombre: 'QA NO PREPARAR', clienteTel: phone, metodoPago: 'efectivo',
    } }));
    sessionStorage.setItem('est_ubicacion', JSON.stringify({ lat: 16.2, lng: -92.1 }));
  }, { phone });
  await page.route('**/rest/v1/**', async route => {
    const url = route.request().url();
    await route.fulfill({ json: url.includes('/restaurantes?') ? { id: restaurant, nombre: 'Pollo Robin’s', activo: true, lat: 16.2, lng: -92.1 }
      : url.includes('/h3_zonas?') ? { precio: shipping, nombre: 'QA' } : [] });
  });
}
async function openCoupon(page: Page) {
  await page.goto('/menu/pollo-robin-s-1353/carrito');
  await page.getByText('¿Tienes un cupón?', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Código de cupón' }).fill('Estrella');
}
function action(body: unknown): string { return body && typeof body === 'object' && 'action' in body ? String(body.action) : ''; }
async function preview(page: Page, options: { reject?: boolean; fail?: () => boolean } = {}) {
  await page.route('**/functions/v1/auth-otp', async route => {
    const kind = action(route.request().postDataJSON());
    if (kind === 'checkout-benefit-preview') await route.fulfill({ json: { ok: true, registered: false } });
    else if (kind !== 'checkout-coupon-preview') throw new Error('Test must never send OTP or create an order');
    else if (options.fail?.()) await route.abort('failed');
    else if (options.reject) await route.fulfill({ status: 400, json: { error: 'Esta promoción es para tu primer pedido a domicilio.' } });
    else await route.fulfill({ json: { ok: true, max_shipping_discount: 50 } });
  });
}
for (const shipping of [35, 70]) test('shipping ' + shipping + ' is discounted without reducing food prices', async ({ page }) => {
  await seed(page, shipping); await preview(page); await openCoupon(page);
  await expect(page.getByRole('status')).toContainText('Estrella aplicado');
  if (test.info().project.name === 'desktop') {
    const summary = page.getByRole('complementary', { name: 'Resumen de tu pedido' });
    await expect(summary).toContainText('−$' + Math.min(shipping, 50).toFixed(2));
    await expect(summary.locator('.checkout-grand-total')).toContainText('$' + (100 + Math.max(0, shipping - 50)).toFixed(2));
  }
  await expect(page.locator('body')).toContainText('Pollo de prueba');
  await expect(page.getByRole('button', { name: 'Aplicado', exact: true })).toBeVisible();
  const expectedTotal = '$' + (100 + Math.max(0, shipping - 50)).toFixed(2);
  if (test.info().project.name === 'mobile') await expect(page.locator('.checkout-mobile-bar')).toContainText(expectedTotal);
  await page.getByRole('status').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (shipping === 70) await page.screenshot({ path: 'test-results/coupon-' + test.info().project.name + '.png', fullPage: true });
});
test('missing phone leaves the code pending without an API request', async ({ page }) => {
  await seed(page, 70, '');
  let calls = 0;
  await page.route('**/functions/v1/auth-otp', async route => { calls++; await route.fulfill({ status: 500, json: { error: 'Unexpected request' } }); });
  await openCoupon(page);
  await expect(page.getByRole('status')).toContainText('Completa tu WhatsApp');
  await expect(page.getByRole('button', { name: 'Aplicado', exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});
test('server rejection preserves products and advertises no savings', async ({ page }) => {
  await seed(page, 70); await preview(page, { reject: true }); await openCoupon(page);
  await expect(page.getByRole('status')).toContainText('primer pedido a domicilio');
  await expect(page.getByRole('button', { name: 'Aplicado', exact: true })).toHaveCount(0);
  await expect(page.locator('body')).toContainText('Pollo de prueba');
});
test('a network failure is visible and retry can recover', async ({ page }) => {
  await seed(page, 70); let fail = true;
  await preview(page, { fail: () => fail }); await openCoupon(page);
  await expect(page.getByRole('status')).toContainText('No pudimos comprobar');
  fail = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Estrella aplicado');
});
