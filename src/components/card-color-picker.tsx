import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Label, usePalette } from "./ui";
import { contrastText, hexToHsv, hsvToHex, samplePixel, tint, type Pixels } from "@/domain/poster-colors";
import type { ConcertEvent } from "@/domain/rules";

type Style = NonNullable<ConcertEvent["cardBackground"]>;
const modes: [Style, string][] = [["default", "默认"], ["solid", "纯色"], ["gradient", "主色渐变"]];

export function CardColorPicker({ event, pixels, onChange }: {
  event: ConcertEvent;
  pixels: Pixels | null;
  onChange: (patch: Partial<ConcertEvent>) => void;
}) {
  const p = usePalette();
  const poster = event.media?.find((m) => m.role === "海报" && m.kind === "image");
  const [posterWidth, setPosterWidth] = useState(1);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [boardWidth, setBoardWidth] = useState(1);
  const [boardHeight, setBoardHeight] = useState(1);
  const [hueWidth, setHueWidth] = useState(1);
  const color = event.cardSolidColor || event.posterColor || event.color;
  const hsv = hexToHsv(color);
  const mode = event.cardBackground || (poster && event.posterColor ? "gradient" : "default");
  const active = mode === "gradient" && !!poster && !!event.posterColor ? "gradient"
    : mode === "solid" ? "solid" : "default";
  const foreground = active === "solid" ? contrastText(color) : active === "gradient" ? "#201b29" : p.text;
  const preview = <Text style={{ color: foreground, fontWeight: "700", fontSize: 17,
    textAlign: active === "gradient" ? "right" : "left" }}>演出卡片背景预览 · {(active === "gradient" ? event.posterColor! : color).toUpperCase()}</Text>;
  const setColor = (next: string) => onChange({ cardBackground: "solid", cardSolidColor: next });
  const sample = (x: number, y: number) => {
    if (!pixels) return;
    const picked = samplePixel(pixels, x, y, posterWidth, 220);
    if (picked) { setPoint({ x, y }); setColor(picked); }
  };
  return <Card title="演出卡片背景">
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {modes.map(([value, label]) => <Pressable key={value} accessibilityRole="button"
        accessibilityState={{ selected: mode === value }} onPress={() => onChange({ cardBackground: value })}
        style={{ paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
          borderColor: mode === value ? p.accent : p.border, backgroundColor: p.bg }}>
        <Text style={{ color: p.text }}>{label}</Text>
      </Pressable>)}
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: p.border,
        backgroundColor: event.posterColor || p.card }} />
      <Label muted>海报主色：{event.posterColor?.toUpperCase() || (poster ? "正在识别或无法识别" : "暂无海报")}</Label>
    </View>
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: active === "solid" ? color : p.card, minHeight: 64, justifyContent: "center", padding: 14 }}>
      {active === "gradient" && <LinearGradient colors={[event.posterColor!, tint(event.posterColor!, 0.85)]}
        locations={[0, 0.45]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" }} />}
      {preview}
    </View>
    {mode === "solid" && <>
      <Pressable accessibilityRole="button" accessibilityLabel="使用海报主色" disabled={!event.posterColor}
        onPress={() => onChange({ cardSolidColor: undefined })}
        style={{ paddingVertical: 8, opacity: event.posterColor ? 1 : 0.45 }}>
        <Text style={{ color: p.accent }}>使用海报主色</Text>
      </Pressable>
      {poster && <>
        <Label muted>在海报上拖动吸色</Label>
        <View accessibilityLabel="海报取色区" onLayout={(e) => setPosterWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => sample(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          onResponderMove={(e) => sample(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          style={{ height: 220, borderRadius: 12, overflow: "hidden", backgroundColor: p.bg }}>
          <Image source={{ uri: poster.uri }} resizeMode="contain" style={{ width: "100%", height: 220 }} />
          {point && <View style={{ position: "absolute", left: point.x - 13, top: point.y - 13,
            width: 26, height: 26, borderRadius: 13, backgroundColor: color, borderWidth: 3, borderColor: "#fff", pointerEvents: "none" }} />}
        </View>
      </>}
      <Label muted>在色板上滑动微调</Label>
      <View accessibilityRole="adjustable" accessibilityLabel="颜色明暗与饱和度" accessibilityValue={{ min: 0, max: 100, now: Math.round(hsv.v * 100) }}
        accessibilityActions={[{ name: "increment", label: "调亮" }, { name: "decrement", label: "调暗" }]}
        onAccessibilityAction={(e) => setColor(hsvToHex(hsv.h, hsv.s, hsv.v + (e.nativeEvent.actionName === "increment" ? 0.05 : -0.05)))}
        onLayout={(e) => { setBoardWidth(e.nativeEvent.layout.width); setBoardHeight(e.nativeEvent.layout.height); }}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setColor(hsvToHex(hsv.h, e.nativeEvent.locationX / boardWidth, 1 - e.nativeEvent.locationY / boardHeight))}
        onResponderMove={(e) => setColor(hsvToHex(hsv.h, e.nativeEvent.locationX / boardWidth, 1 - e.nativeEvent.locationY / boardHeight))}
        style={{ height: 150, borderRadius: 10, overflow: "hidden" }}>
        <LinearGradient colors={["#ffffff", hsvToHex(hsv.h, 1, 1)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        <LinearGradient colors={["#00000000", "#000000"]} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, pointerEvents: "none" }} />
        <View style={{ position: "absolute", left: hsv.s * boardWidth - 8, top: (1 - hsv.v) * boardHeight - 8,
          width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#fff", backgroundColor: color, pointerEvents: "none" }} />
      </View>
      <View accessibilityRole="adjustable" accessibilityLabel="色相滑动条" accessibilityValue={{ min: 0, max: 360, now: Math.round(hsv.h) }}
        accessibilityActions={[{ name: "increment", label: "下一色相" }, { name: "decrement", label: "上一色相" }]}
        onAccessibilityAction={(e) => setColor(hsvToHex(hsv.h + (e.nativeEvent.actionName === "increment" ? 15 : -15), hsv.s || 1, hsv.v || 1))}
        onLayout={(e) => setHueWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setColor(hsvToHex(e.nativeEvent.locationX / hueWidth * 360, hsv.s || 1, hsv.v || 1))}
        onResponderMove={(e) => setColor(hsvToHex(e.nativeEvent.locationX / hueWidth * 360, hsv.s || 1, hsv.v || 1))}
        style={{ height: 30, borderRadius: 8, overflow: "hidden" }}>
        <LinearGradient colors={["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        <View style={{ position: "absolute", left: hsv.h / 360 * hueWidth - 4, top: 0,
          width: 8, height: 30, borderWidth: 2, borderColor: "#fff", borderRadius: 4, pointerEvents: "none" }} />
      </View>
      <Label muted>当前纯色：{color.toUpperCase()}</Label>
    </>}
  </Card>;
}
