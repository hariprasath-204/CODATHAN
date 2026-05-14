// ════════════════════════════════════════════════════════════════════════════
//  CODATHAN — Resilient Multi-Provider Code Execution Engine
//  Priority: Wandbox (key pool) → Piston API (free, no key) → Judge0 (RapidAPI)
//  If any provider fails or rate-limits, the next one is tried automatically.
// ════════════════════════════════════════════════════════════════════════════

// ─── Wandbox Key Pool ────────────────────────────────────────────────────────
const WANDBOX_KEYS = [
  import.meta.env.VITE_WANDBOX_KEY_1 || "",
  import.meta.env.VITE_WANDBOX_KEY_2 || "",
  import.meta.env.VITE_WANDBOX_KEY_3 || "",
].filter(k => k.trim() !== "");

// ─── Judge0 RapidAPI Key Pool ────────────────────────────────────────────────
const JUDGE0_KEYS = [
  import.meta.env.VITE_JUDGE0_KEY_1 || "",
  import.meta.env.VITE_JUDGE0_KEY_2 || "",
].filter(k => k.trim() !== "");

let wandboxKeyIndex = 0;
let judge0KeyIndex  = 0;

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 1 — Wandbox  (https://wandbox.org)
//  Free with or without an API key. Keys give higher rate limits.
// ════════════════════════════════════════════════════════════════════════════
const WANDBOX_COMPILER = { "c++": "gcc-head", "java": "openjdk-head" };

const runWandbox = async (code, language, stdin) => {
  const compiler = WANDBOX_COMPILER[language];
  if (!compiler) throw new Error("UNSUPPORTED_LANG");

  const pool = WANDBOX_KEYS.length > 0 ? WANDBOX_KEYS : [""];

  for (let attempt = 0; attempt < pool.length; attempt++) {
    const idx = (wandboxKeyIndex + attempt) % pool.length;
    const key = pool[idx];

    const headers = { "Content-Type": "application/json" };
    if (key) headers["Authorization"] = `Bearer ${key}`;

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers,
      body: JSON.stringify({ code, compiler, stdin }),
    });

    if (res.status === 429 || res.status === 401 || res.status === 403) {
      console.warn(`[Wandbox] Key #${idx + 1} exhausted (${res.status}), rotating...`);
      wandboxKeyIndex = (idx + 1) % pool.length;
      continue;
    }
    if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);

    wandboxKeyIndex = idx;
    const data = await res.json();
    return {
      output:  data.program_output || data.compiler_error || data.compiler_message || "",
      success: data.status === "0",
      provider: "Wandbox",
    };
  }
  throw new Error("WANDBOX_ALL_KEYS_EXHAUSTED");
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 2 — Piston API  (https://emkc.org/api/v2/piston)
//  Completely FREE. No API key required. Excellent fallback.
// ════════════════════════════════════════════════════════════════════════════
const PISTON_LANG = {
  "c++":  { language: "c++",  version: "*" },
  "java": { language: "java", version: "*" },
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
  const output = (run.stdout || "") + (run.stderr || "");

  return {
    output:   output.trim(),
    success:  run.code === 0,
    provider: "Piston",
  };
};

// ════════════════════════════════════════════════════════════════════════════
//  PROVIDER 3 — Judge0 via RapidAPI  (https://rapidapi.com/judge0-official)
//  Free tier: 50 req/day. Add your RapidAPI keys for higher limits.
// ════════════════════════════════════════════════════════════════════════════
const JUDGE0_LANG_ID = { "c++": 54, "java": 62 };

const runJudge0 = async (code, language, stdin) => {
  if (JUDGE0_KEYS.length === 0) throw new Error("JUDGE0_NO_KEYS");

  const langId = JUDGE0_LANG_ID[language];
  if (!langId) throw new Error("UNSUPPORTED_LANG");

  for (let attempt = 0; attempt < JUDGE0_KEYS.length; attempt++) {
    const idx = (judge0KeyIndex + attempt) % JUDGE0_KEYS.length;
    const key = JUDGE0_KEYS[idx];

    // Step 1: Submit
    const submitRes = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key":  key,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
          language_id:    langId,
          source_code:    code,
          stdin:          stdin || "",
        }),
      }
    );

    if (submitRes.status === 429 || submitRes.status === 403) {
      console.warn(`[Judge0] Key #${idx + 1} exhausted (${submitRes.status}), rotating...`);
      judge0KeyIndex = (idx + 1) % JUDGE0_KEYS.length;
      continue;
    }
    if (!submitRes.ok) throw new Error(`Judge0 submit HTTP ${submitRes.status}`);

    judge0KeyIndex = idx;
    const { token } = await submitRes.json();

    // Step 2: Poll for result (max 10 attempts, 1s apart)
    for (let poll = 0; poll < 10; poll++) {
      await new Promise(r => setTimeout(r, 1000));

      const resultRes = await fetch(
        `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
        {
          headers: {
            "X-RapidAPI-Key":  key,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        }
      );

      const result = await resultRes.json();
      const statusId = result.status?.id;

      if (statusId <= 2) continue; // Still processing (1=In Queue, 2=Processing)

      const output = result.stdout || result.stderr || result.compile_output || "";
      return {
        output:   output.trim(),
        success:  statusId === 3, // 3 = Accepted
        provider: "Judge0",
      };
    }
    throw new Error("JUDGE0_TIMEOUT");
  }
  throw new Error("JUDGE0_ALL_KEYS_EXHAUSTED");
};

// ════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — executeCode with automatic multi-provider fallback
// ════════════════════════════════════════════════════════════════════════════
export const executeCode = async (code, language, stdin = "") => {
  if (!code?.trim()) {
    return { output: "No code provided.", success: false, provider: "none" };
  }

  const providers = [
    { name: "Wandbox", fn: () => runWandbox(code, language, stdin) },
    { name: "Piston",  fn: () => runPiston(code, language, stdin)  },
    { name: "Judge0",  fn: () => runJudge0(code, language, stdin)  },
  ];

  for (const provider of providers) {
    try {
      console.log(`[Compiler] Trying provider: ${provider.name}...`);
      const result = await provider.fn();
      console.log(`[Compiler] ✅ Success via ${provider.name}`);
      return result;
    } catch (err) {
      if (err.message === "UNSUPPORTED_LANG") {
        return { output: `Language "${language}" is not supported.`, success: false };
      }
      console.warn(`[Compiler] ⚠️ ${provider.name} failed: ${err.message}. Trying next...`);
    }
  }

  // All 3 providers failed
  return {
    output:   "⚠️ All compilation providers are currently unavailable.\nPlease wait a moment and try again.",
    success:  false,
    provider: "none",
  };
};
