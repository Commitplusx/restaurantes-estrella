import { prioritizeRestaurantBrands } from '../src/lib/restaurantPriority.ts';
import { oneRestaurantPerBrand, type CatalogRestaurant } from '../src/lib/catalogRequest.ts';

const makitan = '010c7fdd-1c8a-4392-92d1-9a9f9e33c0a0';
const robins = 'fa1b9bc1-eefd-489d-8ae4-fd3682efe4dd';
const itaes = '2ae5eee1-132e-4609-926f-da35aa7553ba';
const other = '11111111-1111-4111-8111-111111111111';
const another = '22222222-2222-4222-8222-222222222222';
function restaurant(id: string, matriz_id: string | null = null): CatalogRestaurant {
  return { id, matriz_id, nombre: 'Restaurante', telefono: '', activo: true, perfil_completo: true };
}
function equal(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

Deno.test('Makitán and Robin’s precede other eligible restaurants regardless of incoming order', () => {
  const rows = [restaurant(other), restaurant(robins), restaurant(another), restaurant(makitan)];
  equal(prioritizeRestaurantBrands(rows).map(row => row.id), [makitan, robins, other, another]);
  equal(prioritizeRestaurantBrands([...rows].reverse()).map(row => row.id), [makitan, robins, another, other]);
});

Deno.test('a Robin’s branch inherits priority even when the principal location is absent or renamed', () => {
  const branch = { ...restaurant(itaes, robins), nombre: 'Nombre nuevo' };
  equal(prioritizeRestaurantBrands([restaurant(other), branch, restaurant(makitan)]).map(row => row.id), [makitan, itaes, other]);
});

Deno.test('a matching name does not promote an unrelated restaurant', () => {
  const namesake = { ...restaurant(other), nombre: 'MAKITAN Pollo Robins' };
  equal(prioritizeRestaurantBrands([restaurant(another), namesake]).map(row => row.id), [another, other]);
});

Deno.test('priority retains existing branch choice and the open/distance order of other restaurants', () => {
  // Upstream availability/distance ranking already chose Itaes before Belisario.
  const rows = [restaurant(other), restaurant(itaes, robins), restaurant(another), restaurant(robins), restaurant(makitan)];
  equal(prioritizeRestaurantBrands(oneRestaurantPerBrand(rows)).map(row => row.id), [makitan, itaes, other, another]);
});

Deno.test('filtered lists stay filtered; missing preferred brands are never inserted', () => {
  equal(prioritizeRestaurantBrands([restaurant(other)]).map(row => row.id), [other]);
  equal(prioritizeRestaurantBrands([]), []);
});

Deno.test('ranking never mutates cached order or restaurant availability, names and coordinates', () => {
  const closed = Object.freeze({ ...restaurant(robins), nombre: 'Pollo Robins', hora_apertura: '09:00', lat: 16.25, lng: -92.13 });
  const first = Object.freeze(restaurant(other));
  const input = Object.freeze([first, closed]);
  const output = prioritizeRestaurantBrands(input);
  equal(input.map(row => row.id), [other, robins]);
  if (output[0] !== closed || output[1] !== first) throw new Error('Ranking must preserve restaurant objects');
});
