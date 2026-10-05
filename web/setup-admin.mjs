import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { passwordHash } from './backend.mjs';
const dir=process.env.DATA_DIR||fileURLToPath(new URL('./server-data/',import.meta.url));mkdirSync(dir,{recursive:true});
const config=path.join(dir,'admin-auth.json');
if(existsSync(config)&&!process.argv.includes('--reset')){console.log('Tài khoản đã được cấu hình. Dùng --reset nếu muốn đổi mật khẩu và khởi động lại server.');process.exit(0);}
const password=randomBytes(24).toString('base64url');
writeFileSync(config,JSON.stringify(passwordHash(password)),{mode:0o600});
writeFileSync(path.join(dir,'ADMIN-LOGIN.txt'),`SunReminder — Chỉ dành cho Group 4\nTrang: ${(process.env.PUBLIC_ORIGIN||'http://localhost:4173')}/admin\nTên đăng nhập: group4\nMật khẩu: ${password}\n\nKhông gửi file này cho người tham gia hoặc đưa vào gói phát hành.\n`,{mode:0o600});
console.log('Đã tạo tài khoản. Mở server-data/ADMIN-LOGIN.txt để lấy mật khẩu; mật khẩu không được in vào nhật ký.');
