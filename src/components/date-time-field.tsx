import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { calendarPeriod } from "@/domain/calendar";
import { dayKey } from "@/domain/rules";
import { Label, usePalette } from "@/components/ui";

export function DateTimeField({ label, value, onChange, optional = false }: {
  label: string; value: string; onChange: (value: string) => void; optional?: boolean;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || dayKey(new Date())).slice(0, 7));
  const selected = value.slice(0, 10);
  const time = value.slice(11) || "19:00";
  const period = calendarPeriod(month + "-01", false);
  const moveMonth = (delta: number) => {
    const [year, number] = month.split("-").map(Number);
    setMonth(dayKey(new Date(year, number - 1 + delta, 1)).slice(0, 7));
  };
  return <View style={{ gap: 6 }}>
    <Label>{label}</Label>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}选择日期`} accessibilityState={{ expanded: open }}
        onPress={() => { if (!open) setMonth((selected || dayKey(new Date())).slice(0, 7)); setOpen(!open); }}
        style={{ flex: 1, minHeight: 46, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: p.border, borderRadius: 9, backgroundColor: p.bg }}>
        <Text style={{ color: p.text }}>{selected || "选择日期"} ▾</Text>
      </Pressable>
      <TextInput accessibilityLabel={`${label}时刻`} value={value ? time : ""} placeholder="时:分" placeholderTextColor={p.muted}
        onChangeText={(next) => onChange((selected || dayKey(new Date())) + "T" + next)}
        keyboardType="numbers-and-punctuation" maxLength={5}
        style={{ width: 82, minHeight: 46, textAlign: "center", borderWidth: 1, borderColor: p.border, borderRadius: 9, color: p.text, backgroundColor: p.bg }} />
    </View>
    {open && <View style={{ maxWidth: 330, padding: 8, backgroundColor: p.bg, borderRadius: 12, borderWidth: 1, borderColor: p.border, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}上个月`} onPress={() => moveMonth(-1)} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><Text style={{ color: p.accent, fontSize: 22 }}>‹</Text></Pressable>
        <Text style={{ color: p.text, fontWeight: "700" }}>{month.slice(0, 4)} 年 {Number(month.slice(5))} 月</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}下个月`} onPress={() => moveMonth(1)} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><Text style={{ color: p.accent, fontSize: 22 }}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: "row" }}>{["一", "二", "三", "四", "五", "六", "日"].map((name) => <Text key={name} style={{ width: "14.2857%", textAlign: "center", color: p.muted }}>{name}</Text>)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{period.days.map((day, index) => day ?
        <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${label}${day}`} accessibilityState={{ selected: day === selected }}
          onPress={() => { onChange(day + "T" + time); setOpen(false); }}
          style={{ width: "14.2857%", minHeight: 40, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: day === selected ? p.accent : "transparent" }}>
          <Text style={{ color: day === selected ? "#fff" : p.text }}>{Number(day.slice(-2))}</Text>
        </Pressable> : <View key={index} style={{ width: "14.2857%", minHeight: 40 }} />)}</View>
      {optional && <Pressable accessibilityRole="button" accessibilityLabel={`${label}清除`} onPress={() => { onChange(""); setOpen(false); }} style={{ minHeight: 40, justifyContent: "center", alignItems: "center" }}><Text style={{ color: p.accent }}>清除日期</Text></Pressable>}
    </View>}
  </View>;
}
