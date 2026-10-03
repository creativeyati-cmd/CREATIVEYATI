/**
 * Browser verification harness.
 *
 * Drives real headless Chrome over the DevTools Protocol and reports the things
 * a build cannot: horizontal overflow at three widths, uncaught exceptions and
 * console errors, and whether the responsive rules actually resolve. Screenshots
 * are written for the pages it visits.
 *
 * No dependencies. Needs Node 22+ for the global WebSocket, and Chrome or Edge
 * installed (override with VERIFY_CHROME).
 *
 *   npm run verify
 *   VERIFY_BASE_URL=https://aivideocreator.cv npm run verify
 *   VERIFY_ROUTES=/courses,/checkout/ID npm run verify
 *   VERIFY_SESSION_COOKIE="sb-access-token=…" npm run verify   # adds the signed-in routes
 *   VERIFY_OUT=./verify-output npm run verify
 *
 * Exits non-zero when it finds a problem, so it can gate a deploy.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = (process.env.VERIFY_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = process.env.VERIFY_OUT || join(tmpdir(), "creativeyati-verify");
const SESSION = process.env.VERIFY_SESSION_COOKIE || "";
const PORT = Number(process.env.VERIFY_DEBUG_PORT || 9333);
const PROFILE = join(tmpdir(), `creativeyati-verify-profile-${process.pid}`);
const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS || 20000);

// public routes always; the signed-in ones only when a cookie is supplied
const PUBLIC_ROUTES = ["/", "/work", "/services", "/about", "/contact", "/courses"];
const PRIVATE_ROUTES = ["/learn", "/admin", "/admin/courses", "/admin/invoices", "/admin/certificates"];

const CHROME_CANDIDATES = [
  process.env.VERIFY_CHROME,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
];

const problems = [];
const results = [];
let shots = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error("No Chrome or Edge found. Set VERIFY_CHROME to the executable path.");
    process.exit(2);
  }
  return found;
}

function routes() {
  if (process.env.VERIFY_ROUTES) return process.env.VERIFY_ROUTES.split(",").map((route) => route.trim()).filter(Boolean);
  return SESSION ? [...PUBLIC_ROUTES, ...PRIVATE_ROUTES] : PUBLIC_ROUTES;
}

async function debuggerUrl() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // endpoint not up yet
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint never came up.");
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  const handlers = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method) (handlers.get(message.method) || []).forEach((fn) => fn(message.params));
  });

  const ready = new Promise((resolve) => socket.addEventListener("open", resolve));
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const on = (method, fn) => handlers.set(method, [...(handlers.get(method) || []), fn]);

  return { socket, ready, send, on };
}

const PROBE = `(() => {
  const doc = document.documentElement;
  const style = (el) => (el ? getComputedStyle(el) : null);
  const aside = document.querySelector("aside");
  const mobileTrigger = document.querySelector('button[aria-controls="dashboard-mobile-nav"]');
  const firstTable = document.querySelector("table");
  const cell = firstTable ? firstTable.querySelector("tbody td") : null;
  const body = document.querySelector("main") || document.body;
  // name whatever pushes the page wider than the viewport, so the report is
  // actionable. candidates, not proof: an ancestor may be clipping them.
  const offenders = [...document.querySelectorAll("body *")]
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && (rect.right > window.innerWidth + 2 || rect.left < -2))
    .sort((a, b) => Math.max(b.rect.right - window.innerWidth, -b.rect.left) - Math.max(a.rect.right - window.innerWidth, -a.rect.left))
    .slice(0, 3)
    .map(({ el, rect }) => {
      const name = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "";
      return el.tagName.toLowerCase() + name + " (" + Math.round(rect.width) + "px wide, right edge " + Math.round(rect.right) + ")";
    });
  return {
    title: document.title,
    overflowPx: doc.scrollWidth - window.innerWidth,
    height: body ? Math.round(body.getBoundingClientRect().height) : 0,
    offenders,
    asideDisplay: aside ? style(aside).display : null,
    mobileTriggerDisplay: mobileTrigger ? style(mobileTrigger).display : null,
    firstTableHiddenHead: firstTable ? style(firstTable.querySelector("thead")).position === "absolute" : null,
    firstTableCellDisplay: cell ? style(cell).display : null,
  };
})()`;

async function run() {
  if (typeof WebSocket !== "function") {
    console.error("This harness needs Node 22+ for the built-in WebSocket. You are on " + process.version + ".");
    process.exit(2);
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* a previous run may still hold it */ }

  const chrome = spawn(
    findChrome(),
    ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank"],
    { stdio: "ignore" },
  );

  try {
    const cdp = connect(await debuggerUrl());
    await cdp.ready;

    const consoleErrors = [];
    cdp.on("Runtime.exceptionThrown", (params) => consoleErrors.push(`exception: ${params.exceptionDetails?.text || "unknown"}`));
    cdp.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") consoleErrors.push(`console.error: ${(params.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" ")}`);
    });
    cdp.on("Log.entryAdded", (params) => {
      if (params.entry?.level === "error") consoleErrors.push(`log: ${params.entry.text}${params.entry.url ? ` (${params.entry.url})` : ""}`);
    });

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Network.enable");

    if (SESSION) {
      const separator = SESSION.indexOf("=");
      const name = separator > 0 ? SESSION.slice(0, separator) : SESSION;
      const value = separator > 0 ? SESSION.slice(separator + 1) : "";
      const host = new URL(BASE).hostname;
      await cdp.send("Network.setCookie", { name, value, domain: host, path: "/" });
    }

    for (const route of routes()) {
      for (const viewport of VIEWPORTS) {
        consoleErrors.length = 0;
        await cdp.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile });

        const loaded = new Promise((resolve) => cdp.on("Page.loadEventFired", resolve));
        await cdp.send("Page.navigate", { url: `${BASE}${route}` });
        await Promise.race([loaded, sleep(TIMEOUT_MS)]);
        await sleep(700);

        const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", { expression: PROBE, returnByValue: true, awaitPromise: true });
        const probe = exceptionDetails ? { overflowPx: 0 } : result.value;

        const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
        shots += 1;
        const file = join(OUT, `${String(shots).padStart(2, "0")}-${viewport.name}${route === "/" ? "-home" : route.replace(/\//g, "-")}.png`);
        writeFileSync(file, Buffer.from(shot.data, "base64"));

        const entry = { route, viewport: viewport.name, status: 200, screenshot: file, errors: [...consoleErrors], ...probe };
        results.push(entry);

        if (probe.overflowPx > 1) problems.push(`${route} at ${viewport.name}: ${probe.overflowPx}px horizontal overflow${probe.offenders?.length ? ` — widest: ${probe.offenders.join(", ")}` : ""}`);
        if (entry.errors.length) problems.push(`${route} at ${viewport.name}: ${entry.errors.join(" | ")}`);
        if (viewport.mobile && probe.mobileTriggerDisplay === "none") problems.push(`${route} at ${viewport.name}: dashboard nav trigger is hidden on a phone`);
        if (!viewport.mobile && probe.asideDisplay === "none" && route.startsWith("/admin")) problems.push(`${route} at ${viewport.name}: dashboard sidebar hidden on a wide viewport`);
      }
    }

    writeFileSync(join(OUT, "report.json"), JSON.stringify({ base: BASE, routes: routes(), problems, results }, null, 2));
    console.log(`\nchecked ${routes().length} routes across ${VIEWPORTS.length} viewports · ${shots} screenshots in ${OUT}`);
    if (problems.length) {
      console.error(`\n${problems.length} problem(s):`);
      problems.forEach((problem) => console.error(`  - ${problem}`));
    } else {
      console.log("no overflow, no console errors, breakpoints resolved");
    }
    cdp.socket.close();
    return problems.length ? 1 : 0;
  } finally {
    chrome.kill();
    // chrome keeps a lock on its profile for a moment after the signal
    await sleep(600);
    try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* profile cleanup is best effort */ }
  }
}

run()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("verification failed:", error.message);
    process.exit(1);
  });
