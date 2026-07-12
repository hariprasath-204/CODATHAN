// ════════════════════════════════════════════════════════════════════════════
//  CODATHAN — Resilient Multi-Provider Code Execution Engine
//  Designed for 500+ concurrent users
//
//  Provider chain (auto-fallback):
//  1. OnlineCompiler.io (Primary — sandboxed Docker containers via API Key)
//  2. Piston Public (emkc.org — free fallback)
//  3. Wandbox (free fallback)
//
//  Features:
//  ✅ Global concurrency limiter
//  ✅ 30s response cache (identical code = instant result)
//  ✅ Exponential backoff retries
//  ✅ Emergency admin alert via Firestore when all providers fail
// ════════════════════════════════════════════════════════════════════════════
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// ─── Global concurrency limiter ──────────────────────────────────────────────
const MAX_CONCURRENT = 10;
let activeCalls = 0;
const waitQueue = [];

const acquireSlot = () => new Promise(resolve => {
  if (activeCalls < MAX_CONCURRENT) {
    activeCalls++;
    resolve();
  } else {
    waitQueue.push(resolve);
  }
});

const releaseSlot = () => {
  activeCalls--;
  if (waitQueue.length > 0) {
    activeCalls++;
    waitQueue.shift()();
  }
};

// ─── Response Cache (30s TTL) ────────────────────────────────────────────────
const responseCache = new Map();
const CACHE_TTL_MS  = 30 * 1000; // 30 seconds

const getCacheKey = (code, language, stdin) =>
  `${language}::${stdin}::${code}`;

const getCached = (key) => {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
};

const setCache = (key, result) => {
  responseCache.set(key, { result, ts: Date.now() });
  if (responseCache.size > 200) {
    responseCache.delete(responseCache.keys().next().value);
  }
};

// ─── Retry with exponential backoff ─────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));
const withRetry = async (fn, retries = 2, delayMs = 500) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries || err.message === "UNSUPPORTED_LANG") throw err;
      await wait(delayMs * Math.pow(2, i));
    }
  }
};

// ─── Admin Reset ─────────────────────────────────────────────────────────────
export const resetCompiler = () => {
  responseCache.clear();
  console.log('[Compiler] ✅ Reset by admin — response cache cleared');
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 1 — OnlineCompiler.io (Primary API for all languages)
// ════════════════════════════════════════════════════════════════════════════
const ONLINE_COMPILER_LANG = {
  "c":      "gcc-15",
  "c++":    "g++-15",
  "cpp":    "g++-15",
  "java":   "openjdk-25",
  "python": "python-3.14",
};

const runOnlineCompiler = async (code, language, stdin) => {
  const compiler = ONLINE_COMPILER_LANG[language] || ONLINE_COMPILER_LANG["c++"];
  if (!compiler) throw new Error("UNSUPPORTED_LANG");

  const rawKey = import.meta.env.VITE_ONLINE_COMPILER_API_KEY || "ccb79ad09699924cb025d0ba0b6690ed";
  const cleanKey = rawKey.replace(/^Bearer\s+/i, "").trim();

  // First try direct API Key header
  let res = await fetch("https://api.onlinecompiler.io/api/run-code-sync/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": cleanKey,
    },
    body: JSON.stringify({
      compiler,
      code,
      input: stdin || "",
    }),
  });

  // If auth header requires Bearer prefix, retry
  if (res.status === 401 || res.status === 403) {
    res = await fetch("https://api.onlinecompiler.io/api/run-code-sync/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        compiler,
        code,
        input: stdin || "",
      }),
    });
  }

  if (res.status === 429) throw new Error("ONLINE_COMPILER_RATE_LIMIT");
  if (!res.ok) throw new Error(`OnlineCompiler HTTP ${res.status}`);

  const data = await res.json();

  let output = (data.output || "").trim();
  const errorMsg = (data.error || "").trim();
  if (errorMsg) {
    output = output ? `${output}\n${errorMsg}` : errorMsg;
  }

  const success = data.status === "success" && (data.exit_code === 0 || data.exit_code === undefined);

  return {
    output: output || (success ? "Program executed successfully with no output." : "Execution failed."),
    success,
    provider: "OnlineCompiler.io",
  };
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 2 — Piston Public (Fallback)
// ════════════════════════════════════════════════════════════════════════════
const PISTON_LANG = {
  "c":      { language: "c",      version: "*" },
  "c++":    { language: "c++",    version: "*" },
  "cpp":    { language: "c++",    version: "*" },
  "java":   { language: "java",   version: "*" },
  "python": { language: "python", version: "*" },
};

const runPiston = async (code, language, stdin) => {
  const lang = PISTON_LANG[language];
  if (!lang) throw new Error("UNSUPPORTED_LANG");

  const res = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: lang.language,
      version:  lang.version,
      files:    [{ content: code }],
      stdin:    stdin || "",
    }),
  });

  if (res.status === 429) throw new Error("PISTON_RATE_LIMIT");
  if (!res.ok)           throw new Error(`Piston HTTP ${res.status}`);

  const data = await res.json();
  const run  = data.run || {};
  return {
    output:   ((run.stdout || "") + (run.stderr || "")).trim(),
    success:  run.code === 0,
    provider: "Piston (Public)",
  };
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 3 — Wandbox Public (Fallback)
// ════════════════════════════════════════════════════════════════════════════
const WANDBOX_COMPILER = {
  "c":      "gcc-head-c",
  "c++":    "gcc-head",
  "cpp":    "gcc-head",
  "java":   "openjdk-jdk-22+36",
  "python": "cpython-3.14.0",
};

const runWandbox = async (code, language, stdin) => {
  const compiler = WANDBOX_COMPILER[language];
  if (!compiler) throw new Error("UNSUPPORTED_LANG");

  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, compiler, stdin: stdin || "" }),
  });

  if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);

  const data = await res.json();
  return {
    output:   (data.program_output || data.compiler_error || data.compiler_message || "").trim(),
    success:  data.status === "0",
    provider: "Wandbox",
  };
};

// ════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — executeCode
// ════════════════════════════════════════════════════════════════════════════
export const executeCode = async (code, language, stdin = "") => {
  if (!code?.trim()) {
    return { output: "No code provided.", success: false };
  }

  const cacheKey = getCacheKey(code, language, stdin);
  const cached   = getCached(cacheKey);
  if (cached) {
    console.log("[Compiler] ⚡ Cache hit — returning instant result");
    return cached;
  }

  // Provider chain: OnlineCompiler.io (Primary) → Piston → Wandbox
  const providers = [
    { name: "OnlineCompiler.io", fn: () => runOnlineCompiler(code, language, stdin) },
    { name: "Piston (Public)",   fn: () => runPiston(code, language, stdin)          },
    { name: "Wandbox",           fn: () => runWandbox(code, language, stdin)          },
  ];

  await acquireSlot();

  try {
    for (const provider of providers) {
      try {
        console.log(`[Compiler] Trying: ${provider.name}`);
        const result = await withRetry(provider.fn);
        console.log(`[Compiler] ✅ Success via ${provider.name}`);
        setCache(cacheKey, result);
        return result;
      } catch (err) {
        if (err.message === "UNSUPPORTED_LANG") {
          return { output: `Language "${language}" is not supported.`, success: false };
        }
        console.warn(`[Compiler] ⚠️ ${provider.name} failed: ${err.message}`);
      }
    }

    const lotNo = localStorage.getItem('codathan_user') || 'unknown';
    addDoc(collection(db, 'compiler_alerts'), {
      lotNo,
      language,
      timestamp: new Date(),
      message: 'All compilation providers failed. Students cannot submit code.',
    }).catch(() => {});

    return {
      output:  '⚠️ Compilation service is temporarily down.\nAdmin has been alerted automatically. Please wait a moment.',
      success: false,
    };
  } finally {
    releaseSlot();
  }
};
