const res = await fetch("http://127.0.0.1:3336/docs/json");
const json = await res.json();
console.log(JSON.stringify(Object.keys(json.paths), null, 2));
