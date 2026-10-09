import {build} from 'esbuild';
await build({entryPoints:['cloudflare/worker.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'.wrangler/test-worker.mjs'});
