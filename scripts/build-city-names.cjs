const fs = require("node:fs");
const { cities } = require("../assets/maps/runtime.json");
const names = Object.entries(cities)
  .filter(([alias]) => /[\u3400-\u9fff]/.test(alias))
  .map(([alias, place]) => [alias, place.label.split(" · ")[0], place.label]);
fs.writeFileSync("assets/maps/city-names.json", JSON.stringify(names));
console.log(`Bundled ${names.length} Chinese city-name aliases.`);
