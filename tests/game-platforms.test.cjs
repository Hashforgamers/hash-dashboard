const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : {} });
  return mod.exports;
}
const { getConsoleInfo, compatiblePlatforms } = load(path.resolve(__dirname, '../app/(features)/games/platforms.ts'));
test('catalog and legacy names do not fall back to PC', () => {
  for (const name of ['playstation', 'PS5', 'ps4', 'PS']) assert.equal(getConsoleInfo(name).label, 'PlayStation');
  assert.equal(getConsoleInfo('XBOX').label, 'Xbox');
  assert.equal(getConsoleInfo('Racing rig').label, 'Racing rig');
});
test('GTA catalog supports PS and Xbox only, preserving group pricing and console IDs', () => {
  const groups = [
    { id: 11, platform_type: 'PS premium', single_slot_price: 32, total_consoles: 2, consoles: [{id: 1, console_type: 'PS5'}, {id: 2, console_type: 'pc'}] },
    { id: 12, platform_type: 'Xbox', single_slot_price: 38, total_consoles: 1, consoles: [{id: 3, console_type: 'xbox'}] },
    { id: 13, platform_type: 'PC', single_slot_price: 100, total_consoles: 1, consoles: [{id: 4, console_type: 'pc'}] },
  ];
  const result = compatiblePlatforms(groups, ['playstation', 'xbox']);
  assert.equal(JSON.stringify(result.map(p => p.id)), '[11,12]');
  assert.equal(result[0].single_slot_price, 32);
  assert.equal(result[0].total_consoles, 1);
  assert.equal(result[0].consoles[0].id, 1);
  assert.equal(groups[0].consoles.length, 2);
});
test('unknown support never offers all consoles', () => {
  assert.equal(compatiblePlatforms([{ platform_type: 'pc', total_consoles: 1, consoles: [{id:1,console_type:'pc'}] }]).length, 0);
});
