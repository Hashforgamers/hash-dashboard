const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : {} });
  return mod.exports;
}
const lib = load(path.resolve(__dirname, '../app/(features)/games/library.ts'));

const con = (id, type, price, extra = {}) => ({ id, console_number: id, console_type: type, brand: 'Hash', model_number: 'X', vendor_game_id: 1000 + id, price_per_hour: price, is_offer: false, default_price: price, ...extra });
const games = [
  { game: { id: 1, name: 'Valorant', genre: 'Shooter', rawg_rating: 4.1 }, consoles: [con(1, 'pc', 60), con(2, 'pc', 60)] },
  { game: { id: 2, name: 'FC 25', genre: 'Sports', rawg_rating: 3.5 }, consoles: [con(10, 'PS5', 120, { is_offer: true, default_price: 150, discount_percentage: 20, vendor_game_id: 5000 })] },
  { game: { id: 3, name: 'Apex Legends', genre: 'Shooter, Battle Royale' }, consoles: [con(1, 'pc', 60), con(10, 'playstation', 150), con(20, 'xbox', 140)] },
  { game: { id: 4, name: 'beat saber', genre: 'Music' }, consoles: [con(30, 'vr_headset', 250)] },
];

test('platform and genre facets count games, in chip order', () => {
  assert.equal(JSON.stringify(lib.platformFacets(games).map(f => [f.key, f.label, f.count])), JSON.stringify([['pc', 'PC', 2], ['playstation', 'PlayStation', 2], ['xbox', 'Xbox', 1], ['vr_headset', 'VR', 1]]));
  const genres = lib.genreFacets(games);
  assert.equal(genres[0].key, 'shooter');
  assert.equal(genres[0].count, 2);
  assert.ok(genres.some(g => g.label === 'Battle Royale'));
});

test('filters: title words, OR within a group, AND across groups', () => {
  const names = f => lib.filterGames(games, { ...lib.NO_FILTERS, ...f }).map(vg => vg.game.id).join(',');
  assert.equal(names({ query: 'LEG apex' }), '3');
  assert.equal(names({ platforms: ['playstation'] }), '2,3');
  assert.equal(names({ platforms: ['playstation', 'vr_headset'] }), '2,3,4');
  assert.equal(names({ platforms: ['pc'], genres: ['shooter'] }), '1,3');
  assert.equal(names({ platforms: ['xbox'], genres: ['sports'] }), '');
  assert.equal(lib.hasFilters(lib.NO_FILTERS), false);
  assert.equal(lib.hasFilters({ ...lib.NO_FILTERS, query: '  ' }), false);
});

test('sorts by name, rating, stations, price and recently added', () => {
  const order = key => lib.sortGames(games, key).map(vg => vg.game.id).join(',');
  assert.equal(order('name'), '3,4,2,1'); // case-insensitive
  assert.equal(order('rating'), '1,2,3,4'); // unrated last, then by name
  assert.equal(order('stations'), '3,1,4,2'); // ties by name
  assert.equal(order('price'), '3,1,2,4'); // 60 ties by name
  assert.equal(order('recent'), '2,4,3,1');
  assert.equal(games[0].game.id, 1, 'does not mutate input');
});

test('price summary flags offers', () => {
  assert.equal(JSON.stringify(lib.priceSummary(games[1])), JSON.stringify({ from: 120, hasOffer: true, bestDiscount: 20 }));
  assert.equal(lib.priceSummary({ consoles: [] }).from, null);
});

test('pagination clamps the page and windows the buttons', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  const p = lib.paginate(items, 9, 24);
  assert.equal(p.page, 3);
  assert.equal(p.pages, 3);
  assert.equal(p.items.length, 2);
  assert.equal(lib.paginate([], 1, 24).pages, 1);
  assert.equal(JSON.stringify(lib.pageWindow(5, 10)), JSON.stringify([1, 'gap', 4, 5, 6, 'gap', 10]));
  assert.equal(JSON.stringify(lib.pageWindow(1, 3)), JSON.stringify([1, 2, 3]));
});

test('station labels match Gaming Stations, with duplicates disambiguated and a fallback', () => {
  const names = lib.stationNames([
    { id: 101, number: 1, type: 'pc', console_display_name: 'PC', name: 'HASHPC01' },
    { id: 102, number: 1, type: 'pc', console_display_name: 'PC', name: 'HASHPC01' },
    { id: 120, number: 3, type: 'playstation', console_display_name: 'PS5', name: 'PS5 03' },
  ]);
  assert.equal(lib.stationLabel({ id: 120, console_number: 3, console_type: 'ps5' }, names).code, 'PS 03');
  assert.equal(lib.stationLabel({ id: 101, console_number: 1, console_type: 'pc' }, names).code, 'PC 01·101');
  assert.equal(lib.stationLabel({ id: 102, console_number: 1, console_type: 'pc' }, names).name, 'HASHPC01');
  assert.equal(lib.stationLabel({ id: 999, console_number: 4, console_type: 'xbox' }, names).code, 'Xbox #4');
});

test('cover fallback helpers are stable', () => {
  assert.equal(lib.initials('Grand Theft Auto V'), 'GT');
  assert.equal(lib.initials('Minecraft'), 'MI');
  assert.equal(lib.initials(''), '?');
  assert.equal(lib.seedHue('Valorant'), lib.seedHue('Valorant'));
  assert.ok(lib.seedHue('Valorant') >= 0 && lib.seedHue('Valorant') < 360);
  assert.equal(lib.formatRupees(60), '₹60');
  assert.equal(lib.formatRupees(62.5), '₹62.5');
});
