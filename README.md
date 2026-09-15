<p align="center">
  <a href="https://mr-vicky-01.github.io/Portfolio/">
    <img src="favicon.svg" alt="Pachaiappan monogram" width="64" height="64" />
  </a>
</p>

<h1 align="center">Pachaiappan - Developer Portfolio</h1>

<p align="center">
  AI engineering, thoughtful software, and the ideas behind the work.
</p>

<p align="center">
  <a href="https://mr-vicky-01.github.io/Portfolio/"><strong>Explore the live portfolio</strong></a>
  · <a href="#featured-projects">Featured projects</a>
  · <a href="#getting-started">Run locally</a>
  · <a href="#connect">Connect</a>
</p>

## Overview

My personal portfolio brings together projects, engineering experience, and interests across generative AI, computer vision, and application development. It pairs a three-chapter, scroll-driven hero with the original light editorial sections for projects, experience, skills, and about.

The site runs directly from static HTML, CSS, and JavaScript. There is no application build step or backend to configure.

## Experience

- **Scroll-driven workspace** - 192 local WebP frames from the first eight seconds of a supplied video. Scroll position moves the hero scene forward and backward through three cards; the final two seconds containing generated text are excluded.
- **Cinematic project showcase** - sticky artwork transitions between featured projects on desktop; mobile visitors see stacked image-and-text sections.
- **Responsive visual system** - a navy cinematic hero, warm-white content sections, cobalt accents, and eleven editorial project pages.
- **A closer look at the developer** - an integrated portrait, career timeline, grouped skills, education, certifications, and expandable approach panels.
- **Progressive enhancement** - native scrolling, keyboard navigation, and reduced-motion support. Static artwork remains available when the 3D scene cannot load.

## Featured projects

| Project                                                                    | Focus                 | What it explores                                                                                              |
| -------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| [CRETA](https://mr-vicky-01.github.io/Portfolio/projects/creta.html)       | Conversational AI     | An approachable assistant for questions and exploration, built with Python, Streamlit, and generative models. |
| [GenXAi](https://mr-vicky-01.github.io/Portfolio/projects/genxai.html)     | Developer tools       | A coding companion that uses Gemini and LangChain to help explore programming questions.                      |
| [Chat With PDF](https://mr-vicky-01.github.io/Portfolio/projects/rag.html) | Document intelligence | Conversational exploration of multiple PDFs using document retrieval, embeddings, and language models.        |

Additional work includes **Deep Learning Web-App**, **Hand Sign Detection**, **Story Teller**, **ScreenShot-HTML**, **English Teacher**, and **Rock Paper Scissor**.

Project pages provide an overview, technology stack, and available source or demo links. Two older pages, `blog.html` and `todo.html`, are identified as archived references and retain their original resource links.

## Technology

| Layer                 | Tools                                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| Content and layout    | HTML5 and responsive CSS                                                      |
| Navigation and motion | Vanilla JavaScript, ES modules, Intersection Observer, and Resize Observer    |
| Background animation | Local WebP image sequence drawn on Canvas 2D; no external rendering library |
| Visual assets         | Local SVG illustrations, responsive image variants, and an AI-edited portrait |
| Hosting               | GitHub Pages or any static HTTP server                                        |

The workspace background is prerendered footage, not a live 3D model. The original procedural Three.js implementation remains in the repository as an unused legacy asset. Project illustrations are conceptual visuals, not application screenshots.

## Getting started

You need **Python 3** for the preview server and a modern browser. Internet access loads Google Fonts; system-font fallbacks remain available. The homepage background uses local images and does not download Three.js.

```sh
git clone https://github.com/Mr-Vicky-01/Portfolio.git
cd Portfolio
python -m http.server 8000 --bind 127.0.0.1
```

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

If you already have the repository, run only the Python command from its root directory. Use the HTTP server rather than opening `index.html` directly so browser modules load correctly. No npm installation or environment variables are required to run the site.

## Project structure

```text
Portfolio/
├── index.html                  # Homepage and portfolio content
├── projects/                   # Eleven project detail pages
├── assets/
│   ├── css/
│   │   └── style.css           # Shared design system and responsive layouts
│   ├── js/
│   │   ├── main.js            # Navigation and optional motion loading
│   │   ├── motion.js          # Scroll effects and portrait interaction
│   │   ├── scene-loader.js    # Deferred 3D loading and fallback handling
│   │   └── workspace.js       # Procedural Three.js scene
│   └── img/
│       ├── projects/          # Desktop and mobile concept illustrations
│       ├── portrait-balanced.png
│       └── workspace.svg      # Static workspace fallback
├── favicon.svg                # Monogram, with PNG and ICO fallbacks
├── apple-touch-icon.png
├── LICENSE
└── README.md
```

The ignored `.preview/` directory contains local review tools and artifacts. It is not required to run or host the portfolio.

## Customization

| To change…                                              | Edit…                                               |
| ------------------------------------------------------- | --------------------------------------------------- |
| Introduction, career details, skills, and contact links | `index.html`                                        |
| Project descriptions, technology, and resources         | `projects/*.html`                                   |
| Colors, typography, spacing, and responsive layouts     | `assets/css/style.css`                              |
| Scroll transitions and pointer interactions             | `assets/js/motion.js`                               |
| Background framing, contrast, and scroll mapping       | `assets/css/scroll-background.css`, `assets/js/scroll-background.js` |
| Portrait and project artwork                            | `assets/img/` and the corresponding HTML references |

Keep asset paths relative to support hosting under a repository subdirectory. When changing the portrait, preserve natural color and the navy background treatment; its display does not use desaturation or screen blending.

## Motion and performance

A responsive first-frame poster loads first (about 19 KB desktop / 10 KB mobile). After page load, idle time begins prefetching compressed frames, prioritizing the current position. The higher-quality 192-frame sets are approximately 6.88 MB desktop and 3.30 MB mobile. Downloads have at most four requests in flight on desktop and three on mobile, and stop queuing while the hero is offscreen. Compressed frames remain in memory for replay; decoded image caches are bounded to 28 frames on desktop and 20 on mobile. `createImageBitmap` decodes ahead of the visible frame when supported, with an image fallback.

Desktop exports preserve the source's 1280px width at WebP quality 92; mobile exports are 960px wide at quality 86. The canvas supports up to 2 device pixels on desktop (1.5 on mobile), capped at 2560 pixels wide. This avoids an extra low-resolution canvas scaling pass, but cannot add detail absent from the original 720p video. Images contain the full source frame and align to the right edge. The hero uses its actual container width instead of viewport-width offsets, avoiding scrollbar-induced horizontal overflow.

Time-based easing and blending only between adjacent source frames smooth the scroll response. At rest, rendering settles onto a single sharp source frame. Drawing stops while the hero is offscreen, the page is hidden, or motion is paused.

On screens at least 700px tall, the hero contains three nearly screen-length scroll chapters: The Idea, The System, and The Work. The complete 192-frame sequence spans only this hero. The first two chapters stay pinned, and the third hands off to Selected Work as the pin releases. Each card has a readable hold and a brief crossfade. A Next chapter button advances one stage; the third press reaches Selected Work. Native wheel and touch scrolling remain proportional to scroll distance rather than counting device-dependent wheel events.

The poster and canvas both contain the complete source frame, with no scroll-driven scale or translation. The background is physically inside the hero and stops drawing when offscreen. Camera movement already in the source video remains visible. Subsequent sections use the original styles without glass overlays. Native scrolling and direct section links remain available. Short viewports use a normal unpinned hero.

Reduced-motion and Save-Data visitors receive the static poster and an unpinned hero by default. The background motion button allows visitors to pause or enable the sequence. Content and the poster remain usable without JavaScript. Project pages retain their existing editorial styling.

To regenerate the assets with Python, install `opencv-python` and `Pillow`, then run:

```sh
python scripts/extract_scroll_frames.py "path/to/source.mp4" --trim-end 2
```

The source used here is 10 seconds, 1280 by 720, at 24 fps. Extraction samples at 24 fps and excludes all frames at or after 8.0 seconds; the final retained frame is at 7.9583 seconds. The output manifest records these boundaries. If you change the duration or frame count, update the frame count in `assets/js/scroll-background.js` as well.

Before publishing changes, check the layouts at **360, 768, 1440, and 1920px**, including mobile landscape. Verify keyboard focus, the mobile menu, project transitions in both scroll directions, direct section links, and the static experience with reduced motion or unavailable WebGL.

## Hosting

Publish the repository root with GitHub Pages or another static host. The delivered files are the deployable site; no generated build directory is needed.

Before committing or pushing, run the source check from the repository root:

```sh
python scripts/check_site.py
```

This checks for unresolved merge markers, duplicate page sections and IDs, broken local HTML references, and filename capitalization mismatches. Resolve any reported errors before publishing, then preview the page again. GitHub Pages serves the committed files, so a merge containing both an old and a new layout will also appear broken online.

Google Fonts and the existing analytics integrations are external. Contact actions use email, phone, and profile links rather than a server-backed form.

## Connect

- **Email:** [pachaiappan.dev@gmail.com](mailto:pachaiappan.dev@gmail.com)
- **LinkedIn:** [Pachaiappan](https://www.linkedin.com/in/pachaiappan)
- **GitHub:** [Mr-Vicky-01](https://github.com/Mr-Vicky-01)
- **Hugging Face:** [Mr-Vicky-01](https://huggingface.co/Mr-Vicky-01)
