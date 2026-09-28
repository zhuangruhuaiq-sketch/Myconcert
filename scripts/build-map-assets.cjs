// Run after downloading the four upstream files listed in assets/maps/README.md.
const fs = require("node:fs");
const root = "assets/maps/";
const read = (name) => fs.readFileSync(root + name, "utf8");
const world = JSON.parse(read("world-source.json"));
const places = JSON.parse(read("places-source.json"));
const names = new Map();
for (const feature of places.features) {
  const p = feature.properties;
  const point = { lon: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1], label: [p.NAME_ZH || p.NAME, p.ADM1NAME, p.ADM0NAME].filter(Boolean).join(" · ") };
  for (const alias of new Set([p.NAME, p.NAMEASCII, p.NAME_EN, p.NAME_ZH, p.NAME_ZHT].filter(Boolean).map((s) => s.trim().toLowerCase().replace(/市$/, "")))) {
    if (!names.has(alias)) names.set(alias, point);
    else names.set(alias, null); // Ambiguous names must go through the online lookup.
  }
}
const bundle = {
  script: read("leaflet.js").replace(/\/\/# sourceMappingURL=.*$/m, ""),
  css: read("leaflet.css").replace(/url\([^)]*\)/g, "none"),
  world: { type: "FeatureCollection", features: world.features.map((f) => ({ type: "Feature", properties: { name: f.properties.NAME_ZH || f.properties.NAME }, geometry: f.geometry })) },
  cities: Object.fromEntries([...names].filter(([, p]) => p)),
};
fs.writeFileSync(root + "runtime.json", JSON.stringify(bundle));
console.log(`Bundled ${world.features.length} regions and ${Object.keys(bundle.cities).length} city aliases.`);
