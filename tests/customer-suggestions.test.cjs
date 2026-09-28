const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
  const source = fs.readFileSync('app/components/newSlot.tsx', 'utf8');
  const tree = ts.createSourceFile('newSlot.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['cancelSuggestionFetch', 'showCachedSuggestions', 'fetchUserSuggestions', 'scheduleSuggestionFetch'];
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(tree))) {
      declarations.push(`const ${node.getText(tree)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const requests = [], timers = new Map();
  let nextTimer = 1, rows = [], loading = {}, error = '';
  const context = {
    AbortController, URLSearchParams, console,
    suggestionVersionRef: { current: 0 }, suggestionDebounceRef: { current: null }, suggestionAbortRef: { current: null },
    userList: [{ id: 1, name: 'Old customer', phone: '8989', email: '' }],
    getVendorIdFromToken: () => 7, BOOKING_URL: 'https://booking.test',
    setIsSuggestionLoading: value => { loading = value; }, setSuggestionError: value => { error = value; },
    upsertUsersInCache: () => {},
    clearTimeout: id => timers.delete(id),
    window: { setTimeout: fn => { const id = nextTimer++; timers.set(id, fn); return id; } },
    api: { get: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })) },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(declarations.join('\n') + '\nglobalThis.actions = { fetchUserSuggestions, scheduleSuggestionFetch, cancelSuggestionFetch };', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { ...context.actions, requests, timers, setter: value => { rows = value; }, rows: () => rows, loading: () => loading, error: () => error };
}

test('cached customers appear immediately; stale response cannot overwrite a newer query', async () => {
  const f = fixture();
  const old = f.fetchUserSuggestions('name', 'Old', f.setter);
  assert.equal(f.rows()[0].id, 1);
  f.scheduleSuggestionFetch('phone', '999', f.setter);
  assert.equal(f.requests[0].options.signal.aborted, true);
  f.requests[0].resolve([{ id: 88 }]);
  await old;
  assert.equal(f.rows().length, 0);
});

test('old completion does not clear current request loading state', async () => {
  const f = fixture();
  const old = f.fetchUserSuggestions('name', 'Old', f.setter);
  const current = f.fetchUserSuggestions('phone', '8989', f.setter);
  f.requests[0].resolve([{ id: 88 }]);
  await old;
  assert.equal(f.loading().phone, true);
  f.requests[1].resolve([{ id: 1 }]);
  await current;
  assert.equal(f.rows()[0].id, 1);
  assert.equal(Object.keys(f.loading()).length, 0);
});

test('failure preserves cached results and exposes retry feedback', async () => {
  const f = fixture();
  const pending = f.fetchUserSuggestions('name', 'Old', f.setter);
  f.requests[0].reject(new Error('Offline'));
  await pending;
  assert.equal(f.rows()[0].id, 1);
  assert.match(f.error(), /retry/);
});

test('cancel on selection or close discards late results and scheduled work', async () => {
  const f = fixture();
  const pending = f.fetchUserSuggestions('name', 'Old', f.setter);
  f.cancelSuggestionFetch();
  f.requests[0].resolve([{ id: 88 }]);
  await pending;
  assert.equal(f.rows()[0].id, 1);
  f.scheduleSuggestionFetch('name', 'Old', f.setter);
  f.cancelSuggestionFetch();
  assert.equal(f.timers.size, 0);
});
