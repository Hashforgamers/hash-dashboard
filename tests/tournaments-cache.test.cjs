const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the real page and cache hook with a deterministic React effect scheduler.
// A render/request loop exceeds the bounded settle limit and fails the test.
function harness() {
  const slots = [];
  let cursor = 0, dirty = true, effects = [], tree, token = null, requests = 0, fail = false;
  const context = { vendorId: 1, moduleCache: {}, moduleVersions: {},
    setModuleCache(key, data) { context.moduleCache[key] = { data, updatedAt: Date.now() }; dirty = true; } };
  const changed = (a, b) => !a || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value; if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(fn, deps) { const i = cursor++; if (changed(slots[i], deps)) { slots[i] = deps; effects.push(fn); } },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
  };
  const modules = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
    'jwt-decode': { jwtDecode: () => ({ sub: { id: 1 } }) },
    '@/app/context/DashboardDataContext': { useDashboardData: () => context },
    '@/hooks/useEventsToken': { useEventsToken: () => ({ token, loading: !token, error: null, refresh() {} }) },
    '@/app/(layout)/dashboard-layout': { DashboardLayout: 'layout' },
    '@/lib/event-api': { withEffectiveEventStatus: e => e, listEvents: async () => {
      requests++; if (fail) throw Error('Offline'); return [{ id: '1', title: 'Cup', status: 'draft', starts_at: '2026-10-01', ends_at: '2026-10-02' }];
    } },
  };
  function load(file) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name]; }, console, Date, localStorage: { getItem: () => null } }, { filename: file });
    return exports;
  }
  modules['@/app/hooks/useModuleCache'] = load('app/hooks/useModuleCache.ts');
  const Page = load('app/(features)/tournaments/page.tsx').default;
  async function settle() {
    for (let round = 0; round < 20; round++) {
      if (dirty) { dirty = false; cursor = 0; tree = Page(); const pending = effects; effects = []; pending.forEach(fn => fn()); }
      await new Promise(resolve => setImmediate(resolve));
      if (!dirty) return;
    }
    assert.fail('Page did not settle: possible request/render loop');
  }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
  }
  return { settle, get requests() { return requests; }, login() { token = 'test'; dirty = true; },
    rerender() { dirty = true; }, fail(value) { fail = value; },
    refresh() { find(tree, n => n.type === 'button' && [n.props?.children].flat().includes('Refresh')).props.onClick(); },
    filter(value) { find(tree, n => n.type === 'select').props.onChange({ target: { value } }); },
    invalidate() { context.moduleVersions['tournaments:1'] = 1; dirty = true; },
  };
}

test('waits for authentication, settles after one fetch, and does not refetch on renders', async () => {
  const h = harness(); await h.settle(); assert.equal(h.requests, 0);
  h.login(); await h.settle(); assert.equal(h.requests, 1);
  h.rerender(); await h.settle(); assert.equal(h.requests, 1);
  h.refresh(); await h.settle(); assert.equal(h.requests, 2);
  h.filter('published'); await h.settle(); assert.equal(h.requests, 3);
  h.invalidate(); await h.settle(); assert.equal(h.requests, 4);
});

test('failed requests settle and explicit refresh recovers', async () => {
  const h = harness(); h.fail(true); h.login(); await h.settle(); assert.equal(h.requests, 1);
  h.rerender(); await h.settle(); assert.equal(h.requests, 1);
  h.fail(false); h.refresh(); await h.settle(); assert.equal(h.requests, 2);
});
