# CLAUDE.md

Personal portfolio SPA for Freddy Martínez, hosted on GitHub Pages as a **user page** (`FreddyMartinez.github.io`, served from the domain root).

## Stack
- React 19 + TypeScript, built with Vite 8 (`@vitejs/plugin-react`). TypeScript is v7 (native `tsc`).
- 3D: three.js via `@react-three/fiber` v9 + `@react-three/drei` v10.
- Plain CSS (no framework). Dark-only theme; colours are CSS variables at the top of `src/index.css`.

## Commands
- `npm run dev`: local dev server
- `npm run build`: type-check (`tsc -b`) and build into `dist/`
- `npm run preview`: serve the built `dist/`

## Layout
- `src/data.ts`: **all personal content** (profile, bio, email, links, projects). Edit content here, not in components.
- `src/App.tsx`: single-page layout (hero, About, Projects, Contact, footer) with anchor-link nav (no router).
- `src/components/Scene.tsx`: R3F canvas (distorted icosahedron + stars, pointer-driven tilt). It is **lazy-loaded** with `React.lazy` so the text renders before three.js (~245 KB gzip) arrives. Keep it lazy.
- `public/`: static assets copied as-is (favicon).

## Deployment
- `.github/workflows/deploy.yml` builds and deploys to Pages on every push to `main`.
- The repo's Pages source must be set to **GitHub Actions** (Settings → Pages). The old Jekyll `_config.yml` was removed on purpose.
- `vite.config.ts` uses `base: '/'` because this is a user page. Do not change it to a sub-path.
- `chunkSizeWarningLimit` is raised to 1000 because the three.js chunk is expectedly large.

## Status / notes
- `src/data.ts`: email and LinkedIn are filled in. The About paragraphs and projects two and three are still placeholders.
- Windows dev machine. Long bash heredocs with mixed quotes have failed in this environment, so write files with the Write tool instead.
