const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code, {exports, require: name => extra[name] || require(name), Buffer, URLSearchParams, AbortSignal, console, process: {env: {}}, ...extra.globals});
  return exports;
}
const shape = load('lib/shop/shape.ts');

const row = {
  product_id: 'prod_1', variant_id: 'variant_b', title: 'Pro Mouse', vendor_id: 'hv_1', vendor_name: 'Gear Co', available: 4,
  pricing: {calculated_amount: 1999, original_amount: 2499}, thumbnail: 'https://img/1.jpg', gallery: [{url: 'https://img/1.jpg'}, {url: 'https://img/2.jpg'}],
  categories: [{id: 'cat_m', name: 'Mice'}], specifications: {dpi: 26000, color: 'Black', brand: 'Zed'},
  variants: [
    {id: 'variant_b', title: 'Black', options: {color: 'Black'}, available: 4, pricing: {calculated_amount: 1999, original_amount: 2499}, images: ['https://img/b.jpg']},
    {id: 'variant_w', title: 'White', options: {color: 'White'}, available: 0, prices: [{currency_code: 'inr', amount: 2099}], images: ['https://img/w.jpg', 'http://insecure']},
  ],
};

test('product card shows live offer price, colours and seller like the website', () => {
  const card = shape.productCard(row);
  assert.equal(card.price, 1999); assert.equal(card.mrp, 2499);
  assert.deepEqual([...card.colors], ['Black', 'White']);
  assert.equal(card.vendorName, 'Gear Co'); assert.equal(card.categoryId, 'cat_m'); assert.equal(card.variantCount, 2);
});

test('product detail exposes colour variants with their own photos, stock and price', () => {
  const d = shape.productDetail(row, [{id: 'cat_m', specifications: [{key: 'dpi', label: 'DPI'}]}]);
  assert.equal(d.options.length, 1); assert.equal(d.options[0].key, 'color');
  assert.deepEqual([...d.options[0].values], ['Black', 'White']);
  const white = d.variants.find(v => v.id === 'variant_w');
  assert.equal(white.price, 2099); assert.equal(white.available, 0); assert.deepEqual([...white.images], ['https://img/w.jpg']);
  assert.ok(d.specs.some(s => s.label === 'DPI' && s.value === '26000'));
  assert.ok(!d.specs.some(s => s.label === 'Color'), 'variant axes are not repeated as specs');
  assert.deepEqual([...d.images], ['https://img/1.jpg', 'https://img/2.jpg']);
});

test('cart view hides the default variant title and maps totals', () => {
  const c = shape.cartView({currency_code: 'inr', items: [{id: 'cali_1', product_title: 'Pro Mouse', variant_title: 'Default variant', quantity: 2, unit_price: 100, total: 200}], item_subtotal: 200, shipping_total: 50, total: 250, shipping_methods: [{}]});
  assert.equal(c.items[0].variantTitle, ''); assert.equal(c.total, 250); assert.equal(c.hasShippingMethod, true);
});

test('delivery address is validated and cleaned', () => {
  const ok = shape.parseAddress({first_name: ' Asha ', address_1: '12 MG Road', city: 'Bengaluru', province: 'KA', postal_code: '560 001', phone: '+91 98765-43210', company: 'Pixel <Den>'});
  assert.equal(ok.first_name, 'Asha'); assert.equal(ok.postal_code, '560001'); assert.equal(ok.phone, '+919876543210'); assert.equal(ok.company, 'Pixel Den'); assert.equal(ok.country_code, 'in');
  assert.throws(() => shape.parseAddress({...ok, postal_code: '012345'}), /PIN/);
  assert.throws(() => shape.parseAddress({...ok, phone: '123'}), /phone/);
});

test('cafe profile becomes a starting delivery address', () => {
  const a = shape.addressFromBuyer({cafe_name: 'Pixel Den', owner_name: 'Asha Rao', phone: '9876543210', address: {line1: '12 MG Road, Bengaluru 560001', pincode: '560001', state: 'Karnataka'}});
  assert.equal(a.first_name, 'Asha'); assert.equal(a.last_name, 'Rao'); assert.equal(a.company, 'Pixel Den'); assert.equal(a.city, 'Bengaluru'); assert.equal(a.postal_code, '560001');
});

function jwt(payload) { return `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`; }

function serverHarness(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const path = url.replace('https://hash-medusa.onrender.com', '');
    calls.push({path, init});
    const handler = routes[`${init.method || 'GET'} ${path.split('?')[0]}`];
    if (!handler) return {ok: false, status: 404, text: async () => JSON.stringify({message: 'Not found'})};
    const [status, body] = handler(init, calls);
    return {ok: status < 400, status, text: async () => JSON.stringify(body)};
  };
  const server = load('lib/shop/server.ts', {'./shape': shape, globals: {fetch}});
  return {server, calls};
}

const config = ['GET /hash-store/config', () => [200, {version: 1, publishable_api_key: 'pk_x', region_id: 'reg_1', sales_channel_id: 'sc_1'}]];

test('first sign-in registers the cafe as a store customer without an email, then reuses the token', async () => {
  let exchanges = 0;
  const {server, calls} = serverHarness(Object.fromEntries([config,
    ['POST /auth/customer/hfg-cafe', (init) => { exchanges++; const body = JSON.parse(init.body); assert.equal(body.vendor_id, 7); return [200, {token: jwt(exchanges === 1 ? {actor_id: ''} : {actor_id: 'cus_7', exp: Math.floor(Date.now() / 1000) + 3600})}]; }],
    ['POST /store/customers', (init) => { const body = JSON.parse(init.body); assert.equal(body.email, undefined); assert.equal(body.metadata.hfg_vendor_id, '7'); return [200, {customer: {id: 'cus_7'}}]; }],
    ['GET /store/orders', (init) => { assert.equal(init.headers.Authorization, `Bearer ${jwt({actor_id: 'cus_7', exp: JSON.parse(Buffer.from(init.headers.Authorization.split('.')[1], 'base64url')).exp})}`); return [200, {orders: [{id: 'order_1', display_id: 3, total: 10, items: []}]}]; }],
  ]));
  const buyer = {dashToken: 'dash-token-long-enough', vendorId: 7};
  const first = await server.shopOps.orders(buyer, {});
  assert.equal(first.orders[0].displayId, 3);
  await server.shopOps.orders(buyer, {});
  assert.equal(exchanges, 2, 'second call reuses the cached customer token');
  assert.equal(calls.filter(c => c.path === '/store/customers').length, 1);
});

test("another customer's cart id is treated as no cart", async () => {
  const {server} = serverHarness(Object.fromEntries([config,
    ['POST /auth/customer/hfg-cafe', () => [200, {token: jwt({actor_id: 'cus_7', exp: Math.floor(Date.now() / 1000) + 3600})}]],
    ['GET /store/carts/cart_other', () => [200, {cart: {id: 'cart_other', customer_id: 'cus_9', items: [{id: 'cali_1'}]}}]],
  ]));
  const res = await server.shopOps['cart.get']({dashToken: 'dash-token-long-enough-2', vendorId: 7}, {cartId: 'cart_other'});
  assert.equal(res.cart, null); assert.equal(res.cartId, null);
  await assert.rejects(server.shopOps['cart.update']({dashToken: 'dash-token-long-enough-2', vendorId: 7}, {cartId: 'cart_other', itemId: 'cali_1', quantity: 2}), /cart is empty/);
});

test('a refused cafe session surfaces as sign in again, and bad ids never reach Medusa', async () => {
  const {server, calls} = serverHarness(Object.fromEntries([config, ['POST /auth/customer/hfg-cafe', () => [401, {message: 'Unauthorized'}]]]));
  await assert.rejects(server.shopOps.orders({dashToken: 'expired-token-long-enough', vendorId: 7}, {}), e => e.status === 401 && /Sign in again/.test(e.message));
  const before = calls.length;
  await assert.rejects(server.shopOps.order({dashToken: 'x', vendorId: 7}, {orderId: '../admin'}), /Invalid order/);
  await assert.rejects(server.shopOps['cart.add']({dashToken: 'x', vendorId: 7}, {variantId: 'variant_1', quantity: 0}), /Invalid quantity/);
  assert.equal(calls.length, before);
});
