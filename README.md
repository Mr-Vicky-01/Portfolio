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

My personal portfolio brings together projects, engineering experience, and interests across generative AI, computer vision, and application development. It pairs an editorial layout with an interactive 3D workspace and a scroll-driven presentation of selected work.

The site runs directly from static HTML, CSS, and JavaScript. There is no application build step or backend to configure.

## Experience

- **Interactive 3D workspace** - a procedural desk, monitor, keyboard, and floating panels built with Three.js. Pointer movement and scrolling change the view.
- **Cinematic project showcase** - sticky artwork transitions between featured projects on desktop; mobile visitors see stacked image-and-text sections.
- **Responsive visual system** - warm-white content, a dark hero, cobalt accents, and a shared design across the homepage and eleven project pages.
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
| 3D rendering          | Three.js **0.183.2**, loaded through an import map                            |
| Visual assets         | Local SVG illustrations, responsive image variants, and an AI-edited portrait |
| Hosting               | GitHub Pages or any static HTTP server                                        |

The 3D workspace uses geometric primitives and generated screen textures. It does not require downloaded models or a model-hosting service. Project illustrations are conceptual visuals, not application screenshots.

## Getting started

You need **Python 3** for the preview server and a modern browser. Internet access loads the existing Three.js CDN dependency and Google Fonts; the page provides static artwork and system-font fallbacks.

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
| Workspace geometry, materials, lighting, and camera     | `assets/js/workspace.js`                            |
| Portrait and project artwork                            | `assets/img/` and the corresponding HTML references |

Keep asset paths relative to support hosting under a repository subdirectory. When changing the portrait, preserve natural color and the navy background treatment; its display does not use desaturation or screen blending.

## Motion and performance

The scene loads after initial page content. Rendering pauses when the workspace is offscreen or the browser tab is hidden. Pixel density is capped at **1.75** on desktop and **1.25** on narrow screens, with narrow-screen rendering limited to approximately **30 fps**.

The site honors the operating system’s reduced-motion preference. In that mode, project compositions remain static and the initial Three.js download is skipped. About disclosure panels also work without JavaScript.

Before publishing changes, check the layouts at **360, 768, 1440, and 1920px**, including mobile landscape. Verify keyboard focus, the mobile menu, project transitions in both scroll directions, direct section links, and the static experience with reduced motion or unavailable WebGL.

## Hosting

Publish the repository root with GitHub Pages or another static host. The delivered files are the deployable site; no generated build directory is needed.

Before committing or pushing, run the source check from the repository root:

```sh
python scripts/check_site.py
```

This checks for unresolved merge markers, duplicate page sections and IDs, broken local HTML references, and filename capitalization mismatches. Resolve any reported errors before publishing, then preview the page again. GitHub Pages serves the committed files, so a merge containing both an old and a new layout will also appear broken online.

Google Fonts, the pinned Three.js dependency, and the existing analytics integrations are external. Contact actions use email, phone, and profile links rather than a server-backed form.

## Connect

- **Email:** [pachaiappan.dev@gmail.com](mailto:pachaiappan.dev@gmail.com)
- **LinkedIn:** [Pachaiappan](https://www.linkedin.com/in/pachaiappan)
- **GitHub:** [Mr-Vicky-01](https://github.com/Mr-Vicky-01)
- **Hugging Face:** [Mr-Vicky-01](https://huggingface.co/Mr-Vicky-01)
