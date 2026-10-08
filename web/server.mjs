import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createBackend } from './backend.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const allowed=new Set(['index.html','app.js','engine.js','data.js','analytics.js','sharing.js','profile.js','profile-ui.js','user-account.js','admin-session.js','styles.css','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','admin.html','admin.js','admin.css']);
export function createAppServer({dataDir=path.join(root,'server-data'),origin='http://localhost:4173',adminPassword}={}){
  const base=new URL(origin);if(base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw new Error('PUBLIC_ORIGIN phải là gốc tên miền.');
  if(base.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw new Error('Máy chủ công khai cần HTTPS.');
  const backend=createBackend({dataDir,origin:base.origin,adminPassword});
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    if(base.protocol==='https:')res.setHeader('Strict-Transport-Security','max-age=31536000');
    if(req.headers.host!==base.host){res.writeHead(421);res.end('Unexpected host');return;}
    try{
      const url=new URL(req.url,base);if(await backend.handle(req,res,url))return;
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
      const pathname=decodeURIComponent(url.pathname);const file=pathname==='/'?'index.html':['/admin','/admin/'].includes(pathname)?'admin.html':pathname.slice(1);
      if(!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
      const body=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.startsWith('admin')?'no-store':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
    }catch{res.writeHead(500);res.end('Unable to serve request');}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.on('close',()=>backend.close());return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
  if(!['127.0.0.1','localhost','::1'].includes(host)&&!process.env.PUBLIC_ORIGIN)throw new Error('Cần PUBLIC_ORIGIN=https://... khi mở ra mạng.');
  const origin=process.env.PUBLIC_ORIGIN||`http://localhost:${port}`;
  createAppServer({dataDir:process.env.DATA_DIR||path.join(root,'server-data'),origin,adminPassword:process.env.SUN_ADMIN_PASSWORD}).listen(port,host,()=>console.log(`SunReminder: ${origin}\nQuản trị Group 4: ${origin}/admin`));
}
