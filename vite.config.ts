import {sentryVitePlugin} from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode, command}) => {
  const env = loadEnv(mode, '.', '');

  // Source-map upload only makes sense for a real production build, and only
  // once a Sentry project actually exists (org/project/authToken all set).
  // Never let missing Sentry config fail a local `npm run build`.
  const sentryOrg = env.SENTRY_ORG;
  const sentryProject = env.SENTRY_PROJECT;
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN;
  const canUploadSentrySourceMaps =
    command === 'build' && !!sentryOrg && !!sentryProject && !!sentryAuthToken;

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(canUploadSentrySourceMaps
        ? [
            sentryVitePlugin({
              org: sentryOrg,
              project: sentryProject,
              authToken: sentryAuthToken,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      // Only emit sourcemaps when we can actually upload them to Sentry —
      // no point shipping them (or the extra build time) otherwise.
      sourcemap: canUploadSentrySourceMaps,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const modulePath = id.replace(/\\/g, '/');
            if (!modulePath.includes('/node_modules/')) return;

            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) return 'react-vendor';
            if (/\/node_modules\/react-router/.test(modulePath)) return 'router-vendor';
            if (/\/node_modules\/(recharts|d3-[^/]+|d3|victory-vendor|internmap)\//.test(modulePath)) return 'charts-vendor';
            if (/\/node_modules\/pdfjs-dist\//.test(modulePath)) return 'pdf-viewer-vendor';
            if (/\/node_modules\/jspdf\//.test(modulePath)) return 'jspdf-vendor';
            if (/\/node_modules\/html2canvas\//.test(modulePath)) return 'html2canvas-vendor';
            if (/\/node_modules\/html2pdf\.js\//.test(modulePath)) return 'html2pdf-vendor';
            if (/\/node_modules\/@xmldom\/xmldom\//.test(modulePath)) return 'xml-parser-vendor';
            if (/\/node_modules\/bluebird\//.test(modulePath)) return 'promise-vendor';
            if (/\/node_modules\/(?:jszip|pako)\//.test(modulePath)) return 'zip-vendor';
            if (/\/node_modules\/mammoth\//.test(modulePath)) return 'mammoth-vendor';
            if (/\/node_modules\/docx\//.test(modulePath)) return 'docx-vendor';
            if (/\/node_modules\/(file-saver|html-to-image)\//.test(modulePath)) return 'document-utils-vendor';
            if (/\/node_modules\/@supabase\//.test(modulePath)) return 'supabase-vendor';
            if (/\/node_modules\/(?:@sentry|posthog-js)\//.test(modulePath)) return 'analytics-vendor';
            if (/\/node_modules\/react-quill-new\//.test(modulePath)) return 'editor-vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
