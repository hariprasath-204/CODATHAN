// ════════════════════════════════════════════════════════════════════════════
//  CODATHAN — OnlineCompiler.io Code Execution Engine
//  Designed for 500+ concurrent users
//
//  Provider:
//  1. OnlineCompiler.io (sandboxed Docker containers via API Key)
//     - Uses Socket.IO WebSocket execution first (Bypasses Browser CORS)
//     - Automatic fallback to REST via CORS proxy
//
//  Features:
//  ✅ Global concurrency limiter
//  ✅ 30s response cache (identical code = instant result)
//  ✅ Exponential backoff retries
//  ✅ Emergency admin alert via Firestore when compilation fails
// ════════════════════════════════════════════════════════════════════════════
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { io } from 'socket.io-client';

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
//  PROVIDER — OnlineCompiler.io (WebSocket + REST with CORS Bypass)
// ════════════════════════════════════════════════════════════════════════════
const ONLINE_COMPILER_LANG = {
  "c":      "gcc-15",
  "c++":    "g++-15",
  "cpp":    "g++-15",
  "java":   "openjdk-25",
  "python": "python-3.14",
};

// 1. WebSocket Execution via Socket.IO (Bypasses Browser CORS policy completely)
const runOnlineCompilerWS = (code, compiler, stdin, apiKey) => new Promise((resolve, reject) => {
  const socket = io("wss://api.onlinecompiler.io", {
    auth: { token: apiKey },
    transports: ["websocket", "polling"],
    timeout: 15000,
  });

  const timer = setTimeout(() => {
    socket.disconnect();
    reject(new Error("WebSocket timeout"));
  }, 15000);

  socket.on("connect", () => {
    socket.emit("runcode", {
      api_key: apiKey,
      compiler,
      code,
      input: stdin || "",
    });
  });

  socket.on("codeoutput", (result) => {
    clearTimeout(timer);
    socket.disconnect();

    let output = (result.output || "").trim();
    const errorMsg = (result.error || "").trim();
    if (errorMsg) {
      output = output ? `${output}\n${errorMsg}` : errorMsg;
    }

    const success = result.status === "success" && (result.exit_code === 0 || result.exit_code === undefined);

    resolve({
      output: output || (success ? "Program executed successfully with no output." : "Execution failed."),
      success,
      provider: "OnlineCompiler.io (WebSocket)",
    });
  });

  socket.on("connect_error", (err) => {
    clearTimeout(timer);
    socket.disconnect();
    reject(err);
  });
});

// 2. REST Execution with CORS proxy fallback
const runOnlineCompilerREST = async (code, compiler, stdin, cleanKey) => {
  const endpoints = [
    "https://api.onlinecompiler.io/api/run-code-sync/",
    "https://corsproxy.io/?https://api.onlinecompiler.io/api/run-code-sync/",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
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

      if (res.status === 429) throw new Error("ONLINE_COMPILER_RATE_LIMIT");
      if (!res.ok) continue;

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
    } catch (err) {
      console.warn(`[Compiler REST] Endpoint ${url} failed:`, err.message);
    }
  }
  throw new Error("OnlineCompiler execution failed (Network / CORS error)");
};

const runOnlineCompiler = async (code, language, stdin) => {
  const compiler = ONLINE_COMPILER_LANG[language] || ONLINE_COMPILER_LANG["c++"];
  if (!compiler) throw new Error("UNSUPPORTED_LANG");

  const rawKey = import.meta.env.VITE_ONLINE_COMPILER_API_KEY || "ccb79ad09699924cb025d0ba0b6690ed";
  const cleanKey = rawKey.replace(/^Bearer\s+/i, "").trim();

  // First try WebSocket (Socket.IO) execution to avoid CORS
  try {
    return await runOnlineCompilerWS(code, compiler, stdin, cleanKey);
  } catch (wsErr) {
    console.warn("[Compiler] WebSocket execution failed, trying REST fallback:", wsErr.message);
  }

  // Fallback to REST API with CORS proxy support
  return await runOnlineCompilerREST(code, compiler, stdin, cleanKey);
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

  await acquireSlot();

  try {
    console.log(`[Compiler] Executing via OnlineCompiler.io (${language})`);
    const result = await withRetry(() => runOnlineCompiler(code, language, stdin));
    console.log(`[Compiler] ✅ Success via OnlineCompiler.io`);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    if (err.message === "UNSUPPORTED_LANG") {
      return { output: `Language "${language}" is not supported.`, success: false };
    }
    console.warn(`[Compiler] ⚠️ OnlineCompiler.io failed: ${err.message}`);

    const lotNo = localStorage.getItem('codathan_user') || 'unknown';
    addDoc(collection(db, 'compiler_alerts'), {
      lotNo,
      language,
      timestamp: new Date(),
      message: `Compilation failed: ${err.message}`,
    }).catch(() => {});

    return {
      output:  `⚠️ Compilation error or service unavailable: ${err.message}`,
      success: false,
    };
  } finally {
    releaseSlot();
  }
};
