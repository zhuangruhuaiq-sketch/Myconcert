import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Label, usePalette } from "@/components/ui";
import { citySuggestions } from "@/domain/city-suggestions";

export function CityField({ value, recorded, onChange }: { value: string; recorded: string[]; onChange: (value: string) => void }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const suggestions = open ? citySuggestions(value, recorded) : [];
  return <View style={{ gap: 5 }}>
    <Label>城市</Label>
    <TextInput accessibilityLabel="城市" value={value} onFocus={() => setOpen(true)}
      onChangeText={(text) => { onChange(text); setOpen(true); }} onSubmitEditing={() => setOpen(false)}
      onBlur={() => setTimeout(() => setOpen(false), 180)}
      autoCapitalize="none" autoCorrect={false} placeholder="输入城市，中文可搜索" placeholderTextColor={p.muted}
      style={{ minHeight: 46, borderWidth: 1, borderColor: p.border, borderRadius: 9, padding: 12, color: p.text, backgroundColor: p.bg }} />
    {suggestions.length > 0 && <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled style={{ maxHeight: 264, borderWidth: 1, borderColor: p.border, borderRadius: 10, backgroundColor: p.card }}>
      {suggestions.map((item) => <Pressable key={item.city} accessibilityRole="button" accessibilityLabel={`选择城市 ${item.city}`}
        onPress={() => { onChange(item.city); setOpen(false); }}
        style={{ minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: p.border }}>
        <Text style={{ color: p.text, fontWeight: "600" }}>{item.city}</Text>
        <Text numberOfLines={1} style={{ color: p.muted, fontSize: 12 }}>{item.label}</Text>
      </Pressable>)}
    </ScrollView>}
  </View>;
}
