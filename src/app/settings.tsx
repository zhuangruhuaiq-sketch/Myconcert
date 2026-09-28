import { useState } from "react";
import { useData } from "@/data/context";
import {
  Button,
  Card,
  Choices,
  Confirm,
  Field,
  Label,
  Screen,
} from "@/components/ui";
import {
  Format,
  importPreview,
  mergeEvents,
  Preview,
  toCsv,
  toIcs,
} from "@/domain/exchange";
import {
  cancelReminders,
  exportFile,
  materialize,
  portableBackup,
  readImport,
} from "@/services/device";
export default function Settings() {
  const { data, change, busy } = useData();
  const [format, setFormat] = useState<Format>("json");
  const [exportFormat, setExportFormat] = useState<Format>("json");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [policy, setPolicy] = useState<"skip" | "replace">("skip");
  const [restoreTheme, setRestoreTheme] = useState("保留当前主题");
  const [message, setMessage] = useState("");
  async function download(kind: Format) {
    const b =
      kind === "json" || kind === "csv" ? await portableBackup(data) : data;
    const content =
      kind === "json"
        ? JSON.stringify(b, null, 2)
        : kind === "csv"
          ? toCsv(b.events)
          : toIcs(b.events);
    await exportFile(
      "myconcert." + kind,
      content,
      kind === "json"
        ? "application/json"
        : kind === "csv"
          ? "text/csv"
          : "text/calendar",
    );
    setMessage("已交给系统下载或分享面板；请确认文件已保存。");
  }
  return (
    <Screen title="我的与设置">
      <Card title="外观">
        <Choices
          label="主题"
          value={data.preferences.theme}
          options={["system", "light", "dark"] as const}
          onChange={(theme) => {
            void change((b) => ({
              ...b,
              preferences: { ...b.preferences, theme },
            })).catch((e) => setMessage(String(e)));
          }}
        />
        <Label muted>system 跟随系统 · light 浅色 · dark 深色</Label>
      </Card>
      <Card title="导出备份">
        <Label>
          JSON 包含设置与附件内容，适合完整备份。CSV 包含演出记录和附件；ICS
          只交换公开行程，不含订单、取票码及详细地址。
        </Label>
        <Choices label="导出格式" value={exportFormat} options={["json", "csv", "ics"]} onChange={setExportFormat} />
        <Button title={"导出 " + exportFormat.toUpperCase()} onPress={() => download(exportFormat)} />
      </Card>
      {!!message && (
        <Card>
          <Label>{message}</Label>
        </Card>
      )}
      <Card title="导入">
        <Choices
          label="文件格式"
          value={format}
          options={["json", "csv", "ics"] as const}
          onChange={(v) => {
            setFormat(v);
            setPreview(null);
          }}
        />
        <Button
          title="选择导入文件"
          onPress={async () => {
            const result = await readImport();
            if (!result) return;
            const extension = result.name.split(".").pop()?.toLowerCase();
            if (!["json", "csv", "ics"].includes(extension || ""))
              throw new Error("请选择 JSON、CSV 或 ICS 文件");
            const kind = extension as Format;
            setInput(result.text);
            setFormat(kind);
            setPreview(importPreview(result.text, kind));
          }}
        />
        <Field
          label="或粘贴导入内容"
          value={input}
          multiline
          onChange={(v) => {
            setInput(v);
            setPreview(null);
          }}
        />
        <Button
          title="预览导入"
          onPress={() => setPreview(importPreview(input, format))}
        />
        {preview && (
          <>
            <Label>
              可导入 {preview.events.length} 条；错误 {preview.errors.length}{" "}
              条；与现有记录重复{" "}
              {
                preview.events.filter((e) =>
                  data.events.some((x) => x.id === e.id),
                ).length
              }{" "}
              条。
            </Label>
            {preview.errors.map((e, i) => (
              <Label key={i}>{e}</Label>
            ))}
            {preview.events.map((e) => (
              <Label key={e.id}>
                {e.title} · {new Date(e.startAt).toLocaleString()}
              </Label>
            ))}
            <Choices
              label="重复 ID 处理"
              value={policy}
              options={["skip", "replace"]}
              onChange={setPolicy}
            />
            <Label muted>skip 跳过已有记录 · replace 用导入内容替换</Label>
            {preview.preferences && (
              <Choices
                label="主题设置"
                value={restoreTheme}
                options={["保留当前主题", "恢复备份主题"]}
                onChange={setRestoreTheme}
              />
            )}
            <Label muted>
              只导入上方通过校验的记录。导入提醒不会自动启用，请到详情确认。
            </Label>
            <Button
              title="确认导入有效记录"
              disabled={busy || preview.events.length === 0}
              onPress={async () => {
                const incoming = await materialize(
                  policy === "skip"
                    ? preview.events.filter(
                        (e) => !data.events.some((x) => x.id === e.id),
                      )
                    : preview.events,
                );
                if (policy === "replace")
                  for (const e of incoming)
                    if (data.events.some((x) => x.id === e.id))
                      await cancelReminders(e.id);
                await change((b) => ({
                  ...b,
                  events: mergeEvents(b.events, incoming, policy),
                  preferences:
                    restoreTheme === "恢复备份主题" && preview.preferences
                      ? preview.preferences
                      : b.preferences,
                }));
                setMessage("导入完成，记录已保存。重复记录处理方式：" + policy);
                setPreview(null);
                setInput("");
              }}
            />
          </>
        )}
      </Card>
      <Card title="功能与隐私">
        <Label>
          本地模式：尚未实现账户登录与云同步，填写密钥也不会自动启用。记录默认仅在本机，备份文件由你自行保管。
        </Label>
        <Label>
          OCR、公开链接解析尚未接入。地图内置世界地理数据、中国城市行政区域和常用城市坐标；在线街道细节来自 OpenStreetMap，未收录城市通过 Photon 查询。海外城市边界通过 Overpass 按城市名称和城市中心坐标查询并缓存，不发送演出内容或手机定位。
          查询仅发送城市名，不发送演出详情、备注或附件；无需定位权限。网络不可用时仍可浏览内置底图和城市档案。
        </Label>
        <Label>
          原生小组件及分享图片尚未实现。详情支持 myconcert://event/演出ID
          深链接。
        </Label>
        <Confirm
          title="删除所有本地演出"
          description="会删除本机演出记录；请先导出备份。附件文件和迁移备份可能仍留在应用空间，彻底清除请使用系统清除应用数据。"
          onConfirm={async () => {
            for (const e of data.events) await cancelReminders(e.id);
            await change((b) => ({ ...b, events: [] }));
            setMessage("本机演出已删除");
          }}
        />
      </Card>
    </Screen>
  );
}
