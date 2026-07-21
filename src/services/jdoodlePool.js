import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';

// ── Array of JDoodle API Credentials (Supports 40+ keys for automatic failover) ──
// If a key exhausts its daily credit limit (statusCode 429 / Daily limit exceeded / Unauthorized / usedCount >= 22),
// the compiler loop automatically retries the Java program using the next key in this array / Firestore.
const rawJdoodleKeys = [
  // Existing 7 Keys
  {
    clientId: "4a9a6038b2a7e33b9a6b3739d857f178",
    clientSecret: "af69762f1a3185158b2feb6d50efc3255662084d3d3767c9614bc877bc4e9be"
  },
  {
    clientId: "3e8706c0cafdf8ff216561a0d3304d59",
    clientSecret: "7b15e29aefe3c416a105d85f544fab38d7707e5f479d586189cedfecd5dddbc1"
  },
  {
    clientId: "18e0a38b4e6695a1bba4f3a3381e174f",
    clientSecret: "228d6d9f6a1ad274de5db67988ec6fdb4cd52db34b3d93184d8e53bdb594b7a9"
  },
  {
    clientId: "5f45c84173c7098c031404a9674d6c70",
    clientSecret: "a91dfa30ca471cff624337eb0dcf80cfa22300f80ac9a7483d9c08bb1bcd66fb"
  },
  {
    clientId: "982a4209bc5bff19d1477e5a828cfaa7",
    clientSecret: "233b90363b565cec8868e8175e713efdcae02ee361c28f1c01299609b71871c2"
  },
  {
    clientId: "4da2716404770c9e712cfea86cb360e",
    clientSecret: "a4bf05d8b551544e80746fc149301d0570ee586cedd67ac1fcca78db0ec66d21"
  },
  {
    clientId: "1a12909b9e823337a62eeb3ecd23ee7f",
    clientSecret: "d23dfc7e285be4244bcac4069507284b512ce530bce1a9913d662055ba52e52d"
  },
  // Added 22 Keys
  {
    clientId: "e9d4c44d39706bc115fd78d1fa94ae0b",
    clientSecret: "2301490931d4fb5120c3a90054f4fdaf62adbab50e1c5340fb66a95834784950"
  },
  {
    clientId: "b30629e21f310dbf19aba52408e2a2a8",
    clientSecret: "d6d0b3c5e9375561a3cb95bae07c99f682d80010bd2a8d11f431f49ff06c78e2"
  },
  {
    clientId: "fd83f9d57ac69f9adeff2a6fdc73ffdb",
    clientSecret: "6defdfd8ddeaae552104964104bf893d24f18eab5dd80d680cee93bf8cf519fa"
  },
  {
    clientId: "314ca30886bd9620faafe84a5a0c4ebb",
    clientSecret: "c5c89a82ce82dc00d0983371b8b6313d4435b8aaac6b20dc03892ef6e63c4487"
  },
  {
    clientId: "9b7149e8f712ebe613986a00957e3edb",
    clientSecret: "5ace899a89ab28e7060c5e7cac49205df46387367e9d58d96bc379e7ce08fdce"
  },
  {
    clientId: "4b8d713065b8a0e847e698912c745460",
    clientSecret: "5ffb6c31effdf8914baabda5ec20bb461e1b7b75ecbcf2e825a0b3f5c7ff26b9"
  },
  {
    clientId: "decd504ec47ed1355d951fe5779d0fe4",
    clientSecret: "db582301b8d5e24094bd8e2f51293ece3198a377d3b8cb933d799416acb2a401"
  },
  {
    clientId: "196cb515a1006555e7ace58f43fc4c17",
    clientSecret: "5befa1e4d25d261b6deff0b916fcc82d4a15fd3c7bd1fc0046e4990feb86b85b"
  },
  {
    clientId: "b5d77dc299692b52116de24ffbbf19ac",
    clientSecret: "3f1840cca41b59d9b0e694cd26c969f9c38b3de9d49e895299ce08af6234270d"
  },
  {
    clientId: "ef832f26f387fdabc20f1ab5600fd398",
    clientSecret: "6cd152d68ddd2d04c3ef229f60fb6afb6291ad137ea0246ee7734b7bbf948ab2"
  },
  {
    clientId: "f979e6144c4a43700876fcad294de5c0",
    clientSecret: "1e9a334be85af822673e25547a5b94e362b00fbccd355cb57a740517042e3138"
  },
  {
    clientId: "ac5e6f41a7cad46d5b37a318ebd0ed78",
    clientSecret: "2e2384b0c3237b2fe0f3c177bc0b9d17bfed2b3356e385851cf25cc4efec6e6e"
  },
  {
    clientId: "508f04c91c99911af75cdc21fb72c675",
    clientSecret: "7c090ad0c46b72b47138ecff18c9a3f168faa77e129f75aadc915d61d668ecb2"
  },
  {
    clientId: "fa0cf8185c0b2b43c26e87ab5649c691",
    clientSecret: "779e4df53c34ad549665ed6fc17a4509ac357377c9462ffd3d370bea94aed840"
  },
  {
    clientId: "3717e4a63f833cce76eb5a610b0a58ff",
    clientSecret: "532ff37974a65ad86e39bb42f71d2df4ef2ab68301f2f78e54c7a5217cb76f75"
  },
  {
    clientId: "dbf60ee909b6ef93e7f3845376c7a9ea",
    clientSecret: "49862081bbe1c2e1494173b5ee79a09def675f4e481fb0755541a623c798d3f5"
  },
  {
    clientId: "721971bed2443f06b09cf9d965e40e2c",
    clientSecret: "c15b9aec9b3540942a72f012d05160099348b8fecbfe987a59f1b22a9e3d2ad4"
  },
  {
    clientId: "cfbbe31583110e83c74f5ae7ea77b6bf",
    clientSecret: "5c0e0bbc30ac9e5ad8f675c9b6c31abe562f2c8e11bddce2fec8b512c59393c4"
  },
  {
    clientId: "9baba800dcad9f64d0ef7e180226bcd0",
    clientSecret: "e4916385a6e5c003d267d919fa41de009c579684f69bf141e742d15069d2a5bb"
  },
  {
    clientId: "a9b709e280afbc916252ce9a691641f9",
    clientSecret: "806d741cd61967262c1641da1d2fe7f8e77489f56dbcb6506a1d57b0561407d3"
  },
  {
    clientId: "3513793f9cb42dce8d7bc7b79ce9ac72",
    clientSecret: "2da50081c7ffbf9841b3547fa7dd2cf6ac3405d6b3474ec360938260a549f70c"
  },
  {
    clientId: "9f2dd28002c61669a6ad40bed46b19b3",
    clientSecret: "fd365b49e35fa273a1c678af84d58e19bd3f8aab98f700d2136d5c42005e4b9f"
  },
  {
    clientId: "9382bb4b33c6d7d54591ab1156a0416c",
    clientSecret: "3c5d039783e89e6942141b11fe921c09d217e3e89c0219bf0d7f5973d49f46e8"
  },
  {
    clientId: "4683a8489fbd7ca86613c84f1206c8a0",
    clientSecret: "d35724cff65bc3b1b046045739cb065b2d2c330b7b76bfd47decf1a2e26c9f8"
  },
  {
    clientId: "bfed6776eb31dbda2bedd391e7d0f3f1",
    clientSecret: "28c18fe94d2f3e8ad7d8855a63cc590373e94217b78e15287d930fb53aac6d3c"
  },
  {
    clientId: "95128b10793f2e978785b5c7a48b2532",
    clientSecret: "bd6ac8bc7d5e6d89f1172ff2ce489aa38e7050cb722085bcde0ad37afee933d4"
  },
  {
    clientId: "a78dff5add084e9f4acecc3eccf0b35c",
    clientSecret: "fe489d0a03ea51ad459d535345cf5fd14f41cc3ce095bfeb3fb56d1f10709b28"
  },
  {
    clientId: "e3c76c74d57b8dd2f9b40f577078d679",
    clientSecret: "a001032cc04a284282659e9385c71ca6df9ded290aef9550faa84aabdf78d2d"
  },
  {
    clientId: "29b2cb0b825c059c417661b557145e6c",
    clientSecret: "39f05789a92f7e6f13307106d90eba402c8dee4033d8372f383e24e85cf72e2a"
  },
  {
    clientId: "70599b1ca20da775cf63e6d6548551a4",
    clientSecret: "48e732af6d87709c970fc73012b6e4d55b9d4947b6e07172c2e2f3c4f8d2393c"
  },
  {
    clientId: "7145d4b497a13c10957c917b6d3fccc9",
    clientSecret: "58865878c01c13936e81750b97838379039c8c0b5af7dc06c5aea6de4337d046"
  },
  {
    clientId: "ae6954b908c906f88cdf29c15a88bbbb",
    clientSecret: "63be1070edd3f10acc0411abcff7319f94d12d4571ee3353635b46491cc215e9"
  },
  {
    clientId: "5d34444cf02750332fb8326009fce9da",
    clientSecret: "3f173d36e4a3e641a60d9d0bc5279b030b505ecc60270c9a0a0bdfe8e2e2faad"
  },
  // Added 14 Additional Keys
  {
    clientId: "fb5c4989b0451baaac3e59aa20f8b330",
    clientSecret: "b54599bce45e688846e2237e1703c1dfc19e532b99c3c79f7e1527802f5fb1f0"
  },
  {
    clientId: "2de3f38f161f67b91581761014a76d51",
    clientSecret: "54cf5c36b1bc82005c7d903a9dfdb70e0d86c703b1e235d99195c9c93408dda3"
  },
  {
    clientId: "445dce4885b55c9c53ad824eb34f072",
    clientSecret: "c4949dfd0bbbe7a244a44170c97ee2020ef20efad8637c2cacc5cd8b28653328"
  },
  {
    clientId: "7d99ef220a7c7358708c453055adcd7",
    clientSecret: "a177c99edaa262e1134f1de072a584916ac9c918719ef14bbe6c379eeb7e5027"
  },
  {
    clientId: "891bfcae6d8de932df276dec52bc02bb",
    clientSecret: "e3e360e1806e84981e2ce4420dde135ee1cf3ffe3f18e654ca7030e7809cb3ac"
  },
  {
    clientId: "a268b15a0bce4b28ac5504ee28b5b05f",
    clientSecret: "2018b3e7ca07984c2972793a53b2f9799089d1d6627d110165fc30d859dfb634"
  },
  {
    clientId: "7e2873b4d3d62a2ee1c157005d499f20",
    clientSecret: "345e8e69735c29f74639da13608e5cc7938c4ea0e4dc88143542d322d7ed236d"
  },
  {
    clientId: "2f58385f281b382312f8903cc73feda5",
    clientSecret: "164e60d70a54b3534ecb327d65fd7e59141236c6ab2b1459dad56d05067f8036"
  },
  {
    clientId: "ec23a851af56542be63fb60842396f77",
    clientSecret: "d7449e308e31dcadfa909942d00e0a13e3d31a8c4d2290e2fdff724ad8043193"
  },
  {
    clientId: "3b4f220c7d51369f802dfad01c8b4200",
    clientSecret: "2df0ff0a4ba0c47462790470a24e09b1d1a99ac3ef0a4abafadaa3686efb7f44"
  },
  {
    clientId: "24214c059b4b26e8e929f3f3243ad0ea",
    clientSecret: "5e34e0cb13475a0b816f8ae50f63bb5a7d9c6a86292379936654187d292415bd"
  },
  {
    clientId: "807fda80fee2b0fa263cdc59fd5b6d37",
    clientSecret: "b566668ebb757cb3dc484ab3092cd18425f59f411d1446d33c1b526ce5128611"
  },
  {
    clientId: "1b3c1b8c05356c265e81c4bc2e6bab92",
    clientSecret: "6c59cd9066e1b9b454789a4676a667ede8a91807253759186224ab0883d290c"
  },
  {
    clientId: "e4077f198b6116c21b1c8578a383447",
    clientSecret: "8d81b43c32c65199df51d35a9a25ca66b4a5fb0f83eab079044b6576de7cdce4"
  }
];

// Deduplicate any identical clientIds
const seenIds = new Set();
export const INITIAL_JDOODLE_KEYS = rawJdoodleKeys.filter(k => {
  if (seenIds.has(k.clientId)) return false;
  seenIds.add(k.clientId);
  return true;
});

const COLLECTION_NAME = 'jdoodle_keys';
const DAILY_LIMIT = 22;

// Auto-seed Initial Keys if Firestore is empty or missing them
export const seedAndFetchKeys = async () => {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const existingIds = new Set(snap.docs.map(doc => doc.id));

    // Check if any initial keys need seeding
    const keysToSeed = INITIAL_JDOODLE_KEYS.filter(k => !existingIds.has(k.clientId));
    if (keysToSeed.length > 0) {
      console.log(`[JDoodle Pool] Seeding ${keysToSeed.length} initial JDoodle keys into Firestore...`);
      for (let i = 0; i < keysToSeed.length; i++) {
        const k = keysToSeed[i];
        await setDoc(doc(db, COLLECTION_NAME, k.clientId), {
          clientId: k.clientId,
          clientSecret: k.clientSecret,
          status: 'active', // 'active', 'exhausted', 'disabled'
          usedCount: 0,
          dailyLimit: DAILY_LIMIT,
          label: `Key #${snap.size + i + 1}`,
          createdAt: new Date()
        });
      }
    }

    // Return combined/freshened list
    const freshSnap = await getDocs(collection(db, COLLECTION_NAME));
    const allKeys = freshSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Remove any potential duplicates in Firestore just in case
    const uniqueKeysMap = new Map();
    allKeys.forEach(k => {
      const keyId = k.clientId || k.id;
      if (!uniqueKeysMap.has(keyId)) {
        uniqueKeysMap.set(keyId, k);
      }
    });
    const uniqueKeys = Array.from(uniqueKeysMap.values());

    // Sort by status ('active' first) and lowest used count
    uniqueKeys.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (a.usedCount || 0) - (b.usedCount || 0);
    });

    return uniqueKeys;
  } catch (err) {
    console.error("[JDoodle Pool] Error fetching/seeding keys from Firestore, using fallback array:", err);
    return INITIAL_JDOODLE_KEYS.map((k, idx) => ({
      id: k.clientId,
      clientId: k.clientId,
      clientSecret: k.clientSecret,
      status: 'active',
      usedCount: 0,
      dailyLimit: DAILY_LIMIT,
      label: `Key #${idx + 1}`
    }));
  }
};

// Execute Java program using JDoodle API keys one by one with automatic failover
export const runJdoodleJava = async (code, stdin = "") => {
  const keys = await seedAndFetchKeys();
  const activeKeys = keys.filter(k => k.status === 'active' && (k.usedCount || 0) < DAILY_LIMIT);

  if (activeKeys.length === 0) {
    throw new Error("JDOODLE_ALL_EXHAUSTED");
  }

  const endpoints = [
    "https://corsproxy.io/?https://api.jdoodle.com/v1/execute",
    "https://api.jdoodle.com/v1/execute"
  ];

  for (const keyObj of activeKeys) {
    for (const url of endpoints) {
      try {
        console.log(`[JDoodle Java] Attempting execution with key ${keyObj.clientId.substring(0, 6)}... via ${url}`);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            clientId: keyObj.clientId,
            clientSecret: keyObj.clientSecret,
            script: code,
            language: "java",
            versionIndex: "4",
            stdin: stdin || ""
          })
        });

        if (res.status === 429) {
          console.warn(`[JDoodle Java] Key ${keyObj.clientId.substring(0, 6)} hit rate limit / 429`);
          await markKeyExhausted(keyObj.clientId);
          break;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status === 401 || text.includes("Daily limit") || text.includes("limit") || text.includes("Unauthorized")) {
            console.warn(`[JDoodle Java] Key ${keyObj.clientId.substring(0, 6)} exhausted or unauthorized: ${text}`);
            await markKeyExhausted(keyObj.clientId);
            break;
          }
          continue;
        }

        const data = await res.json();

        if (data.error && (data.error.includes("Daily limit") || data.error.includes("limit") || data.statusCode === 429)) {
          console.warn(`[JDoodle Java] Key ${keyObj.clientId.substring(0, 6)} error payload: ${data.error}`);
          await markKeyExhausted(keyObj.clientId);
          break;
        }

        await incrementKeyUsage(keyObj.clientId, (keyObj.usedCount || 0) + 1);

        let output = (data.output || "").trim();
        const success = data.statusCode === 200 || !data.error;

        return {
          output: output || (success ? "Program executed successfully with no output." : "Execution failed."),
          success,
          provider: "JDoodle (Java)"
        };
      } catch (err) {
        console.warn(`[JDoodle Java] Request error with key ${keyObj.clientId.substring(0, 6)} via ${url}:`, err.message);
      }
    }
  }

  throw new Error("All available Java JDoodle API keys failed or exceeded daily quota (22 executions).");
};

const markKeyExhausted = async (clientId) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, clientId), {
      status: 'exhausted'
    });
  } catch (err) {
    console.warn(`Could not mark key ${clientId} exhausted in Firestore:`, err.message);
  }
};

const incrementKeyUsage = async (clientId, newCount) => {
  try {
    const updates = {
      usedCount: increment(1)
    };
    if (newCount >= DAILY_LIMIT) {
      updates.status = 'exhausted';
    }
    await updateDoc(doc(db, COLLECTION_NAME, clientId), updates);
  } catch (err) {
    console.warn(`Could not increment key usage for ${clientId}:`, err.message);
  }
};
