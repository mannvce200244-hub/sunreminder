export const STORAGE_KEY = 'sunreminder.data.v2';
export const defaults = () => ({ Settings: { IntervalMinutes: 20, BreakSeconds: 20, SnoozeMinutes: 5, Popups: true, Sound: false, MinimizeToTray: true, MorningReminder: false, MorningHour: 7, MorningMinute: 30 }, Breaks: [], OutdoorDays: [], LastMorningNotification: null });
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function validateData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.Settings || typeof value.Settings !== 'object' || Array.isArray(value.Settings) || !Array.isArray(value.Breaks) || !Array.isArray(value.OutdoorDays)) throw new Error('File cần có Settings, Breaks và OutdoorDays theo định dạng SunReminder.');
  const data = structuredClone(value), settings = { ...defaults().Settings, ...value.Settings };
  for (const [key, min, max] of [['IntervalMinutes',5,120],['BreakSeconds',20,120],['SnoozeMinutes',1,30],['MorningHour',0,23],['MorningMinute',0,59]]) {
    if (!Number.isInteger(settings[key]) || settings[key]<min || settings[key]>max) throw new Error(`Giá trị ${key} không hợp lệ (${min}–${max}).`);
  }
  for (const key of ['Popups','Sound','MinimizeToTray','MorningReminder']) if (typeof settings[key] !== 'boolean') throw new Error(`Giá trị ${key} không hợp lệ.`);
  for (const item of data.Breaks) if (!item || typeof item.CompletedAt !== 'string' || !Number.isFinite(Date.parse(item.CompletedAt)) || !Number.isInteger(item.DurationSeconds) || item.DurationSeconds < 20 || item.DurationSeconds > 120) throw new Error('Một bản ghi nghỉ mắt không hợp lệ. Chưa nhập dữ liệu.');
  for (const day of data.OutdoorDays) if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day) throw new Error('Ngày check-in không hợp lệ.');
  if (data.LastMorningNotification != null && (typeof data.LastMorningNotification !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.LastMorningNotification))) throw new Error('Ngày nhắc ngoài trời không hợp lệ.');
  data.Settings = settings; data.OutdoorDays = [...new Set(data.OutdoorDays)]; return data;
}
export function mergeData(current, incoming) {
  const data = validateData(incoming);
  // Keep multiplicity of identical existing records, while making repeated imports idempotent.
  const key = r => `${Date.parse(r.CompletedAt)}:${r.DurationSeconds}`;
  const counts = new Map(); for (const r of current.Breaks) counts.set(key(r), (counts.get(key(r)) || 0) + 1);
  const seen = new Map(); const added = data.Breaks.filter(r => { const k=key(r); seen.set(k,(seen.get(k)||0)+1); return seen.get(k)>(counts.get(k)||0); });
  return { ...current, ...data, Breaks: [...current.Breaks, ...added], OutdoorDays: [...new Set([...current.OutdoorDays,...data.OutdoorDays])] };
}
export function csv(data) { return '\uFEFFCompletedAt,DurationSeconds\r\n' + [...data.Breaks].sort((a,b)=>Date.parse(b.CompletedAt)-Date.parse(a.CompletedAt)).map(r=>`${new Date(r.CompletedAt).toISOString()},${r.DurationSeconds}`).join('\r\n'); }
