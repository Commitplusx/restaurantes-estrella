"""Build display-sized variants from the existing artwork; originals stay intact.

Requires Pillow. Run from the repository root with Python 3.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def webp_variant(source: Path, destination: Path, width: int, height: int, quality: int) -> None:
    with Image.open(source) as image:
        output = ImageOps.exif_transpose(image).convert('RGB')
        output.thumbnail((width, height), Image.Resampling.LANCZOS)
        output.save(destination, 'WEBP', quality=quality, method=6)


for source in sorted((ROOT / 'public/categorias').glob('*.jpg')):
    webp_variant(source, source.with_suffix('.webp'), 160, 160, 84)

with Image.open(ROOT / 'public/estrella-circle.png') as image:
    for size in (192, 512):
        output = ImageOps.exif_transpose(image).convert('RGBA')
        output.thumbnail((size, size), Image.Resampling.LANCZOS)
        output.save(ROOT / f'public/estrella-icon-{size}.png', 'PNG', optimize=True)

for width in (480, 900):
    webp_variant(ROOT / 'public/desktop/comitan-table.webp',
                 ROOT / f'public/desktop/comitan-table-{width}.webp', width, 2000, 85)
