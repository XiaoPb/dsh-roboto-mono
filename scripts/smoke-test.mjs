#!/usr/bin/env node
/**
 * Runtime smoke test for the generated client bundle, without a browser.
 *
 * client.js is not a module: it calls `window.__ModuleLoader__.load` at load
 * time, and `apply(ctx)` touches a small DOM/CSSOM surface. This test provides
 * just enough of that surface to prove the bundle parses, registers the right
 * id, returns a working `apply`, reports `font READY`, and disposes cleanly.
 *
 * It is intentionally not a DOM implementation: anything the bundle could not
 * reasonably use from a WebView would fail here first.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
const entryId = patch.match(/-\s*insert:\s*\n\s*-\s*id:\s*(\S+)/)?.[1] ?? "";
const source = readFileSync(join(root, "client.js"), "utf8");

const failures = [];
let passed = 0;
const assert = (label, ok, detail) => {
  if (ok) passed++;
  else failures.push(detail ? `${label}: ${detail}` : label);
};

/* ---------- minimal DOM ---------- */
function createNode(tagName) {
  return {
    tagName,
    style: {},
    textContent: "",
    id: "",
    parentNode: null,
    getBoundingClientRect: () => ({ width: 600 }),
  };
}

function createContainer() {
  return {
    children: [],
    appendChild(node) {
      node.parentNode = this;
      this.children.push(node);
    },
    removeChild(node) {
      const index = this.children.indexOf(node);
      if (index >= 0) this.children.splice(index, 1);
      node.parentNode = null;
    },
  };
}

const head = createContainer();
const body = createContainer();

const fonts = {
  load: async () => [],
  check: () => true,
  forEach(callback) {
    for (const family of ['"Roboto Mono"', '"DejaVu Sans Mono"', '"RobotoMono NF"']) {
      callback({ family, status: "loaded" });
    }
  },
};

const document = {
  head,
  body,
  documentElement: body,
  getElementById: () => null,
  createElement: createNode,
  querySelector: () => null,
  fonts,
};

/* ---------- timers ---------- */
let nextTimer = 0;
const pendingTimers = new Set();
const startTimer = () => {
  const id = ++nextTimer;
  pendingTimers.add(id);
  return id;
};
const cancelTimer = (id) => pendingTimers.delete(id);

/* ---------- loader capture ---------- */
const warnings = [];
const consoleStub = {
  warn: (...args) => warnings.push(args.join(" ")),
  log: (...args) => warnings.push(args.join(" ")),
  error: (...args) => warnings.push(args.join(" ")),
};
const loaded = [];
const window = {
  __ModuleLoader__: {
    load(options) {
      loaded.push(options);
    },
  },
  setTimeout: startTimer,
  clearTimeout: cancelTimer,
  setInterval: startTimer,
  clearInterval: cancelTimer,
};

const context = vm.createContext({
  window,
  document,
  console: consoleStub,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  setTimeout: startTimer,
  clearTimeout: cancelTimer,
  setInterval: startTimer,
  clearInterval: cancelTimer,
});

vm.runInContext(source, context, { filename: "client.js" });

/* ---------- assertions ---------- */
assert("client.js loads through the DSH module loader", loaded.length === 1, `loader called ${loaded.length} time(s)`);
const registration = loaded[0] ?? {};
assert("loader id matches the bundle patch id", registration.id === entryId, `${registration.id} vs ${entryId}`);
assert("loader receives a factory", typeof registration.factory === "function", typeof registration.factory);

const moduleExports = registration.factory ? registration.factory(null) : {};
assert("factory exports apply", typeof moduleExports.apply === "function", typeof moduleExports.apply);

let effectCleanup;
const ctx = {
  effect(cleanup) {
    effectCleanup = cleanup;
  },
};
const dispose = typeof moduleExports.apply === "function" ? moduleExports.apply(ctx) : undefined;
assert("apply returns a dispose function", typeof dispose === "function", typeof dispose);
assert("apply registers a cleanup with cordis", typeof effectCleanup === "function", typeof effectCleanup);
assert("apply injects a style element", head.children.length === 1, `${head.children.length} style element(s)`);

// document.fonts.load resolves asynchronously in the VM realm; flush it.
await new Promise((resolve) => setImmediate(resolve));

assert("bundle reports font READY in the WebView log", warnings.some((line) => line.includes("font READY")), warnings.join(" | "));
assert("report includes face status", warnings.some((line) => line.includes("faces=")), warnings.join(" | "));

if (typeof dispose === "function") dispose();
assert("dispose removes the injected style", head.children.length === 0, `${head.children.length} style element(s) left`);
assert("dispose clears every timer", pendingTimers.size === 0, `${pendingTimers.size} timer(s) left`);

if (failures.length > 0) {
  console.error(`smoke-test: ${failures.length} check(s) failed, ${passed} passed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  if (warnings.length > 0) console.error(`client log: ${warnings.join(" | ")}`);
  process.exit(1);
}
console.log(`smoke-test: ${passed} checks passed`);
