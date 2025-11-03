import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_DV-qs-Na.mjs';
import { manifest } from './manifest_B2mz1lc4.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/404.astro.mjs');
const _page1 = () => import('./pages/index.astro.mjs');
const _page2 = () => import('./pages/_---slug_.astro.mjs');
const pageMap = new Map([
    ["node_modules/@astrojs/starlight/routes/static/404.astro", _page0],
    ["src/pages/index.astro", _page1],
    ["node_modules/@astrojs/starlight/routes/static/index.astro", _page2]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "mode": "standalone",
    "client": "file:///home/runner/work/unipay-sdk/unipay-sdk/docs/dist/client/",
    "server": "file:///home/runner/work/unipay-sdk/unipay-sdk/docs/dist/server/",
    "host": "0.0.0.0",
    "port": 3521,
    "assets": "_astro",
    "experimentalStaticHeaders": false
};
const _exports = createExports(_manifest, _args);
const handler = _exports['handler'];
const startServer = _exports['startServer'];
const options = _exports['options'];
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { handler, options, pageMap, startServer };
