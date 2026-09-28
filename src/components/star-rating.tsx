import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Label, usePalette } from "@/components/ui";
import { ratingAt } from "@/domain/rating";

export function StarRating({ value, onChange }: { value?: number; onChange: (value?: number) => void }) {
  const p = usePalette();
  const [width, setWidth] = useState(220);
  const update = (x: number) => onChange(ratingAt(x, width));
  return <View style={{ gap: 5 }}>
    <Label>评分</Label>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View accessibilityRole="adjustable" accessibilityLabel="评分，拖动五颗星选择"
        accessibilityValue={{ min: 0, max: 5, now: value ?? 0 }}
        accessibilityActions={[{ name: "increment", label: "加一星" }, { name: "decrement", label: "减一星" }]}
        onAccessibilityAction={(event) => onChange(Math.min(5, Math.max(0, (value ?? 0) + (event.nativeEvent.actionName === "increment" ? 1 : -1))))}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => update(event.nativeEvent.locationX)}
        onResponderMove={(event) => update(event.nativeEvent.locationX)}
        style={{ flexDirection: "row", width: 220, height: 48, alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => <View key={star} pointerEvents="none" style={{ width: 44, height: 44, justifyContent: "center" }}>
          <Text style={{ width: 44, textAlign: "center", fontSize: 32, color: p.muted }}>☆</Text>
          <View style={{ position: "absolute", width: 44 * Math.min(1, Math.max(0, (value ?? 0) - star + 1)), overflow: "hidden" }}>
            <Text style={{ width: 44, textAlign: "center", fontSize: 32, color: "#e8a823" }}>★</Text>
          </View>
        </View>)}
      </View>
      <Text style={{ color: p.text }}>{value === undefined ? "未评分" : `${value} / 5`}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="清除评分" onPress={() => onChange(undefined)} style={{ alignSelf: "flex-start", minHeight: 32, justifyContent: "center" }}>
      <Text style={{ color: p.accent }}>清除评分</Text>
    </Pressable>
  </View>;
}
