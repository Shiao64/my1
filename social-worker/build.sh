#!/bin/sh
set -e; cd "$(dirname "$0")"
node -e "const fs=require('fs');const F={'/asia/asia-subscribe.js':'../asia/asia-subscribe.js','/asia/atm-social.js':'../asia/atm-social.js'};let o='export const FILES={';for(const[k,v]of Object.entries(F))o+=JSON.stringify(k)+':'+JSON.stringify(fs.readFileSync(v,'utf8'))+',';fs.writeFileSync('src/overrides.js',o+'};')"
npx -y esbuild@0.24.0 src/preview.js --bundle --format=esm --platform=neutral --external:cloudflare:* --outfile=dist/preview.mjs
npx -y esbuild@0.24.0 src/live.js --bundle --format=esm --platform=neutral --external:cloudflare:* --outfile=dist/live.mjs
