import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { marked } from 'marked';

const pages = ['index', 'takk', 'takker-nei', 'personvern'] as const;
const root = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

/** I `vite dev` (uten Netlify) svarer /takk osv. med riktig HTML-fil, slik netlify.toml gjør i produksjon. */
function cleanUrls(): Plugin {
  return {
    name: 'acc-clean-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const hit = pages.find((p) => p !== 'index' && url === `/${p}`);
        if (hit) req.url = `/${hit}.html${req.url?.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
        next();
      });
    },
  };
}

/** Preload av Outfit (latin) med den hashede filstien fra bygget, slik at skriften starter tidlig. */
function fontPreload(): Plugin {
  return {
    name: 'acc-font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        let href = '/src/ds/assets/fonts/outfit-latin.woff2';
        if (ctx.bundle) {
          const hit = Object.keys(ctx.bundle).find((k) => /outfit-latin[-.][A-Za-z0-9_-]+\.woff2$/.test(k) || /outfit-latin\.woff2$/.test(k));
          if (hit) href = '/' + hit;
        }
        return [
          { tag: 'link', attrs: { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head-prepend' },
        ];
      },
    },
  };
}

/** Rendrer content/*.md til HTML ved bygg. Import: `import html from 'virtual:md/personvern'`. */
function markdownContent(): Plugin {
  const prefix = 'virtual:md/';
  return {
    name: 'acc-markdown',
    resolveId(id) {
      return id.startsWith(prefix) ? '\0' + id : null;
    },
    load(id) {
      if (!id.startsWith('\0' + prefix)) return null;
      const name = id.slice(('\0' + prefix).length);
      const file = resolve(root, 'content', `${name}.md`);
      this.addWatchFile(file);
      const md = readFileSync(file, 'utf8');
      const html = marked.parse(md, { gfm: true, breaks: false }) as string;
      return `export default ${JSON.stringify(html)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), cleanUrls(), fontPreload(), markdownContent()],
  build: {
    target: 'es2019',
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(root, `${p}.html`)])),
      output: {
        advancedChunks: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
    // Én chunk per side + delt vendor-chunk holder antall forespørsler lavt på 4G.
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
