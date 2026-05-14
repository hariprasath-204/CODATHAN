const testWandbox = async (compiler, code) => {
  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, compiler }),
    });
    const text = await res.text();
    console.log(`[${compiler}] HTTP ${res.status} - ${text.substring(0, 100).replace(/\n/g, " ")}...`);
  } catch (e) {
    console.error(`[${compiler}] ERR:`, e.message);
  }
};

const main = async () => {
  console.log("Testing Java compilers...");
  const javaCode = `public class Main { public static void main(String[] args) { System.out.println("Hello Java"); } }`;
  await testWandbox("openjdk-head", javaCode);
  await testWandbox("openjdk-jdk", javaCode);
  await testWandbox("openjdk", javaCode);
  
  console.log("Testing C compilers...");
  const cCode = `#include <stdio.h>\nint main() { printf("Hello C"); return 0; }`;
  await testWandbox("gcc-head-c", cCode);
  await testWandbox("gcc-head", cCode); // Might run as C++ and work anyway
  
  console.log("Testing Python compilers...");
  const pyCode = `print("Hello Python")`;
  await testWandbox("cpython-head", pyCode);
  await testWandbox("python-head", pyCode);
};

main();
