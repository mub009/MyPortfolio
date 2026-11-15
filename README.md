# Mubashir Palakkan: portfolio

The source of my portfolio site: **https://mub009.github.io/MyPortfolio/**

The page is one sky. A flock of 90 low-poly birds starts on my photo, then regroups into a different formation for each skill as you scroll: a nest for web applications, couriers between two towers for APIs, a V formation for compliance work, and so on. It is light by day and a glowing night after 6 pm, by the visitor's own clock.

## How it is built

- `index.html`: all content and styles, no framework.
- `src/birds.js`: the 3D scene (three.js): birds, formations, light trails, the portrait and props.
- `birds.min.js`: the bundled script the page loads.
- `img/`: project screenshots and the portrait.

Rebuild the script after editing `src/birds.js`:

```
npm install three esbuild
npx esbuild src/birds.js --bundle --minify --format=esm --outfile=birds.min.js
```

The site is served from the `gh-pages` branch, which mirrors `main`.
