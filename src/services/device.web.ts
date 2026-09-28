import { Backup, ConcertEvent, Media } from "@/domain/rules";
function choose(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
const dataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
export async function readImport() {
  const file = await choose(".json,.csv,.ics");
  return file ? { name: file.name, text: await file.text() } : null;
}
export async function exportFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function pickMedia(role: string): Promise<Media | null> {
  const file = await choose(role === "海报" ? "image/*" : "image/*,video/*");
  if (!file) return null;
  if (role === "海报" && !file.type.startsWith("image/")) throw new Error("海报请选择图片文件");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("浏览器附件限 20 MB，请压缩后重试");
  return {
    id: crypto.randomUUID(),
    uri: await dataUri(file),
    name: file.name,
    kind: file.type.startsWith("video") ? "video" : "image",
    role,
  };
}
export async function portableBackup(backup: Backup) {
  return backup;
}
export async function materialize(events: ConcertEvent[]) {
  if (events.some((e) => e.media?.some((m) => !m.uri.startsWith("data:"))))
    throw new Error("备份含其他设备的文件路径，请在原设备导出完整 JSON 备份");
  return events;
}
export async function systemCalendar(e: ConcertEvent) {
  const { toIcs } = await import("@/domain/exchange");
  await exportFile("myconcert-event.ics", toIcs([e]), "text/calendar");
  return "已下载 ICS，请打开文件导入系统日历";
}
export async function cancelReminders(_id: string) {
  /* Web does not register native notifications. */
}
export async function activateReminders(_e: ConcertEvent): Promise<string> {
  throw new Error(
    "浏览器不支持此应用的后台提醒。设置已保留，请使用移动端启用或导出 ICS。",
  );
}
