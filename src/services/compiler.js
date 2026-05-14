export const executeCode = async (code, language, stdin = "") => {
  const compilerMap = {
    "c++": "gcc-head",
    "java": "openjdk-head"
  };

  const compiler = compilerMap[language];
  if (!compiler) {
    throw new Error("Unsupported language");
  }

  try {
    const response = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: code,
        compiler: compiler,
        stdin: stdin
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      output: data.program_output || data.compiler_error || data.compiler_message,
      success: data.status === "0"
    };
  } catch (error) {
    console.error("Compilation error:", error);
    return {
      status: "Error",
      output: error.message,
      success: false
    };
  }
};
