import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTIONS,
  allItems,
  buildOrderText,
  buildSmsUrl,
  formatCents,
  isOpenAt,
  lineUnitCents,
  priceColumn,
  pricedSubtotalCents,
} from './order.js';

const ALLOWED_CENTS = new Set([1050, 1150, 1065, 1095, 1195, 900, 1350, 1275, 1800, 2000, 1175, 250, 400, 175, 600, 225]);

test('prices match the posted menu and beans are not a side', () => {
  const items = allItems();
  const names = items.map((item) => item.name);
  assert.equal(names.filter((name) => /bean/i.test(name)).join('|'), 'Egg, Cheese, Beans, Potato');
  assert.equal(items.some((item) => item.name.toLowerCase() === 'beans'), false);
  for (const item of items) {
    if (item.cents != null) assert.ok(ALLOWED_CENTS.has(item.cents), item.name);
    for (const group of item.options || []) {
      for (const choice of group.choices) {
        if (choice.cents != null) assert.ok(ALLOWED_CENTS.has(choice.cents), choice.label);
      }
    }
    if (/bean/i.test(item.detail || '')) assert.fail(item.id);
  }
  const blob = JSON.stringify(SECTIONS);
  assert.equal(/\b(13\.75|2\.75|1\.25)\b/.test(blob), false);
});

test('bbq chicken and pork are inquire with no dollar amount', () => {
  const box = allItems().find((item) => item.num === '8');
  const column = priceColumn(box);
  assert.deepEqual(column, ['Brisket: $12.75', 'Chicken: inquire', 'Pork: inquire']);
  assert.equal(lineUnitCents(box, { meat: 'chicken' }), null);
  assert.equal(lineUnitCents(box, { meat: 'pork' }), null);
  assert.equal(lineUnitCents(box, { meat: 'brisket' }), 1275);
  const text = buildOrderText({
    name: 'Ada',
    phone: '5055550100',
    diets: ['gluten free'],
    notes: 'no onion',
    lines: [
      { qty: 1, title: '#1 Egg, Cheese, Beans, Potato', optionText: 'Green chili', unitCents: 1050 },
      { qty: 1, title: '#8 BBQ Sandwich Lunch Box', optionText: 'Chicken', unitCents: null },
      { qty: 2, title: 'Potato Salad', optionText: '', unitCents: 250 },
    ],
  });
  const chicken = text.split('\n').find((line) => line.includes('Chicken'));
  assert.match(chicken, /inquire/);
  assert.equal(chicken.includes('$'), false);
  assert.match(text, /Priced subtotal: \$15\.50/);
  assert.match(text, /Tax not included/);
  assert.match(text, /Diets: gluten free/);
  assert.equal(pricedSubtotalCents([
    { unitCents: null, qty: 3 },
    { unitCents: 1065, qty: 2 },
  ]), 2130);
  assert.equal(formatCents(2130), '$21.30');
});

test('sms link round-trips the order body', () => {
  const body = "Ola's order\nName: Ada\nPhone: 5055550100\n\n1 x #8 BBQ Sandwich Lunch Box (Pork) — inquire\n\nPriced subtotal: $0.00\nTax not included.\nInquire items have no price and are not in the subtotal.";
  const url = buildSmsUrl(body);
  assert.equal(url.startsWith('sms:+15052887576?&body='), true);
  const decoded = decodeURIComponent(url.slice(url.indexOf('body=') + 5));
  assert.equal(decoded, body);
  assert.equal(decoded.includes('$12'), false);
  assert.match(decoded, /Pork\) — inquire/);
});

test('hours gate is America/Denver, Wed–Sat 8:00 until 1:00', () => {
  // MDT (UTC-6) on Saturday 3 Oct 2026
  assert.equal(isOpenAt(new Date('2026-10-03T13:59:00Z')), false); // 7:59 AM
  assert.equal(isOpenAt(new Date('2026-10-03T14:00:00Z')), true);  // 8:00 AM
  assert.equal(isOpenAt(new Date('2026-10-03T18:59:00Z')), true);  // 12:59 PM
  assert.equal(isOpenAt(new Date('2026-10-03T19:00:00Z')), false); // 1:00 PM
  assert.equal(isOpenAt(new Date('2026-10-04T16:00:00Z')), false); // Sunday
  assert.equal(isOpenAt(new Date('2026-10-06T16:00:00Z')), false); // Tuesday
  assert.equal(isOpenAt(new Date('2026-10-07T14:00:00Z')), true);  // Wednesday 8:00 AM MDT
  assert.equal(isOpenAt(new Date('2026-10-09T18:59:00Z')), true);  // Friday 12:59 PM
  assert.equal(isOpenAt(new Date('2026-10-09T19:00:00Z')), false); // Friday 1:00 PM
  // MST (UTC-7) Wednesday 7 Jan 2026
  assert.equal(isOpenAt(new Date('2026-01-07T14:59:00Z')), false); // 7:59 AM
  assert.equal(isOpenAt(new Date('2026-01-07T15:00:00Z')), true);  // 8:00 AM
  assert.equal(isOpenAt(new Date('2026-01-07T19:59:00Z')), true);  // 12:59 PM
  assert.equal(isOpenAt(new Date('2026-01-07T20:00:00Z')), false); // 1:00 PM
});
