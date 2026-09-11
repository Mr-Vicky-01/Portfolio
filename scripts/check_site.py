"""Check first-party site sources before publishing; Python 3, no dependencies."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
CONFLICT = re.compile(r"^(?:<{7}(?: |$)|={7}\s*$|>{7}(?: |$)|\|{7}(?: |$))", re.M)


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = Counter()
        self.tags = Counter()
        self.refs = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags[tag] += 1
        if attrs.get("id"):
            self.ids[attrs["id"]] += 1
        for key in ("src", "href", "poster"):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if attrs.get("srcset"):
            self.refs.extend(item.strip().split()[0] for item in attrs["srcset"].split(",") if item.strip())


def check(root=ROOT):
    pages = [root / "index.html", *sorted((root / "projects").glob("*.html"))]
    sources = [*pages, root / "README.md"]
    for folder in ("assets/css", "assets/js", "assets/img"):
        sources.extend(p for p in (root / folder).rglob("*") if p.suffix in {".css", ".js", ".svg"})
    errors = []
    for path in sources:
        for match in CONFLICT.finditer(path.read_text(encoding="utf-8")):
            errors.append(f"{path.relative_to(root)}: unresolved merge marker at character {match.start()}")
    docs = {p: Document(p.read_text(encoding="utf-8")) for p in pages}
    references = 0
    for path, doc in docs.items():
        name = path.relative_to(root)
        for tag in ("html", "head", "body", "main", "h1"):
            if doc.tags[tag] != 1:
                errors.append(f"{name}: expected one <{tag}>, found {doc.tags[tag]}")
        for ident, count in doc.ids.items():
            if count > 1:
                errors.append(f"{name}: duplicate ID {ident}")
        for ref in doc.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc:
                continue
            references += 1
            if url.path.startswith("/"):
                errors.append(f"{name}: use a relative path for GitHub Pages: {ref}")
                continue
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            if target.is_dir():
                target /= "index.html"
            if not target.is_relative_to(root) or not target.is_file():
                errors.append(f"{name}: missing local resource {ref}")
                continue
            # Windows accepts incorrect capitalization; GitHub Pages does not.
            parent = root
            for part in target.relative_to(root).parts:
                if part not in {child.name for child in parent.iterdir()}:
                    errors.append(f"{name}: filename capitalization mismatch: {ref}")
                    break
                parent /= part
            if url.fragment and target in docs and unquote(url.fragment) not in docs[target].ids:
                errors.append(f"{name}: missing anchor {ref}")
    return errors, len(pages), references


if __name__ == "__main__":
    errors, pages, references = check()
    if errors:
        print("FAIL:\n" + "\n".join(errors))
        sys.exit(1)
    print(f"PASS: {pages} pages, {references} local references; no merge markers, duplicate IDs, or broken HTML links/assets.")
