import assert from "node:assert/strict";
import test from "node:test";
import { extractTicketUrl, fetchTicketPage, parseTicketPage } from "../src/domain/ticket-link";

test("extracts ticket URLs from platform share messages", () => {
  const damai = "https://m.damai.cn/shows/item.html?itemId=1082875487224&from=appshare";
  const showstart = "https://wap.showstart.com/pages/activity/detail/detail?activityId=311136&ssfrom=user-5900";
  const maoyan = "https://show.maoyan.com/qqw?nonce=abc#/detail/507721";
  const fenwandao = "https://mobile.livelab.com.cn/hppreview/pages/buyTickets/step1?channel=weibo&id=524&type=1";
  const piaoxingqiu = "https://m.piaoxingqiu.com/content/6aab913610a4710001cf6630?from=share";
  assert.equal(extractTicketUrl(`【大麦】演出分享：${damai} 复制链接打开`), damai);
  assert.equal(extractTicketUrl(`秀动｜${showstart}，快来看！`), showstart);
  assert.equal(extractTicketUrl(`猫眼演出：(${maoyan})`), maoyan);
  assert.equal(extractTicketUrl(`纷玩岛 ${fenwandao}复制打开`), fenwandao);
  assert.equal(extractTicketUrl(`[票星球](${piaoxingqiu})`), piaoxingqiu);
  assert.equal(extractTicketUrl(`活动 https://example.com/promo 查看：${damai}`), damai);
  assert.throws(() => extractTicketUrl("【大麦】复制口令打开应用"), /HTTPS/);
});

test("reads Damai details and leaves ambiguous sessions unset", () => {
  const html = `<div id="staticDataDefault">${JSON.stringify({
    itemBase: { itemName: "【上海】测试演唱会", cityName: "上海市", guideCat: "演唱会", showTime: "2026.10.01 周四 19:30", itemPic: "https://example.com/poster.jpg" },
    venue: { venueName: "测试体育馆" },
    noticeMatter: { noticeList: [{ ticketNoteList: [{ title: "主要演员", content: "测试歌手" }] }] },
  })}</div>`;
  assert.deepEqual(parseTicketPage("https://detail.damai.cn/item.htm?id=1", html), {
    title: "【上海】测试演唱会", artists: "测试歌手", city: "上海市", venue: "测试体育馆",
    type: "演唱会", start: "2026-10-01T19:30", poster: "https://example.com/poster.jpg", platform: "大麦",
  });
  assert.equal(parseTicketPage("https://detail.damai.cn/item.htm?id=1", html.replace("2026.10.01 周四 19:30", "2026.10.01 19:30 / 2026.10.02 19:30")).start, undefined);
});

test("Damai app share link opens the data page instead of accepting a mobile shell", async () => {
  const original = globalThis.fetch;
  let requested = "";
  let requestedHeaders: HeadersInit | undefined;
  const html = `<div id="staticDataDefault">${JSON.stringify({
    itemBase: { itemName: "【上海】mj apanay「time machine」2026中国巡演 上海站", cityName: "上海市", guideCat: "Livehouse", showTime: "2026.11.08 周日 13:30", itemPic: "https://example.com/poster.png" },
    venue: { venueName: "瓦肆 VAS ear(普陀沪西店)" },
  })}</div>`;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    requested = String(url);
    requestedHeaders = options?.headers;
    return new Response(new Headers(options?.headers).get("User-Agent")?.includes("Windows NT") ? html : "<title>商品详情</title>");
  }) as typeof fetch;
  try {
    const details = await fetchTicketPage("【大麦】分享演出 https://m.damai.cn/shows/item.html?itemId=1082875487224&from=appshare 复制打开", true);
    assert.equal(requested, "https://detail.damai.cn/item.htm?id=1082875487224");
    assert.match(new Headers(requestedHeaders).get("User-Agent") || "", /Windows NT/);
    assert.equal(details.artists, "mj apanay");
    assert.equal(details.start, "2026-11-08T13:30");
    assert.equal(details.venue, "瓦肆 VAS ear(普陀沪西店)");
    globalThis.fetch = (async () => new Response("<title>商品详情</title>")) as typeof fetch;
    await assert.rejects(fetchTicketPage("https://m.damai.cn/shows/item.html?itemId=1082875487224"), /没有可识别/);
  } finally { globalThis.fetch = original; }
});

test("reads generic event metadata", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "MusicEvent", name: "测试音乐会", startDate: "2026-11-01T20:00:00+08:00", performer: { name: "某歌手" }, location: { name: "某场馆", address: { addressLocality: "南京" } }, image: "https://example.com/a.jpg" })}</script>`;
  const result = parseTicketPage("https://showstart.com/event/1", html);
  assert.equal(result.artists, "某歌手");
  assert.equal(result.start, "2026-11-01T20:00");
  assert.equal(result.poster, "https://example.com/a.jpg");
});

test("reads Showstart page data and its first performance time", () => {
  const html = `<script>window.__NUXT__=(function(){return {data:[{detail:{title:"2026 测试巡演",poster:"https:\\u002F\\u002Fexample.com\\u002Fposter.jpg",showTime:"04月24日 20:00-04月24日 22:00",performers:[{name:"甲"},{name:"乙"}],site:{name:"测试场馆",cityName:"上海"},styles:"独立",tickets:[],video:[]}}]}})();</script>`;
  assert.deepEqual(parseTicketPage("https://www.showstart.com/event/123", html), {
    title: "2026 测试巡演", artists: "甲、乙", city: "上海", venue: "测试场馆",
    start: "2026-04-24T20:00", poster: "https://example.com/poster.jpg", platform: "秀动",
  });
});

test("Showstart mobile share link requests its populated desktop page", async () => {
  const original = globalThis.fetch;
  const html = `<script>window.__NUXT__=(function(){return {data:[{detail:{title:"2026 测试巡演",poster:"https://example.com/poster.jpg",showTime:"10月01日 20:00-10月01日 22:00",performers:[{name:"甲"}],site:{name:"测试场馆",cityName:"上海"},styles:"独立",video:[]}}]}})();</script>`;
  let requested = "";
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    requested = String(url);
    return new Response(new Headers(options?.headers).get("User-Agent")?.includes("Windows NT") ? html : "<title>秀动-showstart</title>");
  }) as typeof fetch;
  try {
    const details = await fetchTicketPage("https://wap.showstart.com/pages/activity/detail/detail?activityId=311136&ssfrom=app", true);
    assert.equal(requested, "https://www.showstart.com/event/311136");
    assert.equal(details.title, "2026 测试巡演");
    assert.equal(details.artists, "甲");
    assert.equal(details.start, "2026-10-01T20:00");
  } finally { globalThis.fetch = original; }
});

test("reads Maoyan share links from its public detail page", async () => {
  const original = globalThis.fetch;
  let requested = "";
  globalThis.fetch = (async (url: string | URL | Request) => {
    requested = String(url);
    return new Response(`<script>__NEXT_DATA__ = ${JSON.stringify({ props: { pageProps: { detail: { performanceId: 507721, name: "测试演唱会", cityName: "上海", shopName: "测试场馆", posterUrl: "https://example.com/poster.jpg", showTimeRange: "2026.10.17 19:00 周六", categoryId: 1 } } } })}\nmodule={}</script>`);
  }) as typeof fetch;
  try {
    const details = await fetchTicketPage("https://show.maoyan.com/qqw#/detail/507721");
    assert.equal(requested, "https://show.maoyan.com/detail/507721");
    assert.equal(details.start, "2026-10-17T19:00");
    assert.equal(details.poster, "https://example.com/poster.jpg");
  } finally { globalThis.fetch = original; }
});

test("uses public project APIs when Fenwandao and Piaoxingqiu allow access", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const isFenwandao = String(url).includes("livelab.com.cn");
    return Response.json({ data: isFenwandao ? { projectName: "岛上演出", cityName: "广州" } : { showName: "星球演出", cityName: "北京" } });
  }) as typeof fetch;
  try {
    assert.equal((await fetchTicketPage("https://mobile.livelab.com.cn/hppreview/pages/buyTickets/step1?id=554")).title, "岛上演出");
    assert.equal((await fetchTicketPage("https://m.piaoxingqiu.com/content/67b82a60e97a510001808931")).title, "星球演出");
  } finally { globalThis.fetch = original; }
});

test("Fenwandao mobile link reads the H5 project endpoint and its real field names", async () => {
  const original = globalThis.fetch;
  let requested = "";
  globalThis.fetch = (async (url: string | URL | Request) => {
    requested = String(url);
    return Response.json({ code: 10000, data: {
      projectName: "测试演唱会", projectCity: "上海", venueInfo: { name: "测试体育馆" },
      poster: "https://example.com/poster.jpg", timeDisplay: "2026.11.08 19:30",
      subClassifyName: "演唱会", watchNotices: [{ name: "主要演员", content: "测试歌手" }],
    } });
  }) as typeof fetch;
  try {
    const details = await fetchTicketPage("https://mobile.livelab.com.cn/hppreview/pages/buyTickets/step1?channel=weibo&id=524&type=1", true);
    assert.equal(requested, "https://mobile.livelab.com.cn/api/performance/app/project/h5/get_project_info?project_id=524");
    assert.deepEqual(details, { title: "测试演唱会", city: "上海", venue: "测试体育馆", poster: "https://example.com/poster.jpg", start: "2026-11-08T19:30", artists: "测试歌手", type: "演唱会", platform: "纷玩岛" });
  } finally { globalThis.fetch = original; }
});

test("Piaoxingqiu tries its public alternate host when the share host is rate limited", async () => {
  const original = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    requested.push(String(url));
    if (String(url).startsWith("https://e.piaoxingqiu.com/cyy_gatewayapi/"))
      return Response.json({ statusCode: 200, data: {
        showName: "【武汉】测试演唱会", cityName: "武汉市", venueName: "测试体育场",
        posterUrl: "https://example.com/poster.jpg", showDate: "2026年10月01日 19:00",
        showType: { displayName: "演唱会" },
      } });
    return new Response("你的操作太快了", { status: 469 });
  }) as typeof fetch;
  try {
    const details = await fetchTicketPage("https://m.piaoxingqiu.com/content/6a58b4493b2871000179508c", true);
    assert.deepEqual(requested, [
      "https://m.piaoxingqiu.com/cyy_gatewayapi/show/pub/v3/show_static_data/6a58b4493b2871000179508c?locationCityId=&siteId=",
      "https://e.piaoxingqiu.com/cyy_gatewayapi/show/pub/v3/show_static_data/6a58b4493b2871000179508c?locationCityId=&siteId=",
    ]);
    assert.deepEqual(details, { title: "【武汉】测试演唱会", city: "武汉市", venue: "测试体育场", poster: "https://example.com/poster.jpg", start: "2026-10-01T19:00", artists: "", type: "演唱会", platform: "票星球" });
  } finally { globalThis.fetch = original; }
});
