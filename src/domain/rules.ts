export type EventStatus = '想看' | '待开票' | '已购票' | '待观看' | '已观看' | '已取消';
export type EventType = '演唱会' | '音乐节' | 'Livehouse' | '话剧' | '音乐剧' | '舞剧' | '脱口秀' | '其他';

export type Expense = { id: string; category: string; amount: number };
export type PreparationItem = { id: string; title: string; done: boolean };
export type ConcertEvent = {
  id: string; title: string; artists: string; type: EventType; startAt: string; endAt: string;
  city: string; venue: string; address?: string; status: EventStatus; saleAt?: string;
  price?: number; currency: string; platform?: string; seat?: string; note?: string; tags: string[];
  rating?: number; review?: string; color: string; expenses: Expense[]; preparation: PreparationItem[];
  createdAt: string; updatedAt: string; sourceUrl?: string;
};

export const eventTypes: EventType[] = ['演唱会', '音乐节', 'Livehouse', '话剧', '音乐剧', '舞剧', '脱口秀', '其他'];
export const statuses: EventStatus[] = ['想看', '待开票', '已购票', '待观看', '已观看', '已取消'];
export const money = (amount = 0) => `¥${(amount / 100).toFixed(2)}`;
export const dayKey = (iso: string) => iso.slice(0, 10);
export const isPast = (event: ConcertEvent, now = new Date()) => new Date(event.endAt) < now;
export const overlap = (a: ConcertEvent, b: ConcertEvent) => a.id !== b.id && new Date(a.startAt) < new Date(b.endAt) && new Date(b.startAt) < new Date(a.endAt);
export const conflictsFor = (event: ConcertEvent, events: ConcertEvent[]) => events.filter((other) => overlap(event, other));
export const totals = (events: ConcertEvent[]) => events.reduce((sum, event) => sum + (event.price || 0) + event.expenses.reduce((n, item) => n + item.amount, 0), 0);
export const toIcs = (events: ConcertEvent[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Myconcert//CN', ...events.flatMap((event) => ['BEGIN:VEVENT', `UID:${event.id}@myconcert`, `DTSTART:${event.startAt.replace(/[-:]/g, '').replace('.000', '')}`, `DTEND:${event.endAt.replace(/[-:]/g, '').replace('.000', '')}`, `SUMMARY:${event.title}`, `LOCATION:${event.venue} ${event.city}`, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
export const toCsv = (events: ConcertEvent[]) => ['名称,艺人,开始时间,结束时间,城市,场馆,状态,票价(分)', ...events.map((e) => [e.title, e.artists, e.startAt, e.endAt, e.city, e.venue, e.status, e.price || 0].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n');
