import { EventType, eventTypes } from "./rules";

export type TicketDetails = {
  title?: string;
  artists?: string;
  city?: string;
  venue?: string;
  type?: EventType;
  start?: string;
  poster?: string;
  platform?: string;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : "";

function meta(html: string, key: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (!new RegExp(`(?:property|name)=["']${key}["']`, "i").test(tag)) continue;
    return clean(tag.match(/content=["']([^"']*)["']/i)?.[1]);
  }
  return "";
}

function time(value: string) {
  const dates = value.match(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/g) || [];
  if (dates.length !== 1) return undefined;
  const clocks = [...value.matchAll(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?=\s|$|[+-]\d{2}:\d{2})/g)];
  if (clocks.length !== 1) return undefined;
  const clock = clocks[0];
  const [year, month, day] = dates[0].split(/[.\/-]/).map(Number);
  const local = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${clock[1].padStart(2, "0")}:${clock[2]}`;
  const date = new Date(local);
  return Number.isFinite(+date) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? local : undefined;
}

function schemaDetails(html: string): TicketDetails {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    try {
      const raw = JSON.parse(script.replace(/^.*?>/, "").replace(/<\/script>$/i, ""));
      const items = Array.isArray(raw) ? raw : raw["@graph"] || [raw];
      const event = items.find((item: Record<string, unknown>) => String(item["@type"]).includes("Event"));
      if (!event) continue;
      const location = event.location || {};
      const performer = Array.isArray(event.performer) ? event.performer : event.performer ? [event.performer] : [];
      const start = typeof event.startDate === "string" ? time(event.startDate.replace("T", " ")) : undefined;
      return {
        title: clean(event.name),
        artists: performer.map((p: { name?: string } | string) => clean(typeof p === "string" ? p : p.name)).filter(Boolean).join("、"),
        city: clean(location.address?.addressLocality),
        venue: clean(location.name),
        start,
        poster: typeof event.image === "string" ? event.image : Array.isArray(event.image) ? event.image[0] : undefined,
      };
    } catch { /* Ignore invalid page metadata. */ }
  }
  return {};
}

const jsString = (source: string, key: string) => {
  const escaped = source.match(new RegExp(`${key}:"((?:\\\\.|[^"\\\\])*)"`))?.[1];
  if (!escaped) return "";
  try { return JSON.parse('"' + escaped + '"'); }
  catch { return ""; }
};

function showstartDetails(html: string): TicketDetails {
  const detail = html.match(/window\.__NUXT__=[\s\S]*?detail:\{([\s\S]*?),video:/)?.[1];
  if (!detail) return {};
  const title = jsString(detail, "title");
  const showTime = jsString(detail, "showTime");
  const year = [...new Set(title.match(/20\d{2}/g) || [])];
  const first = showTime.match(/(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})/);
  const start = time(showTime) || (year.length === 1 && first ? time(`${year[0]}.${first[1]}.${first[2]} ${first[3]}:${first[4]}`) : undefined);
  const performers = detail.match(/performers:\[([\s\S]*?)\],site:/)?.[1] || "";
  const site = detail.match(/site:\{([\s\S]*?)\},styles:/)?.[1] || "";
  return {
    title,
    artists: [...performers.matchAll(/\bname:"((?:\\.|[^"\\])*)"/g)].map((match) => {
      try { return JSON.parse('"' + match[1] + '"'); } catch { return ""; }
    }).filter(Boolean).join("、"),
    city: jsString(site, "cityName"),
    venue: jsString(site, "name"),
    start,
    poster: jsString(detail, "poster"),
  };
}

function maoyanDetails(html: string): TicketDetails {
  const payload = html.match(/__NEXT_DATA__\s*=\s*({[\s\S]*?})\s+module=/)?.[1];
  if (!payload) return {};
  try {
    const detail = JSON.parse(payload).props?.pageProps?.detail;
    if (!detail?.performanceId) return {};
    return {
      title: clean(detail.name),
      city: clean(detail.cityName),
      venue: clean(detail.shopName),
      type: detail.categoryId === 1 ? "演唱会" : undefined,
      start: time(clean(detail.showTimeRange)),
      poster: clean(detail.posterUrl),
      artists: Array.isArray(detail.celebrityVOS) ? detail.celebrityVOS.map((artist: { name?: string }) => clean(artist.name)).filter(Boolean).join("、") : undefined,
    };
  } catch { return {}; }
}

function apiDetails(platform: "纷玩岛" | "票星球", data: { data?: Record<string, unknown> }): TicketDetails {
  const detail = data.data || {};
  const poster = (value: unknown) => clean(value).replace(/^http:\/\//i, "https://");
  return platform === "纷玩岛" ? {
    title: clean(detail.projectName), city: clean(detail.projectCity || detail.cityName),
    venue: clean((detail.venueInfo as { name?: string } | undefined)?.name || detail.venueName),
    poster: poster(detail.poster || detail.projectPoster || detail.projectPic),
    start: time(clean(detail.timeDisplay || detail.projectTime || detail.showTime)),
    artists: clean((detail.watchNotices as { name?: string; content?: string }[] | undefined)?.find((note) => note.name === "主要演员")?.content || detail.performer || detail.actorName),
    type: eventTypes.find((type) => type === detail.subClassifyName), platform,
  } : {
    title: clean(detail.showName), city: clean(detail.cityName), venue: clean(detail.venueName),
    poster: poster(detail.posterUrl || detail.showPoster || detail.poster),
    start: time(clean(detail.showDate || detail.showTime).replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, "$1.$2.$3")),
    artists: clean(detail.performer || detail.artistName),
    type: eventTypes.find((type) => type === (detail.showType as { displayName?: string } | undefined)?.displayName), platform,
  };
}

const hasUsefulDetails = (details: TicketDetails) =>
  !!details.title && [details.artists, details.city, details.venue, details.start, details.poster].some(Boolean);

const desktopUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function extractTicketUrl(input: string) {
  const urls = (input.match(/https?:\/\/[^\s<>"'，。！？；、（）()【】《》\u3400-\u9fff]+/gi) || [])
    .map((url) => url.replace(/[.,;!?]+$/, ""))
    .filter((url) => { try { return !!new URL(url).hostname; } catch { return false; } });
  if (!urls.length) throw new Error("请粘贴包含 HTTPS 演出链接的分享内容");
  return urls.find((url) => ["damai.cn", "taopiaopiao.com", "showstart.com", "maoyan.com", "livelab.com.cn", "piaoxingqiu.com", "bilibili.com"]
    .some((domain) => { const host = new URL(url).hostname.toLowerCase(); return host === domain || host.endsWith(`.${domain}`); })) || urls[0];
}

export function parseTicketPage(url: string, html: string): TicketDetails {
  const host = new URL(url).hostname.toLowerCase();
  let result = schemaDetails(html);
  if (host === "www.showstart.com" || host === "showstart.com") result = { ...result, ...showstartDetails(html) };
  if (host === "show.maoyan.com") result = { ...result, ...maoyanDetails(html) };
  if (host === "detail.damai.cn" || host.endsWith(".damai.cn")) {
    const encoded = html.match(/<div id=["']staticDataDefault["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
    if (encoded) {
      try {
        const data = JSON.parse(encoded);
        const base = data.itemBase || {};
        const performer = data.noticeMatter?.noticeList?.flatMap((list: { ticketNoteList?: { title: string; content: string }[] }) => list.ticketNoteList || []).find((note: { title: string }) => note.title === "主要演员")?.content;
        result = {
          ...result,
          title: clean(base.itemName) || result.title,
          artists: clean(performer) || clean(base.itemName).match(/^【[^】]+】\s*([^「《【\d]+?)\s*[「《]/)?.[1]?.trim() || result.artists,
          city: clean(base.cityName || data.venue?.venueCityName) || result.city,
          venue: clean(data.venue?.venueName) || result.venue,
          type: eventTypes.find((type) => type === base.guideCat) || result.type,
          start: time(clean(base.showTime)) || result.start,
          poster: clean(base.itemPic || base.itemPics?.itemPicList?.[0]?.picUrl) || result.poster,
        };
      } catch { /* Fall back to public metadata. */ }
    }
  }
  const platform = host.endsWith("damai.cn") ? "大麦" : host.endsWith("maoyan.com") ? "猫眼" : host.endsWith("showstart.com") ? "秀动" : host.endsWith("livelab.com.cn") ? "纷玩岛" : host.endsWith("piaoxingqiu.com") ? "票星球" : host.endsWith("bilibili.com") ? "哔哩哔哩会员购" : undefined;
  const poster = result.poster || meta(html, "og:image") || meta(html, "twitter:image");
  return {
    ...result,
    title: result.title || meta(html, "og:title") || clean(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]),
    poster: poster && /^https?:\/\//i.test(poster) ? poster.replace(/^http:\/\//i, "https://") : undefined,
    platform,
  };
}

export async function fetchTicketPage(input: string, native = false) {
  let parsed: URL;
  try { parsed = new URL(extractTicketUrl(input)); }
  catch { throw new Error("请粘贴完整的 HTTPS 演出详情链接"); }
  if (parsed.protocol !== "https:") throw new Error("请粘贴 HTTPS 演出详情链接");
  const host = parsed.hostname.toLowerCase();
  if (host === "m.damai.cn" || host === "m.taopiaopiao.com") {
    const id = parsed.searchParams.get("itemId");
    if (id && /^\d+$/.test(id)) parsed = new URL(`https://detail.damai.cn/item.htm?id=${id}`);
  } else if (host === "show.maoyan.com") {
    const id = parsed.hash.match(/^#\/detail\/(\d+)/)?.[1] || parsed.pathname.match(/^\/detail\/(\d+)/)?.[1];
    if (id) parsed = new URL(`https://show.maoyan.com/detail/${id}`);
  } else if (host === "wap.showstart.com") {
    const id = parsed.searchParams.get("activityId");
    if (id && /^\d+$/.test(id)) parsed = new URL(`https://www.showstart.com/event/${id}`);
  } else if (host === "mobile.livelab.com.cn" && parsed.searchParams.get("id")?.match(/^\d+$/)) {
    const id = parsed.searchParams.get("id");
    try {
      const response = await fetch(`https://mobile.livelab.com.cn/api/performance/app/project/h5/get_project_info?project_id=${id}`);
      if (response.ok) {
        const details = apiDetails("纷玩岛", await response.json());
        if (hasUsefulDetails(details)) return details;
      }
    } catch { /* The public page may still have metadata. */ }
  } else if (host === "m.piaoxingqiu.com" || host === "e.piaoxingqiu.com") {
    const id = parsed.searchParams.get("showId") || parsed.pathname.match(/^\/content\/([a-f0-9]{24})/i)?.[1];
    if (id && /^[a-f0-9]{24}$/i.test(id)) {
      for (const domain of [host, host === "m.piaoxingqiu.com" ? "e.piaoxingqiu.com" : "m.piaoxingqiu.com"]) {
        try {
          const response = await fetch(`https://${domain}/cyy_gatewayapi/show/pub/v3/show_static_data/${id}?locationCityId=&siteId=`);
          if (response.ok) {
            const details = apiDetails("票星球", await response.json());
            if (hasUsefulDetails(details)) return details;
          }
        } catch { /* The other public endpoint or page may still work. */ }
      }
    }
  }
  let response: Response;
  try { response = await fetch(parsed.toString(), native && ["detail.damai.cn", "www.showstart.com"].includes(parsed.hostname) ? {
    headers: { "User-Agent": desktopUserAgent },
  } : undefined); }
  catch { throw new Error("无法读取票务页面，可能是网络或平台访问限制；请手动填写"); }
  if (host.endsWith(".piaoxingqiu.com") && response.status === 469) throw new Error("票星球限制了当前访问，请稍后重试或手动填写");
  if (!response.ok) throw new Error(`页面无法读取（HTTP ${response.status}）`);
  const html = await response.text();
  const result = parseTicketPage(response.url || parsed.toString(), html);
  if (["LiveLab", "演出", "秀动-showstart", "商品详情"].includes(result.title || "")) result.title = undefined;
  if (!hasUsefulDetails(result)) {
    if (host === "mobile.livelab.com.cn" || host.endsWith(".piaoxingqiu.com"))
      throw new Error(`${host === "mobile.livelab.com.cn" ? "纷玩岛" : "票星球"}未开放可读取的演出资料，或当前访问受到限制；请手动填写`);
    throw new Error("页面没有可识别的演出信息，请手动填写");
  }
  return result;
}
