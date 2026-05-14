// ════════════════════════════════════════════════════════════════════════════
//  CODATHAN — Resilient Multi-Provider Code Execution Engine
//  Designed for 500+ concurrent users
//
//  Provider chain (auto-fallback):
//  1. Wandbox (per-IP limits = each user independent quota)
//  2. Piston self-hosted (if VITE_PISTON_SELF_URL configured)
//  3. Piston public (emkc.org — free, reliable)
//  4. Judge0 RapidAPI (key pool fallback)
//
//  Features:
//  ✅ Global concurrency limiter (max 10 parallel API calls)
//  ✅ 30s response cache (identical code = instant result)
//  ✅ Exponential backoff retries
//  ✅ Emergency admin alert via Firestore when all providers fail
// ════════════════════════════════════════════════════════════════════════════
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// ─── Global concurrency limiter ──────────────────────────────────────────────
const MAX_CONCURRENT = 10; // Increased for 500+ users
let activeCalls = 0;
const waitQueue  = [];

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
// If two students submit identical code, the second gets instant result
// without hitting the API at all — saves quota and speeds up response
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
  // Limit cache size to 200 entries
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
      await wait(delayMs * Math.pow(2, i)); // 500ms, 1000ms
    }
  }
};

// ─── API Key Pools ───────────────────────────────────────────────────────────
const WANDBOX_KEYS = [
  import.meta.env.VITE_WANDBOX_KEY_1 || "",
  import.meta.env.VITE_WANDBOX_KEY_2 || "",
  import.meta.env.VITE_WANDBOX_KEY_3 || "",
].filter(k => k.trim() !== "");

const JUDGE0_KEYS = [
  import.meta.env.VITE_JUDGE0_KEY_1 || "",
  import.meta.env.VITE_JUDGE0_KEY_2 || "",
].filter(k => k.trim() !== "");

let wandboxKeyIdx = 0;
let judge0KeyIdx  = 0;

// ─── Admin Reset ─────────────────────────────────────────────────────────────
// Called when admin clicks "Reset Compiler" — resets all key indices and
// clears the response cache so every user starts fresh from key #1
export const resetCompiler = () => {
  wandboxKeyIdx = 0;
  judge0KeyIdx  = 0;
  responseCache.clear();
  console.log('[Compiler] ✅ Reset by admin — all key indices and cache cleared');
};


// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 1 — Piston Self-Hosted (Railway)
//  Set VITE_PISTON_SELF_URL in .env to your Railway deployment URL.
//  Guide: https://github.com/engineer-man/piston  (free on Railway)
//  This gives you UNLIMITED compilations with NO rate limits!
// ════════════════════════════════════════════════════════════════════════════
const PISTON_LANG = {
  "c":      { language: "c",      version: "*" },
  "c++":    { language: "c++",    version: "*" },
  "java":   { language: "java",   version: "*" },
  "python": { language: "python", version: "*" },
};

const runPiston = async (code, language, stdin, baseUrl = "https://emkc.org") => {
  const lang = PISTON_LANG[language];
  if (!lang) throw new Error("UNSUPPORTED_LANG");

  const res = await fetch(`${baseUrl}/api/v2/piston/execute`, {
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
    provider: baseUrl.includes("emkc") ? "Piston (Public)" : "Piston (Self-Hosted)",
  };
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 2 — Wandbox (with key rotation)
// ════════════════════════════════════════════════════════════════════════════
const WANDBOX_COMPILER = {
  "c":      "gcc-head-c",
  "c++":    "gcc-head",
  "java":   "openjdk-jdk-22+36",
  "python": "cpython-3.14.0",
};

const runWandbox = async (code, language, stdin) => {
  const compiler = WANDBOX_COMPILER[language];
  if (!compiler) throw new Error("UNSUPPORTED_LANG");

  const pool = WANDBOX_KEYS.length > 0 ? WANDBOX_KEYS : [""];

  for (let attempt = 0; attempt < pool.length; attempt++) {
    const idx = (wandboxKeyIdx + attempt) % pool.length;
    const key = pool[idx];
    const headers = { "Content-Type": "application/json" };
    if (key) headers["Authorization"] = `Bearer ${key}`;

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST", headers,
      body: JSON.stringify({ code, compiler, stdin }),
    });

    if (res.status === 429 || res.status === 401 || res.status === 403) {
      wandboxKeyIdx = (idx + 1) % pool.length;
      continue;
    }
    if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);

    wandboxKeyIdx = idx;
    const data = await res.json();
    return {
      output:   (data.program_output || data.compiler_error || data.compiler_message || "").trim(),
      success:  data.status === "0",
      provider: "Wandbox",
    };
  }
  throw new Error("WANDBOX_ALL_KEYS_EXHAUSTED");
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 3 — Judge0 via RapidAPI
// ════════════════════════════════════════════════════════════════════════════
const JUDGE0_LANG_ID  = {
  "c":      50,
  "c++":    54,
  "java":   62,
  "python": 71,
};

const runJudge0 = async (code, language, stdin) => {
  if (JUDGE0_KEYS.length === 0) throw new Error("JUDGE0_NO_KEYS");
  const langId = JUDGE0_LANG_ID[language];
  if (!langId) throw new Error("UNSUPPORTED_LANG");

  for (let attempt = 0; attempt < JUDGE0_KEYS.length; attempt++) {
    const idx = (judge0KeyIdx + attempt) % JUDGE0_KEYS.length;
    const key = JUDGE0_KEYS[idx];

    const submitRes = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=false",
      {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "X-RapidAPI-Key":  key,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({ language_id: langId, source_code: code, stdin: stdin || "" }),
      }
    );

    if (submitRes.status === 429 || submitRes.status === 403) {
      judge0KeyIdx = (idx + 1) % JUDGE0_KEYS.length;
      continue;
    }
    if (!submitRes.ok) throw new Error(`Judge0 submit HTTP ${submitRes.status}`);

    judge0KeyIdx = idx;
    const { token } = await submitRes.json();

    for (let poll = 0; poll < 10; poll++) {
      await wait(1000);
      const r    = await fetch(
        `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
        { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com" } }
      );
      const data = await r.json();
      if ((data.status?.id || 0) <= 2) continue;
      return {
        output:   (data.stdout || data.stderr || data.compile_output || "").trim(),
        success:  data.status?.id === 3,
        provider: "Judge0",
      };
    }
    throw new Error("JUDGE0_TIMEOUT");
  }
  throw new Error("JUDGE0_ALL_KEYS_EXHAUSTED");
};

// ════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — executeCode with queue + multi-provider fallback
// ════════════════════════════════════════════════════════════════════════════
export const executeCode = async (code, language, stdin = "") => {
  if (!code?.trim()) {
    return { output: "No code provided.", success: false };
  }

  // Check cache first — instant response, no API call needed
  const cacheKey = getCacheKey(code, language, stdin);
  const cached   = getCached(cacheKey);
  if (cached) {
    console.log("[Compiler] ⚡ Cache hit — returning instant result");
    return cached;
  }

  // ⚡ Provider chain — Wandbox FIRST (each student = own IP = own rate limit)
  // Fallbacks: Piston Public → Judge0 (safety nets only)
  const providers = [
    { name: "Wandbox",         fn: () => runWandbox(code, language, stdin) },
    { name: "Piston (Public)", fn: () => runPiston(code, language, stdin)  },
    { name: "Judge0",          fn: () => runJudge0(code, language, stdin)  },
  ];

  // Acquire a concurrency slot (queues if 5 already running)
  await acquireSlot();

  try {
    for (const provider of providers) {
      try {
        console.log(`[Compiler] Trying: ${provider.name}`);
        const result = await withRetry(provider.fn);
        console.log(`[Compiler] ✅ Success via ${provider.name}`);
        setCache(cacheKey, result); // cache for next identical request
        return result;
      } catch (err) {
        if (err.message === "UNSUPPORTED_LANG") {
          return { output: `Language "${language}" is not supported.`, success: false };
        }
        console.warn(`[Compiler] ⚠️ ${provider.name} failed: ${err.message}`);
      }
    }

    // 🚨 All providers failed — alert admin via Firestore in real-time
    const lotNo = localStorage.getItem('codathan_user') || 'unknown';
    addDoc(collection(db, 'compiler_alerts'), {
      lotNo,
      language,
      timestamp: new Date(),
      message: 'All compilation providers failed. Students cannot submit code.',
    }).catch(() => {}); // fire and forget, don't block

    return {
      output:  '⚠️ Compilation service is temporarily down.\nAdmin has been alerted automatically. Please wait a moment.',
      success: false,
    };
  } finally {
    releaseSlot(); // Always release slot even on error
  }
};
