export const PROFILE_CONSENT_VERSION='group4-profile-v1';
export const PROFILE_SCHEMA='CREATE TABLE IF NOT EXISTS participant_profiles (participant_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE, profile_json TEXT NOT NULL)';
export function profileFromPayload(body){
  if(!Object.hasOwn(body,'profile'))return undefined;
  const fail=()=>{throw Object.assign(new Error('Tên thiết bị hoặc vị trí chia sẻ chưa hợp lệ.'),{status:400});};
  if(body.profileConsentVersion!==PROFILE_CONSENT_VERSION)fail();
  if(body.profile===null)return null;
  const p=body.profile;
  const validTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)>=946684800000&&Date.parse(v)<=Date.now()+300000;
  if(!p||typeof p.deviceName!=='string'||!p.deviceName.trim()||p.deviceName.trim().length>80||/[\u0000-\u001f\u007f]/.test(p.deviceName)||!validTime(p.consentedAt))fail();
  let location=null;
  if(p.location!=null){const l=p.location;if(!l||!Number.isFinite(l.latitude)||Math.abs(l.latitude)>90||!Number.isFinite(l.longitude)||Math.abs(l.longitude)>180||!Number.isFinite(l.accuracy)||l.accuracy<0||l.accuracy>10000000||!validTime(l.capturedAt))fail();location={latitude:l.latitude,longitude:l.longitude,accuracy:l.accuracy,capturedAt:new Date(l.capturedAt).toISOString()};}
  if(p.displayName!=null&&(typeof p.displayName!=='string'||!p.displayName.trim()||p.displayName.trim().length>80||/[\u0000-\u001f\u007f]/.test(p.displayName)))fail();
  return{displayName:p.displayName?.trim()||null,deviceName:p.deviceName.trim(),location,consentedAt:new Date(p.consentedAt).toISOString()};
}
export function withProfile(row){const {profile_json,...rest}=row;const p=profile_json?JSON.parse(profile_json):null;return{...rest,displayName:p?.displayName||null,deviceName:p?.deviceName||null,location:p?.location||null};}
export function csvCell(value){if(value==null)return '';if(typeof value==='number')return String(value);let s=String(value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
export const PROFILE_CSV_HEADER=',DisplayName,DeviceName,Latitude,Longitude,AccuracyMeters,LocationCapturedAt';
export function profileCsv(row){const p=withProfile(row);return[p.displayName,p.deviceName,p.location?.latitude,p.location?.longitude,p.location?.accuracy,p.location?.capturedAt].map(csvCell);}
