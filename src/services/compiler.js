// ─── Wandbox API Key Pool ────────────────────────────────────────────────────
// Add as many keys as you have. If one is rate-limited or fails,
// the system automatically retries with the next key in the array.
const WANDBOX_KEYS = [
  import.meta.env.VITE_WANDBOX_KEY_1 || "",
  import.meta.env.VITE_WANDBOX_KEY_2 || "",
  import.meta.env.VITE_WANDBOX_KEY_3 || "",
];

// Track which key index to start from (round-robin rotation)
let currentKeyIndex = 0;

const compilerMap = {
  "c++":  "gcc-head",
  "java": "openjdk-head",
};

// ─── Core: try one key, throw on rate-limit / auth error ────────────────────
const tryCompile = async (code, compiler, stdin, apiKey) => {
  const headers = { "Content-Type": "application/json" };

  // Only attach Authorization header if a key is provided
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers,
    body: JSON.stringify({ code, compiler, stdin }),
  });

  // 429 = rate limit, 401/403 = bad/expired key → signal to rotate
  if (response.status === 429 || response.status === 401 || response.status === 403) {
    throw new Error(`KEY_LIMIT:${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return {
    status:  data.status,
    output:  data.program_output || data.compiler_error || data.compiler_message || "",
    success: data.status === "0",
  };
};

// ─── Public: executeCode with automatic key rotation ────────────────────────
export const executeCode = async (code, language, stdin = "") => {
  const compiler = compilerMap[language];
  if (!compiler) {
    return { status: "Error", output: "Unsupported language: " + language, success: false };
  }

  // Filter out empty keys
  const activeKeys = WANDBOX_KEYS.filter(k => k.trim() !== "");

  // If no keys configured, fall back to unauthenticated request
  const keyPool = activeKeys.length > 0 ? activeKeys : [""];

  let lastError = null;

  // Try every key starting from currentKeyIndex (wrap around)
  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    const idx = (currentKeyIndex + attempt) % keyPool.length;
    const apiKey = keyPool[idx];

    try {
      const result = await tryCompile(code, compiler, stdin, apiKey);

      // Success — update the current key index to this working key
      currentKeyIndex = idx;
      return result;

    } catch (err) {
      console.warn(`[Compiler] Key #${idx + 1} failed (${err.message}), rotating to next key...`);
      lastError = err;

      // If it's a key/rate-limit error, mark this key as exhausted and rotate
      if (err.message.startsWith("KEY_LIMIT")) {
        currentKeyIndex = (idx + 1) % keyPool.length;
      } else {
        // Non-key error (network, server error) — no point rotating
        break;
      }
    }
  }

  // All keys exhausted
  console.error("[Compiler] All API keys failed:", lastError);
  return {
    status:  "Error",
    output:  "Compilation service unavailable. All API keys exhausted or rate-limited. Please try again in a moment.",
    success: false,
  };
};
