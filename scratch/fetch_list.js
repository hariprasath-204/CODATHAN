const fetchList = async () => {
  const res = await fetch("https://wandbox.org/api/list.json");
  const data = await res.json();
  const javaCompilers = data.filter(c => c.language === 'Java');
  console.log("Java:", javaCompilers.map(c => c.name));
  
  const pythonCompilers = data.filter(c => c.language === 'Python');
  console.log("Python:", pythonCompilers.map(c => c.name));
};

fetchList();
