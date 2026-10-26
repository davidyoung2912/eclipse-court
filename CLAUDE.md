# Eclipse Court

Design doc: `eclipse-court.pdf`. Build plan: phases 0-6 as in the approved plan (Vite + React + TypeScript, plain CSS, framework-free engine in `src/engine`).

## Working rules (apply to every code request)

- Do not do Playwright testing or any browser testing. Verify with `npm run test`, `npm run lint`, `npx tsc -b` and `npm run build` only.
- Commit and stop after each build phase so the user can `/clear`. Do not start the next phase until asked.
