# Pachaiappan — AI Engineer & Developer

A static editorial portfolio with warm-white content, cobalt accents, a dark Three.js developer workspace, and eleven project detail pages. Desktop visitors explore three featured projects through a sticky, changing visual stage; smaller screens use ordinary image-and-text sections.

[Live portfolio](https://mr-vicky-01.github.io/Portfolio/)

## Preview locally

From the project folder, run:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://127.0.0.1:8000). Use an HTTP server rather than opening `index.html` directly; the 3D scene uses JavaScript modules. No npm install or build step is required.

## Editing

- `index.html`: homepage copy, work, experience, skills, certifications, and contact links.
- `projects/*.html`: complete, independently accessible project pages. Existing URLs are preserved.
- `assets/css/style.css`: the shared editorial design system, 1,240px content width, responsive layouts, and motion states.
- `favicon.svg`: the cobalt “P” monogram used in browser tabs. Matching PNG, ICO, and Apple touch icons provide browser and device fallbacks; every page references the same branding.
- `assets/js/main.js`: accessible mobile navigation, current-section indicators, and optional loading of page motion.
- `assets/js/motion.js`: coordinated hero entrances, section and image reveals, staggered cards, reading progress, the desktop project sequence, and pointer-responsive portrait depth. It uses native scrolling and responds to section links, resizing, and motion preferences. The About section’s approach panels use native `details` elements and work without JavaScript.
- `assets/js/scene-loader.js`: progressive loading, animation preference, and fallback handling.
- `assets/js/workspace.js`: procedural desk, screen textures, lighting, and animation.
- `assets/img/workspace.svg`: static illustration for reduced motion, disabled JavaScript, or unavailable WebGL.
- `assets/img/projects/*.svg`: eleven local, project-specific conceptual illustrations, each with a simplified mobile variant selected through `picture` sources. These are illustrations, not screenshots or interactive demos. Edit the SVGs directly.
- `assets/img/portrait-balanced.png`: the color-corrected portrait with natural skin tones, balanced highlights, and a navy background matched to the About surface. It renders in normal color without screen blending or desaturation; a narrow horizontal edge mask softens the join. The previous edit remains in `assets/img/portrait-editorial.png`, and the original photo in `assets/img/profile-pic.png`.

The homepage imports **Three.js 0.183.2** from jsDelivr with an import map. Google Fonts and the pre-existing analytics integrations remain external. If the 3D dependency cannot load, content and navigation remain usable with the static illustration. No new tracking has been added.

There is no floating animation button. The site automatically respects the operating system’s reduced-motion preference, uses complete static project compositions, and avoids the initial Three.js download when reduced motion is requested. Previous stored pause preferences are ignored. Without JavaScript, all content, navigation, project links, and About disclosure panels remain available.

## Hosting

Serve this folder with GitHub Pages or any static host. Paths are relative and work under a repository subdirectory. No backend, environment variables, form service, or deployment build is needed. Contact actions use email, phone, and existing profile links.

The two older project references (`blog.html` and `todo.html`) retain their original repository and deployment links and are identified as archived references. Project illustrations are conceptual artwork, not application screenshots. Existing career claims, dates, and analytics IDs are preserved from the previous portfolio.

## Manual checks

Check widths of 360, 768, 1440, and 1920 pixels, plus mobile landscape. The menu collapses at 760px; the cinematic project stage activates at 1,000px. Scroll through the three projects in both directions, open `#work-genxai` directly, and resize while reading a project. Then check keyboard focus, Escape, the About disclosure panels, reduced motion, disabled JavaScript, and blocked images or Three.js requests.

The renderer caps pixel density at 1.75 on desktop and 1.25 on narrow screens, limits narrow-screen rendering to approximately 30 fps, and suspends when offscreen or when the tab is hidden.

Local review artifacts and browser scripts live in the ignored `.preview/` directory, including `editorial-scroll.webm`, responsive screenshots, and acceptance results. They are not required for hosting. The Python files there are one-off migration helpers, not a build pipeline; edit the delivered HTML/CSS/JS/SVG files directly.
