import { ConcertEvent, FoundShow } from "./rules";
import { cityName } from "./city-name";

export const platforms = ["大麦", "猫眼", "秀动", "纷玩岛", "票星球"] as const;
export type Platform = (typeof platforms)[number];

export function artistSuggestions(events: ConcertEvent[], following: string[]) {
  const known = new Set(following.map(normalize));
  return [...new Set(events.flatMap((event) => event.artists.split(/[,，、;；\n]+/).map((name) => name.trim()).filter(Boolean)))]
    .filter((name) => !known.has(normalize(name)))
    .sort((a, b) => a.localeCompare(b, "zh"));
}

const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();
const decode = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (_, entity: string) =>
  ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[entity] || "").trim();
const field = (html: string, name: string) => decode(html.match(new RegExp(`<div class="${name}">([\\s\\S]*?)<\\/div>`))?.[1] || "");

export function parseShowstartList(html: string, artist: string, now = Date.now()): FoundShow[] {
  const found: FoundShow[] = [];
  for (const match of html.matchAll(/<a href="\/event\/(\d+)" class="show-item item"[^>]*>([\s\S]*?)<\/a>/g)) {
    const body = match[2];
    const artists = field(body, "artist").replace(/^艺人：/, "").trim();
    if (!artists.split(/[,，、;；\/]+/).some((name) => normalize(name) === normalize(artist))) continue;
    const title = field(body, "title");
    const time = field(body, "time").match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
    const address = field(body, "addr").match(/^\[([^\]]+)\](.+)$/);
    if (!title || !time || !address) continue;
    const startAt = new Date(`${time[1]}-${time[2].padStart(2, "0")}-${time[3].padStart(2, "0")}T${time[4].padStart(2, "0")}:${time[5]}:00+08:00`);
    if (!Number.isFinite(+startAt) || +startAt <= now) continue;
    found.push({ title, artists, city: address[1].trim(), venue: address[2].trim(), startAt: startAt.toISOString(), platform: "秀动", url: `https://www.showstart.com/event/${match[1]}` });
  }
  return found;
}

type MaoyanList = {
  code?: number;
  data?: { performanceId?: number; name?: string; cityName?: string; shopName?: string; showTimeRange?: string }[];
  paging?: { hasMore?: boolean };
};

export function parseMaoyanList(payload: MaoyanList, artist: string, now = Date.now()): FoundShow[] {
  if (payload.code !== 200 || !Array.isArray(payload.data)) throw new Error("猫眼返回了无法识别的列表");
  return payload.data.flatMap((item) => {
    const title = item.name?.trim() || "";
    const timeRange = item.showTimeRange || "";
    const time = timeRange.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!normalize(title).includes(normalize(artist)) || /致敬|翻唱|模仿|tribute/i.test(title) || !time || /\s[-/]\s/.test(timeRange) || !item.performanceId) return [];
    const startAt = new Date(`${time[1]}-${time[2].padStart(2, "0")}-${time[3].padStart(2, "0")}T${time[4].padStart(2, "0")}:${time[5]}:00+08:00`);
    if (!Number.isFinite(+startAt) || +startAt <= now) return [];
    return [{ title, artists: artist, city: item.cityName?.trim() || "", venue: item.shopName?.trim() || "", startAt: startAt.toISOString(), platform: "猫眼", url: `https://show.maoyan.com/detail/${item.performanceId}` }];
  });
}

export function searchUrl(platform: Platform, artist: string) {
  const query = encodeURIComponent(artist);
  switch (platform) {
    case "大麦": return `https://search.damai.cn/search.html?keyword=${query}`;
    case "猫眼": return "https://show.maoyan.com/index";
    case "秀动": return `https://www.showstart.com/event/list?keyword=${query}`;
    case "纷玩岛": return "https://mobile.livelab.com.cn/";
    case "票星球": return "https://m.piaoxingqiu.com/";
  }
}

export async function searchPlatform(platform: Platform, artists: string[], now = Date.now()): Promise<FoundShow[]> {
  if (platform !== "秀动" && platform !== "猫眼") throw new Error("当前客户端无法验证此平台的公开关键词结果");
  const results: FoundShow[] = [];
  for (const artist of artists) {
    let page = 1;
    while (page <= 100) {
      const url = platform === "秀动"
        ? searchUrl(platform, artist) + `&pageNo=${page}`
        : `https://m.dianping.com/myshow/ajax/performances/0;st=0;k=${encodeURIComponent(artist)};p=${page};s=20;tft=0?cityId=10&sellChannel=7`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let response: Response;
      try {
        response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } finally { clearTimeout(timer); }
      if (platform === "猫眼") {
        const payload = await response.json() as MaoyanList;
        results.push(...parseMaoyanList(payload, artist, now));
        if (typeof payload.paging?.hasMore !== "boolean") throw new Error("猫眼分页状态缺失，结果可能不完整");
        if (!payload.paging?.hasMore) break;
      } else {
        const html = await response.text();
        results.push(...parseShowstartList(html, artist, now));
        if (!/class="btn-next"/.test(html) || /<button[^>]*disabled="disabled"[^>]*class="btn-next"/.test(html)) break;
      }
      page++;
    }
    if (page > 100) throw new Error(`${platform}结果超过当前安全分页上限`);
  }
  return [...new Map(results.map((item) => [item.url, item])).values()];
}

export type GroupedShow = Omit<FoundShow, "platform" | "url"> & { links: { platform: string; url: string }[] };
export function groupShows(results: FoundShow[], now = Date.now()): GroupedShow[] {
  const groups: GroupedShow[] = [];
  for (const show of results) {
    if (+new Date(show.startAt) <= now) continue;
    const names = show.artists.split(/[,，、;；\/]+/).map(normalize);
    const group = groups.find((item) => item.links.some((link) => link.url === show.url) ||
      (!!show.city && !!show.venue && item.startAt === show.startAt && normalize(cityName(item.city)) === normalize(cityName(show.city)) && normalize(item.venue) === normalize(show.venue) &&
        item.artists.split(/[,，、;；\/]+/).some((name) => names.includes(normalize(name)))));
    if (group) {
      if (!group.links.some((link) => link.url === show.url)) group.links.push({ platform: show.platform, url: show.url });
    } else groups.push({ title: show.title, artists: show.artists, city: show.city, venue: show.venue, startAt: show.startAt, links: [{ platform: show.platform, url: show.url }] });
  }
  return groups.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
