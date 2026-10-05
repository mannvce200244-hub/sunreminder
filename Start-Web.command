#!/bin/sh
cd "$(dirname "$0")/web" || exit 1
node setup-admin.mjs || exit 1
printf 'App: http://localhost:4173 - Admin: http://localhost:4173/admin\nKeep server-data/ADMIN-LOGIN.txt private. Requires Node.js 24 LTS.\n'
node server.mjs
