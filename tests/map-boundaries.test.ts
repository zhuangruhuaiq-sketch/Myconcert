import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { boundaryRuntime } from "../src/domain/map-boundaries";
import { mapDocument } from "../src/domain/map-document";
import china from "../assets/maps/china-cities.json";
import taiwan from "../assets/maps/taiwan-cities.json";

test("boundary geometry joins reversed ways, preserves holes and rejects incomplete rings", () => {
  const context = vm.createContext({});
  vm.runInContext(boundaryRuntime.split("const boundaryKey=")[0], context);
  const ring = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
  const hole = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]];
  const way = (points: number[][], role = "outer") => ({ type: "way", role, geometry: points.map(([lon, lat]) => ({ lon, lat })) });
  context.relation = { members: [way(ring.slice(0, 3)), way(ring.slice(2).reverse()), way(hole, "inner")] };
  vm.runInContext("geometry=relationGeometry(relation)", context);
  assert.equal(vm.runInContext("contains(geometry,[3,3])", context), true);
  assert.equal(vm.runInContext("contains(geometry,[1.5,1.5])", context), false);
  assert.equal(vm.runInContext("contains(geometry,[5,5])", context), false);
  context.relation = { members: [way(ring.slice(0, 3))] };
  assert.equal(vm.runInContext("relationGeometry(relation)", context), null);
});

test("China city polygons and browser runtime load without external scripts", () => {
  assert.equal(china.features.length, 372);
  assert.equal(taiwan.features.length, 22);
  const context = vm.createContext({});
  vm.runInContext(boundaryRuntime.split("const boundaryKey=")[0], context);
  for (const [name, point] of [["上海市", [121.47, 31.23]], ["北京市", [116.4, 39.9]], ["杭州市", [120.15, 30.27]]] as const) {
    context.geometry = china.features.find(f => f.properties.name === name)?.geometry;
    context.point = point;
    assert.equal(vm.runInContext("contains(geometry,point)", context), true, name);
  }
  for (const script of mapDocument([]).matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  context.geometry = taiwan.features.find(f => f.properties.name === "台北市")?.geometry;
  assert.equal(vm.runInContext("contains(geometry,[121.565,25.033])", context), true);
});

test("a downloaded overseas boundary is reused after restarting with no network", async () => {
  const saved = new Map<string, string>();
  let requests = 0;
  const environment = (offline: boolean) => vm.createContext({
    china: { features: [] }, cities: [], gazetteer: {}, tileError: true,
    localStorage: { getItem: (key: string) => saved.get(key), setItem: (key: string, value: string) => saved.set(key, value) },
    document: { createElement: () => ({ textContent: "" }) },
    map: { on: () => {}, createPane: () => {}, getPane: () => ({ style: {} }) },
    L: { featureGroup: () => ({}), geoJSON: () => ({ bindTooltip: () => {}, addTo: () => {} }) },
    AbortController, setTimeout: (callback: () => void, ms: number) => ms === 1100 ? setTimeout(callback, 0) : setTimeout(callback, ms), clearTimeout,
    fetch: async () => {
      requests++;
      if (offline) throw Error("offline");
      return { ok: true, json: async () => ({ elements: [{ tags: { admin_level: "8" }, members: [{ type: "way", role: "outer", geometry: [
        { lon: 0, lat: 0 }, { lon: 4, lat: 0 }, { lon: 4, lat: 4 }, { lon: 0, lat: 4 }, { lon: 0, lat: 0 },
      ] }] }] }) };
    },
  });
  for (const offline of [false, true]) {
    const context = environment(offline);
    vm.runInContext(boundaryRuntime, context);
    await vm.runInContext("cityBoundary('Test City',{lon:2,lat:2,label:'Test City'})", context);
    assert.equal(vm.runInContext("boundaryMissing", context), 0);
  }
  assert.equal(requests, 1);
  assert.ok(saved.get("myconcert.city-boundaries.v1")?.includes("MultiPolygon"));
});

test("recorded city regions open that city's performances when tapped", () => {
  let onClick: (() => void) | undefined;
  let selected = "";
  const context = vm.createContext({
    china: { features: [{ type: "Feature", properties: { name: "上海市", en: "Shanghai" }, geometry: { type: "Polygon", coordinates: [[[120, 30], [122, 30], [122, 32], [120, 30]]] } }] },
    cities: [{ city: "上海" }], gazetteer: {}, tileError: true,
    localStorage: { getItem: () => null },
    document: { createElement: () => ({ textContent: "" }) },
    map: { on: () => {}, createPane: () => {}, getPane: () => ({ style: {} }) },
    L: { featureGroup: () => ({}), geoJSON: (feature: unknown, options: { onEachFeature: (feature: unknown, layer: { on: (name: string, callback: () => void) => void }) => void }) => {
      options.onEachFeature(feature, { on: (name, callback) => { if (name === "click") onClick = callback; } });
      return { bindTooltip: () => {}, addTo: () => {} };
    } },
    send: (city: string) => { selected = city; },
  });
  vm.runInContext(boundaryRuntime, context);
  assert.ok(onClick);
  onClick();
  assert.equal(selected, "上海");
});
