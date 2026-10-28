# Keshan & Naduni — Our Forever

A self-contained, bilingual Sri Lankan sample wedding album by Everlume. All people and wedding details are fictional; photography was created with the built-in image-generation tool.

## Open the album

Double-click `index.html` to view it locally, or run:

```sh
npm start
```

Then visit **http://localhost:4173**. Node.js 18 or newer is needed only for the local server; no packages need to be installed. The website itself uses native HTML, CSS and JavaScript and makes no external asset requests.

The book introduction plays on Home once per browser tab session. Use **Open the book** in the header to replay it. **Skip intro** or Escape dismisses it. Visitors who prefer reduced motion go straight to the album. The **Motion on/off** control remembers the visitor’s choice across pages.

## Four connected pages

- `index.html`: the original book introduction and photographic album, with links to the other chapters.
- `gallery.html`: 20 unique photographs, six filters and a full-screen viewer. Getting Ready has 3 photographs, The Ceremony 3, Together 8, The Celebration 3 and Little Details 3. Filter links support `?category=ceremony` and the other category IDs from configuration.
- `our-story.html`: four illustrated, bilingual chapters about the fictional wedding day.
- `films.html`: three playable, silent 21-second photo films with slow camera movement and soft cross-dissolves. These are rendered from AI-generated wedding stills, not full-motion AI footage or recordings of a real wedding.

All navigation uses relative `.html` URLs for direct local viewing and GitHub Pages project directories.

## Personalize

- Edit `album.config.js` for names, date, Sinhala/English copy, gallery order, image descriptions and focal points. The date is illustrative sample content.
- Edit `styles.css` for the base palette and Home layouts, and `pages.css` for navigation, Gallery, Story, Films and scroll reveals. Sinhala uses Nirmala UI or Iskoola Pota when available, then the device’s Sinhala fallback.
- Replace image sets in `assets/images/` using the existing filenames (`formal-480.jpg`, `formal-960.jpg`, `formal-1600.jpg`, etc.). Keep `album.config.js` focal points appropriate for your replacement images. Use a matched set of photographs for a consistent couple.
- The cover photograph has no baked-in text. Cover wording is rendered as editable HTML. If the cover filename changes, also update its preload in `index.html`.
- Transparent floral and petal assets are PNGs. Keep their alpha channel when replacing them.

Original user references remain in `images/`. Generated originals are kept locally in `assets/generated/originals/` (excluded from git for size), optimized web assets in `assets/images/`, and the full generation prompt set and asset mapping in `assets/generated/manifest.json`.

The expansion adds 12 photographs, generated using the original formal portrait as an identity reference. Their individual prompts are also recorded in `assets/generated/expansion-prompts.json`. The 20 gallery photographs exclude the cover and decorative cutouts. They depict a fictional couple and retain the sample disclosure on every page.

To add a photograph, create its 480, 960 and 1600-pixel JPEG copies, add an entry to `ALBUM.images` with `file`, `alt`, `caption`, `position` and `category`, then add its key to `ALBUM.gallery`. Set `format: 'portrait'` for a taller gallery frame that preserves faces. Category counts are calculated automatically. Gallery batches contain 24 photographs; the Show more button appears only when required. The viewer includes all photographs in the selected category, including those beyond the current batch. `homeGallery` separately controls Home's viewer order. Story chapters, navigation labels and film records are also editable in `album.config.js`.

## Add real wedding films

Three H.264 MP4 photo films are included in `assets/videos/`, with a source manifest alongside them. Rebuild them with `node scripts/render-films.cjs` (requires FFmpeg). To replace one with real footage, update its `source` and description in `album.config.js`, and remove `photoFilm: true`. Use a relative local MP4 path or a direct HTTPS MP4 URL, for example:

```js
{ id: 'wedding-film', title: 'Our beautiful beginning',
  description: 'The story of our day, in moving pictures.',
  poster: 'garden', source: 'assets/videos/wedding.mp4', featured: true }
```

Create `assets/videos/` and place your footage there, or use `https://your-domain.example/wedding.mp4`. YouTube/Vimeo pages, embeds, playlists and streaming manifests are not supported. Use an MP4 with browser-compatible codecs such as H.264 video and AAC audio. Remote servers must permit direct playback and should support byte-range requests for seeking. The included local server supports MP4 range requests.

A playable source adds an accessible open-film control. The native player loads only when opened, never autoplays, and pauses and releases its source when closed. Missing footage displays a helpful error. Films without a source retain their coming-soon badge.

To regenerate web-sized copies from existing originals on Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/optimize-assets.ps1
```

## Behavior and accessibility

- Continuous scrolling album with a CSS 3D book introduction, framed collages, arched images, and divided panorama.
- Photo viewer supports previous/next buttons, left/right arrow keys, Escape, and horizontal touch swipes. Native modal dialogs contain keyboard focus and restore it when closed.
- Ten subtle petals on desktop and five on mobile; decorative layers never intercept pointer input. Motion respects device preferences and pauses in hidden tabs.
- Offscreen sections reveal once with a gentle 16-pixel movement over 600 milliseconds. Related elements stagger by up to 240 milliseconds. Keyboard-focused content appears immediately. Disabling motion reveals all content, and content stays visible if the animation observer is unavailable.
- All image buttons have descriptive accessible names. Photo loading failures show an intentional fallback; a stalled cover cannot block access to the album.
- Responsive image sources, reserved image dimensions, lazy-loaded later photographs, and a preloaded cover reduce layout movement and initial transfer.

## Checks and local delivery

Run `npm run check` for JavaScript syntax, asset completeness and content-reference checks. `scripts/browser-qa.cjs` runs the browser regression checks using a dedicated headless Chrome with its debugging port at `9222` and the local server at `4173`. It uses Node’s built-in WebSocket (Node 22+); no third-party browser dependencies are needed. Screenshots and results are written to the ignored `.preview/` directory.

`scripts/multipage-qa.cjs` checks all four pages at 360, 390, 768 and 1440 pixels, category counts and navigation, focus and motion preferences, a temporary 200-photo collection, video playback/error handling, local-file access and project-subdirectory hosting. Its video test expects `.preview/test-film.mp4`; create this disposable fixture with `ffmpeg -f lavfi -i testsrc=size=320x180:rate=24 -t 3 -c:v libx264 -pix_fmt yuv420p .preview/test-film.mp4`. Test configuration overrides are applied only inside the test browser and never change the delivered album.

The original Home regression suite checks book opening/replay/skip, keyboard and touch photo navigation, motion preferences, and missing/stalled images. Screenshots are visually reviewed for photo crops and Sinhala rendering. These are desktop Chrome mobile emulations, not physical-device or Safari tests. The site uses the device’s Sinhala font, so typography can vary across operating systems.

Delivery validation: `npm run check` passed, along with all 23 multipage checks and all 15 Home regression checks. The generated photographs and desktop/mobile page screenshots were visually inspected. Results are saved in `.preview/multipage-results.json` and `.preview/qa-results.json`.

The live pages use `assets/images/petal-source-yellow.png`, a transparent cutout edited from the supplied `images/yellow petals.jpg`. Home's border below the hero repeats `assets/images/yellow-flower-cutout.png`, edited from `images/yellow_flower.jpg`. Both backgrounds were removed with the built-in image editing tool. Original sheets and earlier crimson variants are preserved. Petals remain 30–38px on mobile and 38–50px on desktop, with gentle rotation and edge-focused paths. Change `assets.petals` or `assets.flowerBorder` in `album.config.js` to replace them. Source cutouts and editing prompts are archived in `assets/generated/manifest.json`.

The website files, `assets/images/` and `assets/videos/` are required for a static web deployment. Keep `assets/generated/` as the editable source archive. This delivery is local; it has not been published to a hosting service.
