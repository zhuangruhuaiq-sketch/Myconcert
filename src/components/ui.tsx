import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useData } from "@/data/context";
import { ConcertEvent } from "@/domain/rules";
export const tabs = [
  ["/", "日历"],
  ["/edit", "添加"],
  ["/search", "搜索"],
  ["/stats", "统计"],
  ["/cities", "地图"],
  ["/settings", "我的"],
] as const;
export function usePalette() {
  const { dark } = useData();
  return dark
    ? {
        bg: "#171421",
        card: "#292337",
        text: "#f3edf9",
        muted: "#c4bbd5",
        border: "#5b506f",
        accent: "#bca6ff",
      }
    : {
        bg: "#f5f2fa",
        card: "#ffffff",
        text: "#282033",
        muted: "#665c75",
        border: "#c8bed7",
        accent: "#6947c2",
      };
}
export function Label({
  children,
  muted = false,
  large = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
}) {
  const p = usePalette();
  return (
    <Text
      selectable
      style={{
        color: muted ? p.muted : p.text,
        fontSize: large ? 23 : 15,
        fontWeight: large ? "700" : "400",
        lineHeight: large ? 30 : 23,
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  danger = false,
}: {
  title: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const p = usePalette();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || pending }}
        disabled={disabled || pending}
        onPress={async () => {
          if (lock.current) return;
          lock.current = true;
          setPending(true);
          setError("");
          try {
            await onPress();
          } catch (e) {
            setError(String(e));
          } finally {
            lock.current = false;
            setPending(false);
          }
        }}
        style={({ pressed }) => ({
          minHeight: 46,
          justifyContent: "center",
          padding: 12,
          backgroundColor: danger ? "#a72f4e" : p.accent,
          borderRadius: 10,
          opacity: disabled || pending ? 0.45 : pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            color: p.accent === "#bca6ff" && !danger ? "#221834" : "#fff",
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {pending ? "处理中…" : title}
        </Text>
      </Pressable>
      {error ? <Label>{error}；请重试。</Label> : null}
    </View>
  );
}
export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: p.card,
        gap: 12,
      }}
    >
      {title && <Label large>{title}</Label>}
      {children}
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: 5 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        autoCapitalize="none"
        style={{
          minHeight: multiline ? 110 : 46,
          borderWidth: 1,
          borderColor: p.border,
          borderRadius: 9,
          padding: 12,
          color: p.text,
          backgroundColor: p.bg,
          textAlignVertical: "top",
        }}
      />
    </View>
  );
}
export function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((x) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: x === value }}
            accessibilityLabel={label + "：" + x}
            key={x}
            onPress={() => onChange(x)}
            style={{
              minHeight: 44,
              padding: 11,
              borderWidth: 1,
              borderColor: p.border,
              borderRadius: 10,
              backgroundColor: x === value ? p.accent : p.card,
            }}
          >
            <Text
              style={{
                color:
                  x === value
                    ? p.accent === "#bca6ff"
                      ? "#221834"
                      : "#fff"
                    : p.text,
              }}
            >
              {x}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button title={title} danger onPress={() => setOpen(true)} />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0009",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card title={title}>
            <Label>{description}</Label>
            <Button
              title="确认操作"
              danger
              onPress={async () => {
                await onConfirm();
                setOpen(false);
              }}
            />
            <Button title="取消" onPress={() => setOpen(false)} />
          </Card>
        </View>
      </Modal>
    </>
  );
}
export function Screen({
  title,
  children,
  back = false,
}: {
  title: string;
  children: React.ReactNode;
  back?: boolean;
}) {
  const p = usePalette();
  const { ready, error, raw, reload } = useData();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 850,
          alignSelf: "center",
          padding: 18,
          gap: 14,
          paddingBottom: 30,
        }}
      >
        <View style={{ gap: 6 }}>
          <Label large>Myconcert</Label>
          <Label muted>本地模式 · {title}</Label>
        </View>
        {back && (
          <Button
            title="返回"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/");
            }}
          />
        )}
        {!ready ? (
          <Card title={error ? "数据加载失败" : "正在读取记录…"}>
            <Label>{error || "请稍候，加载完成后即可操作。"}</Label>
            {!!error && <Button title="重试加载" onPress={reload} />}
            {raw ? (
              <>
                <Label>原始数据（请复制保存，用于恢复）</Label>
                <TextInput
                  accessibilityLabel="恢复数据"
                  value={raw}
                  multiline
                  editable={false}
                  style={{ height: 180, color: p.text }}
                />
              </>
            ) : null}
          </Card>
        ) : (
          children
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          backgroundColor: p.card,
        }}
      >
        {tabs.map(([path, label]) => (
          <Pressable
            key={path}
            accessibilityRole="button"
            accessibilityLabel={"导航：" + label}
            onPress={() => router.navigate(path as Href)}
            style={{
              flex: 1,
              minHeight: 54,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: p.text }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
export function Rows({ events }: { events: ConcertEvent[] }) {
  const p = usePalette();
  const { clock } = useData();
  return (
    <View style={{ gap: 10 }}>
      {events.length === 0 && (
        <Label muted>没有匹配的演出，可调整筛选或添加记录。</Label>
      )}
      {events.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={"查看 " + e.title}
          onPress={() =>
            router.push({ pathname: "/event/[id]", params: { id: e.id } })
          }
          style={{
            minHeight: 72,
            borderLeftWidth: 5,
            borderColor: e.color,
            padding: 12,
            backgroundColor: p.card,
            borderRadius: 8,
          }}
        >
          <Label>{e.title}</Label>
          <Label muted>
            {new Date(e.startAt).toLocaleString()} · {e.city} · {e.venue}
          </Label>
          <Label muted>{e.status}{new Date(e.endAt).getTime() <= clock && !["已观看", "已取消"].includes(e.status) ? " · 已结束，待补充记录" : ""}</Label>
        </Pressable>
      ))}
    </View>
  );
}
