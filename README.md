# Isaac Dash

A 3D cyberpunk parkour endless runner, built with [Three.js](https://threejs.org/).

Dodge through a neon skyline across three lanes — jump barriers, slide under beams, **leap onto the side walls and wall-jump** the spikes, collect coins, and chain power-ups. Spend coins in the Garage on new runners. Clear themed levels with 3 HP each.

**▶ Play:** https://alex-audible.github.io/isaac-dash/

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move lane / leap to a side wall | ◀ ▶ (or A / D) | Swipe left / right |
| Jump · wall-jump | ▲ / Space (or W) | Swipe up |
| Slide | ▼ (or S) | Swipe down |
| Pause | Esc / P | Pause button |

When a wall of blocks spans every lane, push past the outer lane onto a side wall, run it, and wall-jump the wall-spikes.

## Running it

Pure static site — no build step. Open `index.html` over HTTP (e.g. `npx serve` or any static server) or just deploy the folder.

Three.js and its post-processing addons load from the [unpkg](https://unpkg.com) CDN via an import map; fonts load from Google Fonts. No bundler required.

## Deploying to GitHub Pages

1. Push these files to the repo root (`index.html`, `styles.css`, `js/`).
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Save.
4. Wait a minute, then visit `https://<user>.github.io/isaac-dash/`.

## Structure

```
index.html         markup, HUD, screens, resilient module bootstrap
styles.css         neon-cartoon UI
js/main.js         storage, audio, render loop
js/game.js         player controller, physics, collisions, levels, HP
js/environment.js  scene, lighting, bloom, sky themes, road, walls, city
js/entities.js     pooled obstacles / coins / power-ups + spawn patterns
js/avatars.js      six primitive-built runners + thumbnail renderer
js/ui.js           screens, HUD, Garage shop, input
```
