import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }
import { dataVersions } from './scripts/data-versions.mjs'

// The settlement pages (/telepules/…, /en/telepules/…) are static HTML that
// scripts/settlement-pages.mjs writes into dist/ after a build; there is no
// source page for the dev server to serve, so without this it answers them
// with index.html (the landing page). In dev they are served from the last
// build, together with the hashed /assets/ files they reference.
const DIST = resolve(__dirname, 'dist')
const STATIC_PREFIXES = ['/telepules/', '/en/telepules/', '/assets/']
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml',
}
function builtSettlementPages(): Plugin {
  return {
    name: 'built-settlement-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? '').split(/[?#]/)[0])
        if (!STATIC_PREFIXES.some((p) => path.startsWith(p)) && path !== '/telepules' && path !== '/en/telepules') return next()
        let file = normalize(join(DIST, path))
        if (!file.startsWith(DIST)) return next()
        if (existsSync(file) && statSync(file).isDirectory()) {
          if (!path.endsWith('/')) {
            res.statusCode = 301
            res.setHeader('Location', `${path}/`)
            res.end()
            return
          }
          file = join(file, 'index.html')
        }
        if (!existsSync(file)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(`Not in dist/: ${path}\nThe settlement pages exist only after "npm run build".`)
          return
        }
        res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(readFileSync(file))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), builtSettlementPages()],
  // the release the footer names: package.json is the one place it is kept
  // and the content hash of every data file, which src/lib/dataUrl.ts puts in
  // the query so a browser can cache the file until it changes
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DATA_VERSIONS__: JSON.stringify(dataVersions(resolve(__dirname, 'public', 'data'))),
  },
  build: {
    rollupOptions: {
      // Two shared pieces kept in chunks of their own, so a release changes
      // only what it changed: the Hungarian dictionary (every page loads it)
      // and the data-file hashes (they change with every ETL run).
      output: {
        codeSplitting: {
          groups: [
            { name: 'i18n-hu', test: /src[\\/]i18n[\\/]hu\.json/ },
            { name: 'data-versions', test: /src[\\/]lib[\\/]dataUrl\.ts/ },
          ],
        },
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
        analysis: resolve(__dirname, 'elemzo.html'),
        europe: resolve(__dirname, 'europa.html'),
        eeszt: resolve(__dirname, 'eeszt.html'),
        specialist: resolve(__dirname, 'szakellato.html'),
        method: resolve(__dirname, 'modszertan.html'),
        county: resolve(__dirname, 'megye.html'),
        district: resolve(__dirname, 'jaras.html'),
        privacy: resolve(__dirname, 'adatkezeles.html'),
        media: resolve(__dirname, 'media.html'),
        nonterritorial: resolve(__dirname, 'tek-nelkul.html'),
        // not a page: the lazy street map the static settlement pages load
        streetmap: resolve(__dirname, 'src/streetmap.ts'),
        // not a page either: the PDF export button of the static settlement pages
        pdfexport: resolve(__dirname, 'src/pdfexport.ts'),
        // nor this: the light/dark and colour-scheme buttons of the static pages
        statictools: resolve(__dirname, 'src/navtoolsStatic.ts'),
        // nor this: the animated story of the static settlement pages (it loads
        // its canvas half lazily, see src/storyStatic.ts)
        staticstory: resolve(__dirname, 'src/storyStatic.ts'),
      },
    },
  },
})
