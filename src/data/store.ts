import Storage from 'expo-sqlite/kv-store';
import { ConcertEvent } from '@/domain/rules';
import { demoEvents } from '@/data/seed';
const KEY = 'myconcert.events.v1';
export async function loadEvents(): Promise<ConcertEvent[]> { const saved = await Storage.getItem(KEY); if (!saved) { await Storage.setItem(KEY, JSON.stringify(demoEvents)); return demoEvents; } try { return JSON.parse(saved) as ConcertEvent[]; } catch { return demoEvents; } }
export const saveEvents = (events: ConcertEvent[]) => Storage.setItem(KEY, JSON.stringify(events));
