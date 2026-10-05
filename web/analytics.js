import { dayKey } from './data.js';
export const CONSENT_VERSION = 'group4-stats-v1';
// A completed break IS an eye-rest check-in. Outdoor check-ins remain separate.
export function dailyStats(data) {
  const days = new Map();
  const row = day => { if (!days.has(day)) days.set(day,{day,breakCount:0,restSeconds:0,outdoor:false});return days.get(day); };
  for (const record of data.Breaks) {const item=row(dayKey(new Date(record.CompletedAt)));item.breakCount++;item.restSeconds+=record.DurationSeconds;}
  for (const day of data.OutdoorDays) row(day).outdoor=true;
  return [...days.values()].sort((a,b)=>a.day.localeCompare(b.day));
}
