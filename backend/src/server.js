'use strict';

const { createApp } = require('./app');
const { createMemoryStore } = require('./store/memory');
const { createCatalystStore } = require('./store/catalyst');

// AppSail injects the port it health-checks; never hardcode it.
const port = Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 9000);
const store = process.env.STORE === 'memory' ? createMemoryStore() : createCatalystStore();

const server = createApp(store, { corsOrigin: process.env.CORS_ORIGIN || '*' }).listen(port, () => {
  console.log(`leaderboard api on :${port} using ${store.name}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
