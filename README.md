<p align="center">
  <a href="https://mr-vicky-01.github.io/Portfolio/">
    <img src="favicon.svg" alt="Pachaiappan monogram" width="64" height="64" />
  </a>
</p>

<h1 align="center">Pachaiappan - Developer Portfolio</h1>

<p align="center">
  AI/ML engineering for application security, and the projects that led there.
</p>

<p align="center">
  <a href="https://mr-vicky-01.github.io/Portfolio/"><strong>Explore the live portfolio</strong></a>
  · <a href="#projects">Projects</a>
  · <a href="#getting-started">Run locally</a>
  · <a href="#connect">Connect</a>
</p>

## Overview

The site is built around one idea from my work: separating real signal from noise. A field of about 14,000 particles sits behind every page and keeps turning noise into meaning as you scroll: it assembles my name, becomes a signal wave, forms my portrait, and spells வணக்கம் (hello, in Tamil) at the end.

It is plain HTML, CSS, and JavaScript with no build step or backend.

## What happens on the page

- **Hero** - particles assemble the name after a short "loading weights" counter; they scatter from the cursor and shake loose when you scroll fast.
- **Statement** - words light up as you read, over a moving signal wave.
- **SecuriTron AI** - a pinned section where findings flow through the pipeline and false positives drop out before the report.
- **Selected work** - a horizontal gallery driven by vertical scroll. The particles travel with it and draw an emblem for the project in the middle of the screen: chat bubbles, `</>`, a searched document, hand landmarks, an open book, a network. Each case study shows its emblem again beside the overview.
- **About** - the particles form my portrait; hovering "denoises" it into the photograph.
- **Light and depth** - the particles add up as light, with a soft glow where they gather. Each one sits at its own depth, so the field tilts in 3D as the mouse moves, a warm light follows the cursor, and a few out-of-focus motes drift in front of the noise.
- **The pointer** - particles near the cursor link up like a small network. Press and hold anywhere to pull the field into a swirling well, then let go to throw it back; a click or tap sends a ripple.
- **Throughout** - smooth scrolling, page transitions between the homepage and case studies, a custom cursor, magnetic buttons, scrambled hover labels, a live Puducherry clock, and a footer name whose letters widen under the cursor.

## Projects

Each project has a case-study page in `projects/`: overview, how it works, stack, and source or demo links.

| Project | Focus |
| --- | --- |
| [CRETA](https://mr-vicky-01.github.io/Portfolio/projects/creta.html) | Conversational AI |
| [GenXAi](https://mr-vicky-01.github.io/Portfolio/projects/genxai.html) | Developer tools |
| [Chat With PDF](https://mr-vicky-01.github.io/Portfolio/projects/rag.html) | Retrieval-augmented generation |
| [English Teacher](https://mr-vicky-01.github.io/Portfolio/projects/english_teacher.html) | Language AI |
| [Hand Sign Detection](https://mr-vicky-01.github.io/Portfolio/projects/sign-detection.html) | Computer vision |
| [Story Teller](https://mr-vicky-01.github.io/Portfolio/projects/story-teller.html) | Multimodal AI |
| [ScreenShot-HTML](https://mr-vicky-01.github.io/Portfolio/projects/screenshot_html.html) | Generative developer tools |
| [Deep Learning Web-App](https://mr-vicky-01.github.io/Portfolio/projects/web-app.html) | Computer vision |
| [Rock Paper Scissor](https://mr-vicky-01.github.io/Portfolio/projects/rps.html) | Vision and play |

## Technology

| Layer | Tools |
| --- | --- |
| Pages | Static HTML and CSS |
| Particles | WebGL 1, written by hand in `assets/js/field.js` |
| Scroll and motion | [GSAP](https://gsap.com) with ScrollTrigger, and [Lenis](https://github.com/darkroomengineering/lenis) smooth scrolling, served from `assets/js/vendor/` |
| Type | Anek Latin and Anek Tamil (Ek Type), Martian Mono, self-hosted from `assets/fonts/` |
| Hosting | GitHub Pages or any static HTTP server |

## Getting started

You need **Python 3** for the preview server and a modern browser.

```sh
git clone https://github.com/Mr-Vicky-01/Portfolio.git
cd Portfolio
python -m http.server 8000 --bind 127.0.0.1
```

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)**. Use the HTTP server rather than opening `index.html` directly, so fonts and scripts load correctly.

## Project structure

```text
Portfolio/
├── index.html                  # Homepage
├── projects/                   # Case-study pages (generated)
├── 404.html                    # Not-found page served by GitHub Pages
├── sitemap.xml                 # Published pages, for search engines
├── assets/
│   ├── css/site.css            # All styles
│   ├── js/
│   │   ├── field.js            # Particle engine (WebGL)
│   │   ├── emblems.js          # Project emblems the particles draw, keyed by project slug
│   │   ├── site.js             # Scrolling, sections, cursor, transitions
│   │   └── vendor/             # GSAP, ScrollTrigger, Lenis
│   ├── fonts/                  # Anek Latin, Anek Tamil (subset), Martian Mono
│   └── img/
│       ├── portrait-balanced.webp
│       └── og-card.jpg         # 1200×630 link-preview image
└── scripts/
    ├── build_projects.py       # Generates project pages and the homepage gallery
    └── check_site.py           # Checks links, IDs and merge markers
```

## Editing content

| To change… | Edit… |
| --- | --- |
| Hero, statement, SecuriTron, experience, about, contact | `index.html` |
| Projects (text, stack, links, order) | `PROJECTS` in `scripts/build_projects.py`, then run `python scripts/build_projects.py` |
| Colours, type and layout | `assets/css/site.css` |
| Particle shapes | `data-particles` slots in the HTML; the engine is `assets/js/field.js` |
| Project emblems | `assets/js/emblems.js`; a new project needs a drawing under its slug (without one, the gallery simply skips it) |

The project pages and the homepage gallery (between the `projects:start` and `projects:end` markers) are generated. Edit the list in the script rather than the output.

## Motion, accessibility and performance

- Visitors who turn on reduced motion in their system settings get a still version with the real photograph, no smooth scrolling and no pinned sections.
- Without JavaScript or WebGL, every section still reads in full: the name and Tamil greeting show as text and the photograph replaces the particles.
- Hover effects and the custom cursor only apply to devices with a mouse. Phones get fewer particles, a vertical project list and no pinning.
- The homepage loads about 430 KB before compression: fonts about 150 KB (the Tamil font is subset to the two words it shows, 10 KB), scripts about 160 KB, and the portrait 76 KB.
- Rendering pauses while the tab is hidden.

## Hosting

Publish the repository root with GitHub Pages. Before pushing, run:

```sh
python scripts/check_site.py
```

It checks for unresolved merge markers, duplicate IDs, broken local links and filename capitalization mismatches.

`404.html` uses `/Portfolio/`-prefixed paths because GitHub Pages serves it at any missing address. If the site moves to a custom domain, update the absolute URLs in the page heads, `sitemap.xml`, `404.html` and `SITE` in `scripts/build_projects.py`.

## Sharing and search

Every page carries Open Graph and Twitter card tags that point to `assets/img/og-card.jpg`, and the homepage includes schema.org `Person` data. Submit `sitemap.xml` in Google Search Console.

## Connect

- **Email:** [pachaiappan.dev@gmail.com](mailto:pachaiappan.dev@gmail.com)
- **LinkedIn:** [Pachaiappan](https://www.linkedin.com/in/pachaiappan)
- **GitHub:** [Mr-Vicky-01](https://github.com/Mr-Vicky-01)
- **Hugging Face:** [Mr-Vicky-01](https://huggingface.co/Mr-Vicky-01)
