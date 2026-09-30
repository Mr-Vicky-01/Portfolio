"""Generate project case-study pages and the homepage gallery from one list. Python 3, no dependencies.

Run from the repository root after editing PROJECTS:  python scripts/build_projects.py
"""

from html import escape
from itertools import combinations
from pathlib import Path
import re

from brand_mark import inline as brand_mark

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://mr-vicky-01.github.io/Portfolio/"
RESUME = "https://drive.google.com/file/d/1aYZn20vcKParU_rI19CHoCIzECzXAXwS/view?usp=sharing"
GH = "https://github.com/Mr-Vicky-01/"
HF = "https://huggingface.co/spaces/Mr-Vicky-01/"

# Order here is the order on the homepage and the "Next project" chain.
PROJECTS = [
    dict(
        slug="creta", hue="#ffb547", name="CRETA", type="Conversational AI",
        short="An AI assistant for questions and everyday exploration, built on Google's generative models.",
        overview="A conversational AI assistant for questions, information, and everyday exploration. Built with Streamlit and generative models to make complex technology feel approachable.",
        steps=["Ask questions through an interactive conversational interface.", "Generate responses with Google's generative AI models.", "Connect the experience with Python, LangChain, and Streamlit."],
        stack=["Python", "Streamlit", "Google GenAI", "LangChain", "pypdf", "Beautiful Soup"],
        links=[("Source", GH + "CRETA")],
    ),
    dict(
        slug="genxai", hue="#7aa2ff", name="GenXAi", type="Developer tools",
        short="A coding companion that answers programming questions with Gemini through LangChain.",
        overview="GenXAi (Generative eXpert AI) helps developers explore coding questions and problems. Gemini and LangChain power a conversational interface that turns technical queries into useful responses.",
        steps=["Enter a coding question or describe a programming problem.", "Process the request with Gemini through LangChain.", "Explore the generated response in a Streamlit interface."],
        stack=["Python", "Google GenAI", "Streamlit", "LangChain"],
        links=[("Live demo", HF + "Code_Assistant"), ("Source", GH + "Code-Assistant")],
    ),
    dict(
        slug="rag", hue="#ff7a59", name="Chat With PDF", type="Retrieval-augmented generation",
        short="Ask questions across several PDFs and get answers grounded in the retrieved passages.",
        overview="A document question-answering application that lets users chat with multiple PDFs. It combines document extraction, BAAI embeddings, and a Llama model to answer questions using relevant document content.",
        steps=["Extract content from uploaded PDF documents.", "Embed and retrieve relevant passages using vector search.", "Generate answers grounded in the retrieved document context."],
        stack=["LlamaIndex", "FAISS", "ChromaDB", "LangChain", "pypdf", "Hugging Face", "Streamlit", "Python"],
        links=[("Live demo", HF + "chat-with-PDF"), ("Source", GH + "Chat-with-PDF")],
    ),
    dict(
        slug="english_teacher", hue="#c792ea", name="English Teacher", type="Language AI",
        short="Turns Tamil or Tanglish into correct English, then reads it aloud.",
        overview="An AI language assistant that turns Tamil or Tanglish queries into grammatically correct English. Google's generative AI and Hugging Face models support translation and spoken output.",
        steps=["Enter a query in Tamil or Tanglish.", "Generate a grammatically correct English sentence.", "Listen to the translated sentence with text-to-speech."],
        stack=["Transformers", "Google GenAI", "LangChain", "Keras", "Hugging Face API", "Streamlit", "Python"],
        links=[("Source", GH + "English-Teaching-AI")],
    ),
    dict(
        slug="sign-detection", hue="#5eead4", name="Hand Sign Detection", type="Computer vision",
        short="Real-time hand sign recognition from a webcam, for left and right hands.",
        overview="A real-time hand sign recognition system built with OpenCV, MediaPipe, and a convolutional neural network. It identifies left and right hands and updates recognized signs as the camera feed changes.",
        steps=["Track hand landmarks with MediaPipe.", "Process camera frames with OpenCV.", "Recognize signs and display live visual feedback."],
        stack=["OpenCV", "MediaPipe", "TensorFlow", "Keras", "scikit-learn", "NumPy", "pandas", "Python"],
        links=[("Source", GH + "hand-sign-detection")],
    ),
    dict(
        slug="story-teller", hue="#f59ec2", name="Story Teller", type="Multimodal AI",
        short="Captions an image, writes a short story from it, and narrates the story.",
        overview="An image-to-story pipeline that combines image captioning, language generation, and text-to-speech. Hugging Face Transformers and LangChain turn visual input into short stories that can also be heard.",
        steps=["Generate a caption from an input image.", "Expand the caption into a short story.", "Convert the generated story into audio."],
        stack=["Transformers", "LangChain", "Hugging Face API", "gTTS", "NLTK", "Keras", "Streamlit", "Python"],
        links=[("Source", GH + "Story-Teller")],
    ),
    dict(
        slug="screenshot_html", hue="#a3e635", name="ScreenShot-HTML", type="Generative developer tools",
        short="Generates HTML and CSS from a screenshot of a web page.",
        overview="An application that generates HTML and CSS from webpage screenshots. Google's generative AI models interpret the image and recreate its structure and visual styling.",
        steps=["Upload a screenshot of a webpage.", "Generate HTML and CSS from the visual reference.", "Inspect the generated code and recreate the layout."],
        stack=["Google GenAI", "LangChain", "Transformers", "Streamlit", "HTML", "CSS", "Python"],
        links=[("Source", GH + "Screenshot-HTML")],
    ),
    dict(
        slug="web-app", hue="#38bdf8", name="Deep Learning Web-App", type="Computer vision",
        short="Image classification with a convolutional network, served through FastAPI.",
        overview="An image classification application that brings deep learning models to the browser. A FastAPI backend connects image processing and inference to a straightforward web interface.",
        steps=["Upload images through a web interface.", "Classify images with convolutional neural networks.", "Serve predictions with FastAPI and Uvicorn."],
        stack=["TensorFlow", "Keras", "FastAPI", "Uvicorn", "NumPy", "pandas", "JavaScript", "Python"],
        links=[("Live demo", HF + "Web-App"), ("Source", GH + "Deep-learining-App")],
    ),
    dict(
        slug="rps", hue="#fcd34d", name="Rock Paper Scissor", type="Vision and play",
        short="Play Rock Paper Scissors against the computer with hand gestures.",
        overview="A real-time Rock Paper Scissor game against an AI opponent. Python, TensorFlow, OpenCV, and MediaPipe connect hand gesture recognition with a Tkinter desktop interface.",
        steps=["Recognize hand gestures from a live camera feed.", "Play against an AI-powered opponent.", "Keep the game modular with an object-oriented architecture."],
        stack=["TensorFlow", "Keras", "OpenCV", "MediaPipe", "scikit-learn", "Tkinter", "Python"],
        links=[("Source", GH + "Stone-Paper-Scissor")],
    ),
]


def lines(name, max_len):
    """Split a title into balanced lines for the particle text, e.g. 'ROCK PAPER|SCISSOR'."""
    words = name.upper().replace("-", "- ").split()
    if len(name) <= max_len or len(words) == 1:
        return name.upper()
    join = lambda ws: " ".join(ws).replace("- ", "-")
    count = min(len(words), -(-len(name) // max_len))
    best = None
    for cuts in combinations(range(1, len(words)), count - 1):
        parts = [join(words[a:b]) for a, b in zip((0, *cuts), (*cuts, len(words)))]
        score = max(map(len, parts))
        if best is None or score < best[0]:
            best = (score, parts)
    return "|".join(best[1])


HEAD_SCRIPT = """    <script>
      (function (r) {
        r.classList.add("js");
        try {
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          if (localStorage.getItem("motion") === "off") return r.classList.add("motion-off");
          r.classList.add("motion");
          if (sessionStorage.getItem("pt") === "1") r.classList.add("pt-in");
        } catch (e) {}
      })(document.documentElement);
    </script>"""


def header(prefix):
    return f"""    <header class="hdr mono">
      <a class="brand" href="{prefix}index.html" data-title="Pachaiappan">{brand_mark()}<b>Pachaiappan</b><span lang="ta">பச்சையப்பன்</span></a>
      <nav aria-label="Main">
        <a href="{prefix}index.html#work" data-title="Work" data-scramble>Work</a><a href="{prefix}index.html#about" data-title="About" data-scramble>About</a><a href="{prefix}index.html#contact" data-title="Contact" data-scramble>Contact</a><a
          href="{RESUME}"
          target="_blank"
          rel="noopener noreferrer"
          data-scramble
          >Resume ↗</a
        >
      </nav>
      <span class="clock"><span class="hide-sm">Puducherry </span><span data-clock>--:--:--</span> IST</span>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu>Menu</button>
    </header>
    <div class="menu" id="menu" hidden>
      <nav aria-label="Menu"><a href="{prefix}index.html#work" data-title="Work">Work</a><a href="{prefix}index.html#about" data-title="About">About</a><a href="{prefix}index.html#contact" data-title="Contact">Contact</a><a href="{RESUME}" target="_blank" rel="noopener noreferrer">Resume ↗</a></nav>
      <a class="foot-mail" href="mailto:pachaiappan.dev@gmail.com">pachaiappan.dev@gmail.com</a>
      <div class="menu-links mono">{social_pills()}</div>
    </div>"""


SOCIAL = [
    ("GitHub", "https://github.com/Mr-Vicky-01"),
    ("LinkedIn", "https://www.linkedin.com/in/pachaiappan"),
    ("Hugging Face", "https://huggingface.co/Mr-Vicky-01"),
    ("LeetCode", "https://leetcode.com/u/vicky_1102/"),
]
EXT = 'target="_blank" rel="noopener noreferrer"'


def social_pills():
    return "".join(f'<a class="pill" href="{h}" {EXT}>{n} ↗</a>' for n, h in SOCIAL)


def layers():
    return """    <a class="skip" href="#main">Skip to content</a>
    <canvas id="field" aria-hidden="true"></canvas>
    <div class="atmos" aria-hidden="true"><i></i><i></i></div>
    <div class="guides" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="grain" aria-hidden="true"></div>
    <div class="coords mono" aria-hidden="true">X 0000 · Y 0000</div>
    <div class="cursor" aria-hidden="true"></div>
    <div class="ring" aria-hidden="true"><span></span></div>
    <div class="progress" aria-hidden="true"><i></i></div>
    <div class="curtain" aria-hidden="true"><span class="mono muted">Pachaiappan</span><span class="curtain-title"></span></div>"""


def footer(prefix, top_href):
    nav = "".join(f'<li><a href="{prefix}index.html#{i}" data-title="{n}">{n}</a></li>' for n, i in (("Work", "work"), ("About", "about"), ("Contact", "contact")))
    nav += f'<li><a href="{RESUME}" {EXT}>Resume ↗</a></li>'
    soc = "".join(f'<li><a href="{h}" {EXT}>{n} ↗</a></li>' for n, h in SOCIAL)
    return f"""    <footer>
      <span class="big-name" aria-hidden="true">PACHAIAPPAN</span>
      <div class="foot-grid">
        <div><p class="foot-brand">{brand_mark()}<b>Pachaiappan</b></p><h2 class="mono muted" style="margin-top: 28px">Say hello</h2><a class="foot-mail" href="mailto:pachaiappan.dev@gmail.com">pachaiappan.dev@gmail.com</a></div>
        <div><h2 class="mono muted">Navigate</h2><ul>{nav}</ul></div>
        <div><h2 class="mono muted">Elsewhere</h2><ul>{soc}</ul></div>
      </div>
      <div class="foot-row mono muted">
        <span>© 2026 Pachaiappan · Puducherry, India</span>
        <span><span data-clock>--:--:--</span> IST</span>
        <button class="motion-toggle" type="button" data-motion-toggle aria-pressed="true">Motion: on</button>
        <a href="{top_href}" data-scramble>Back to top ↑</a>
      </div>
    </footer>

    <script src="{prefix}assets/js/vendor/gsap.min.js" defer></script>
    <script src="{prefix}assets/js/vendor/ScrollTrigger.min.js" defer></script>
    <script src="{prefix}assets/js/vendor/lenis.min.js" defer></script>
    <script src="{prefix}assets/js/field.js" defer></script>
    <script src="{prefix}assets/js/site.js" defer></script>"""


def link_pills(links):
    return "".join(
        f'<a class="pill{" primary" if i == 0 else ""}" href="{escape(href)}" target="_blank" rel="noopener noreferrer" data-magnetic data-scramble>{escape(label)} ↗</a>'
        for i, (label, href) in enumerate(links)
    )


def project_page(p, index, prev, nxt):
    n, total = f"{index + 1:02d}", f"{len(PROJECTS):02d}"
    name, desc = escape(p["name"]), escape(p["overview"])
    url = f"{SITE}projects/{p['slug']}.html"
    steps = "\n".join(
        f'              <li class="stage"><span class="mono muted">{i + 1:02d}</span><b>{escape(s)}</b></li>' for i, s in enumerate(p["steps"])
    )
    stack = "".join(f"<li>{escape(s)}</li>" for s in p["stack"])
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>{name} - Pachaiappan</title>
    <meta name="description" content="{desc}" />
    <meta name="theme-color" content="#0c0c0b" />
    <link rel="canonical" href="{url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pachaiappan" />
    <meta property="og:url" content="{url}" />
    <meta property="og:title" content="{name} - Pachaiappan" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:image" content="{SITE}assets/img/og-card.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Pachaiappan, AI Engineer &amp; Developer" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="../favicon-32.png?v=p-signal-1" type="image/png" sizes="32x32" />
    <link rel="icon" href="../favicon.svg?v=p-signal-1" type="image/svg+xml" sizes="any" />
    <link rel="apple-touch-icon" href="../apple-touch-icon.png?v=p-signal-1" sizes="180x180" />
    <link rel="preload" href="../assets/fonts/anek-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="../assets/fonts/martian-mono.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="../assets/css/site.css" />
{HEAD_SCRIPT}
  </head>
  <body data-page="project">
{layers()}
{header("../")}

    <main id="main">
      <section class="hero p-hero" id="top" data-hero data-shape="name" aria-labelledby="p-title">
        <div class="name-slot" data-particles="name" data-text="{escape(lines(p["name"], 12))}" data-text-small="{escape(lines(p["name"], 8))}" aria-hidden="true"></div>
        <h1 class="hero-name" id="p-title">{name}</h1>
        <div class="p-foot">
          <div class="hero-meta mono muted" data-hero-fade>
            <span><b>Project {n} / {total}</b></span>
            <span>{escape(p["type"])}</span>
            <a class="ulink" href="../index.html#work" data-title="Selected work">← All projects</a>
          </div>
          <p class="tagline" data-hero-reveal>{escape(p["short"])}</p>
          <div class="actions" data-hero-fade>{link_pills(p["links"])}</div>
        </div>
      </section>

      <div class="p-cover" data-shape="dust">{cover(p, n)}</div>

      <section class="p-section" data-shape="dust" aria-labelledby="glance-title">
        <h2 class="mono muted" id="glance-title">At a glance</h2>
        <dl class="glance">
          <div><dt class="mono muted">Type</dt><dd>{escape(p["type"])}</dd></div>
          <div><dt class="mono muted">Key tools</dt><dd>{", ".join(escape(t) for t in p["stack"][:3])}</dd></div>
          <div><dt class="mono muted">Try it</dt><dd>{" · ".join(f'<a href="{escape(h)}" {EXT}>{escape(l)} ↗</a>' for l, h in p["links"])}</dd></div>
        </dl>
      </section>

      <section class="p-section" data-shape="dust" aria-labelledby="overview-title">
        <h2 class="mono muted" id="overview-title">Overview</h2>
        <p class="lead" data-reveal>{desc}</p>
      </section>

      <section class="p-section" data-shape="dust" aria-labelledby="how-title">
        <h2 class="mono muted" id="how-title">How it works</h2>
        <div class="steps">
          <div class="lane" aria-hidden="true"><div class="rail"><i></i></div></div>
          <ol class="stages">
{steps}
          </ol>
        </div>
      </section>

      <section class="p-section" data-shape="dust" aria-labelledby="stack-title">
        <h2 class="mono muted" id="stack-title">Stack</h2>
        <ul class="stack" data-rise>{stack}</ul>
      </section>

      <nav class="pn" aria-label="More projects">
        <a class="next" href="{prev["slug"]}.html" data-title="{escape(prev["name"])}" data-shape="dust" data-cursor="Previous">
          <span class="mono muted">← Previous · {(index - 1) % len(PROJECTS) + 1:02d} / {total}</span>
          <span class="big-title">{escape(prev["name"])}</span>
        </a>
        <a class="next" href="{nxt["slug"]}.html" data-title="{escape(nxt["name"])}" data-shape="dust" data-cursor="Next">
          <span class="mono muted">Next · {(index + 1) % len(PROJECTS) + 1:02d} / {total} →</span>
          <span class="big-title">{escape(nxt["name"])}</span>
        </a>
      </nav>
    </main>

{footer("../", "#top")}
  </body>
</html>
"""


def cover(p, n, cls=""):
    return (
        f'<div class="cover{cls}" style="--hue: {p["hue"]}" aria-hidden="true">'
        f'<canvas data-cover data-seed="{int(n) * 7919}" data-hue="{p["hue"]}"></canvas><span class="cover-n mono">{n}</span></div>'
    )


def gallery_panel(p, index):
    n, total = f"{index + 1:02d}", f"{len(PROJECTS):02d}"
    page = f"projects/{p['slug']}.html"
    name = escape(p["name"])
    external = "".join(
        f'<a href="{escape(href)}" target="_blank" rel="noopener noreferrer" data-scramble>{escape(label)} ↗</a>' for label, href in p["links"]
    )
    return f"""          <article class="panel" data-glyph="{n}" data-href="{page}" data-cursor="Open">
            <div class="glyph" data-align="center" aria-hidden="true"></div>
            {cover(p, n)}
            <div class="mono muted">{n} / {total} · {escape(p["type"])}</div>
            <div>
              <h3><a href="{page}" data-case data-title="{name}">{name}</a></h3>
              <p>{escape(p["short"])}</p>
            </div>
            <div>
              <div class="mono muted" style="margin-bottom: 18px">{" · ".join(escape(s) for s in p["stack"][:4])}</div>
              <div class="links mono"><a href="{page}" data-title="{name}" data-scramble>Case study →</a>{external}</div>
            </div>
          </article>"""


def main():
    for i, p in enumerate(PROJECTS):
        prev, nxt = PROJECTS[i - 1], PROJECTS[(i + 1) % len(PROJECTS)]
        (ROOT / "projects" / f"{p['slug']}.html").write_text(project_page(p, i, prev, nxt), encoding="utf-8")
    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    panels = "\n".join(gallery_panel(p, i) for i, p in enumerate(PROJECTS))
    html, count = re.subn(
        r"(<!-- projects:start -->\n).*?(\s*<!-- projects:end -->)", lambda m: m.group(1) + panels + m.group(2), html, flags=re.S
    )
    if count != 1:
        raise SystemExit("index.html: projects:start/end markers not found")
    index.write_text(html, encoding="utf-8")
    print(f"Wrote {len(PROJECTS)} project pages and the homepage gallery.")


if __name__ == "__main__":
    main()
