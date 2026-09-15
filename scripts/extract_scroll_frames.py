"""Build a compact scroll sequence; requires opencv-python and Pillow."""
import argparse
import json
from pathlib import Path

import cv2
from PIL import Image, ImageFilter

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--duration', type=float, default=8, help='seconds to keep, measured from the start')
args = parser.parse_args()
capture = cv2.VideoCapture(str(args.source))
fps = capture.get(cv2.CAP_PROP_FPS)
if not capture.isOpened() or fps <= 0:
    raise SystemExit('Cannot read source video')
duration = capture.get(cv2.CAP_PROP_FRAME_COUNT) / fps
capture_width = capture.get(cv2.CAP_PROP_FRAME_WIDTH)
capture_height = capture.get(cv2.CAP_PROP_FRAME_HEIGHT)
end = min(args.duration, duration)
if end <= 0:
    raise SystemExit('Requested duration removes the entire video')
output = Path(__file__).resolve().parents[1] / 'assets/img/sequence'
output.mkdir(parents=True, exist_ok=True)
sample_fps = 24
# Desktop runs above the 720p source: HiDPI canvases draw the frame near 2x, and a sharpened
# Lanczos upscale beats the browser's bilinear stretch at roughly the same byte cost.
variants = [('desktop', 1920, 86), ('mobile', 960, 86)]
count = 0
while count / sample_fps < end:
    capture.set(cv2.CAP_PROP_POS_MSEC, count / sample_fps * 1000)
    ok, frame = capture.read()
    if not ok:
        raise SystemExit(f'Cannot decode frame {count}')
    image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    for name, width, quality in variants:
        folder = output / name
        folder.mkdir(exist_ok=True)
        resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        if width > image.width:
            resized = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=2))
        resized.save(folder / f'{count:03}.webp', quality=quality, method=6)
    count += 1
capture.release()
manifest = dict(count=count, fps=sample_fps, sourceDuration=duration,
                requestedDuration=args.duration, endExclusive=end, lastFrameTime=(count-1)/sample_fps,
                sourceWidth=int(capture_width), sourceHeight=int(capture_height),
                variants={name: dict(width=width, quality=quality) for name, width, quality in variants})
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest))
for name, _, _ in variants:
    print(name, sum(p.stat().st_size for p in (output / name).glob('*.webp')), 'bytes')
