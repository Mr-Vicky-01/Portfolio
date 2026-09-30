"""The brand mark: a "P" drawn on a 5×7 dot grid, with one amber dot as the signal in the noise."""

P = [
    "XXXX.",
    "X...S",
    "X...X",
    "XXXX.",
    "X....",
    "X....",
    "X....",
]


def dots(step, r_on, r_off, x0=0, y0=0, ink="currentColor", amber="#ffb547"):
    out = []
    for row, line in enumerate(P):
        for col, cell in enumerate(line):
            cx, cy = x0 + step / 2 + col * step, y0 + step / 2 + row * step
            if cell == ".":
                out.append(f'<circle cx="{cx:g}" cy="{cy:g}" r="{r_off:g}" fill="{ink}" opacity=".28"/>')
            else:
                out.append(f'<circle cx="{cx:g}" cy="{cy:g}" r="{r_on:g}" fill="{amber if cell == "S" else ink}"/>')
    return "".join(out)


def inline(cls="mark"):
    """Small mark for page headers and footers; inherits the text colour."""
    return f'<svg class="{cls}" viewBox="0 0 50 70" aria-hidden="true">{dots(10, 3.6, 1.4)}</svg>'


def favicon():
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'
        "<title>Pachaiappan</title>"
        '<rect width="128" height="128" rx="28" fill="#0c0c0b"/>'
        f'{dots(13, 4.9, 1.9, 31.5, 18.5, ink="#edeae3")}'
        "</svg>\n"
    )


if __name__ == "__main__":
    from pathlib import Path

    (Path(__file__).resolve().parents[1] / "favicon.svg").write_text(favicon(), encoding="utf-8")
    print("Wrote favicon.svg; run scripts/build_brand_icons.py to rasterise it.")
