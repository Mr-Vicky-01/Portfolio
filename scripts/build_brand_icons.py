"""Rasterize favicon.svg into matching icons. Requires Pillow, Node and Playwright."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
with TemporaryDirectory(prefix='portfolio-brand-') as directory:
    rendered = Path(directory) / 'brand.png'
    subprocess.run(['node', str(ROOT / 'scripts/render_brand.cjs'), str(rendered)], check=True, cwd=ROOT)
    with Image.open(rendered) as source:
        image = source.convert('RGBA')
        for name, size in [('favicon-32.png', 32), ('favicon.png', 128), ('icon-192.png', 192), ('icon-512.png', 512)]:
            image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / name)
        touch = Image.new('RGBA', image.size, '#101a36')
        touch.alpha_composite(image)
        touch.convert('RGB').resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / 'apple-touch-icon.png')
        image.resize((256, 256), Image.Resampling.LANCZOS).save(
            ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('Built PNG, ICO and touch icons directly from favicon.svg.')
