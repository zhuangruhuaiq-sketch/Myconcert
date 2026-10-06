import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useData } from "@/data/context";
import { Button, Card, Choices, Label, Rows, Screen, usePalette } from "@/components/ui";
import WorldMap from "@/components/world-map";
import { cityName } from "@/domain/city-name";
export default function Cities() {
  const { data } = useData();
  const p = usePalette();
  const [city, setCity] = useState("全部城市");
  const [mapCity, setMapCity] = useState<string | null>(null);
  const [scope, setScope] = useState("全部行程");
  const [revision, setRevision] = useState(0);
  const events = useMemo(() => data.events.filter((e) => scope !== "已观看" || e.status === "已观看"), [data.events, scope]);
  const recordedCities = useMemo(() => new Set(events.map((e) => e.city.trim())), [events]);
  const cities = useMemo(() => [...new Set(events.map((e) => cityName(e.city, recordedCities)).filter(Boolean))].sort().map((name) => {
    const records = events.filter((e) => cityName(e.city, recordedCities) === name);
    return { city: name, count: records.length, watched: records.filter((e) => e.status === "已观看").length };
  }), [events, recordedCities]);
  const names = ["全部城市", ...cities.map((c) => c.city), ...(events.some((e) => !cityName(e.city, recordedCities)) ? ["未填写城市"] : [])];
  const selected = names.includes(city) ? city : "全部城市";
  const records = events.filter((e) => selected === "全部城市" || (cityName(e.city, recordedCities) || "未填写城市") === selected).sort((a, b) => b.startAt.localeCompare(a.startAt));
  const mapRecords = events.filter((e) => cityName(e.city, recordedCities) === mapCity).sort((a, b) => b.startAt.localeCompare(a.startAt));
  return <Screen title="世界里的现场">
    <Modal visible={!!mapCity} transparent animationType="fade" onRequestClose={() => setMapCity(null)}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#17142199" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="关闭城市演出" onPress={() => setMapCity(null)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{ width: "100%", maxWidth: 390, maxHeight: "70%", padding: 16, borderRadius: 18, backgroundColor: p.card, gap: 10 }}>
          <Label large>{mapCity}</Label>
          <Label muted>{mapRecords.length} 场演出 · 已观看 {mapRecords.filter((e) => e.status === "已观看").length} 场</Label>
          <ScrollView style={{ maxHeight: 300 }}><Rows events={mapRecords} onSelect={(event) => {
            setMapCity(null);
            router.push({ pathname: "/event/[id]", params: { id: event.id } });
          }} /></ScrollView>
          <Button subtle title="关闭" onPress={() => setMapCity(null)} />
        </View>
      </View>
    </Modal>
    <Card title="城市足迹">
      <Label muted>{cities.length} 座城市 · {events.length} 场演出 · 紫色为已观看足迹，灰色为其他行程</Label>
      <Choices label="地图范围" value={scope} options={["全部行程", "已观看"]} onChange={setScope} />
      <View style={{ borderRadius: 16, overflow: "hidden", height: 400 }}>
        <WorldMap key={revision} cities={cities} onSelect={(name) => { setCity(name); setMapCity(name); }} />
      </View>
      <Label muted>内置中国城市行政区域，在线街道图不可用时放大即可查看。记录过的海外城市首次联网获取边界，保存后可离线查看。城市坐标查询来自 Photon，海外边界来自 OpenStreetMap；只查询城市，不需要定位权限。同名城市请补充省份或国家。</Label>
      <Button subtle title="重新加载地图" onPress={() => setRevision((n) => n + 1)} />
    </Card>
    <Card title="城市档案">
      <Choices label="查看城市" value={selected} options={names} onChange={setCity} />
      <Label>{selected} · {records.length} 场 / 已观看 {records.filter((e) => e.status === "已观看").length} 场</Label>
      <Rows events={records} />
    </Card>
  </Screen>;
}
