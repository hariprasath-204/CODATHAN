const testWandbox = async () => {
  const code = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java");
    }
}`;
  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, compiler: "openjdk-head" }),
    });
    const text = await res.text();
    console.log("Wandbox:", res.status, text);
  } catch (e) {
    console.error(e);
  }
};

const testPiston = async () => {
  const code = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java");
    }
}`;
  try {
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "java",
        version: "*",
        files: [{ content: code }]
      }),
    });
    const text = await res.text();
    console.log("Piston:", res.status, text);
  } catch (e) {
    console.error(e);
  }
};

testWandbox();
testPiston();
