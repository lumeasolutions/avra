#!/usr/bin/env python3
"""
Générateur des icônes AVRA (PWA + favicon + écran d'accueil iOS/Android).

    python scripts/generate-icons.py

Source : public/nouveaulogochouette.webp (la chouette, fond transparent).

POURQUOI CE SCRIPT
------------------
L'ancien scripts/generate-icons.js pointait vers un `nouveaulogochouette.png`
qui n'existe plus (le logo est passé en .webp), il ne pouvait donc plus tourner.
Il est remplacé par celui-ci, qui utilise Pillow — déjà disponible — plutôt que
sharp.

TAILLE DE LA CHOUETTE (sept. 2026, demande cofondatrice : « il faudrait la
grossir »)
------------------------------------------------------------------------------
- Icônes normales et iOS : la chouette occupe 92 % de la hauteur du cadre
  (avant : 78 %). Sur iOS le système applique lui-même son masque arrondi, on
  peut donc remplir largement.
- Icônes « maskable » (Android) : 62 % seulement, et ce n'est pas un oubli.
  Android peut recadrer l'icône en cercle ; seul un disque de 80 % du côté est
  garanti visible. La chouette étant en portrait (ratio 0,78), sa demi-diagonale
  vaut H/2 x 1,27 : au-delà de 63 % de hauteur, les aigrettes sortent du cercle
  et se font couper. 62 % est donc le maximum sûr.
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'public', 'nouveaulogochouette.webp')
ICONS_DIR = os.path.join(ROOT, 'public', 'icons')
APP_DIR = os.path.join(ROOT, 'app')

BG = (0x1e, 0x2b, 0x22, 255)          # vert AVRA, identique au theme_color
SCALE_ANY = 0.92                       # icônes normales + iOS
SCALE_MASKABLE = 0.62                  # zone de sécurité Android (voir en-tête)

STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
MASKABLE_SIZES = [192, 512]


def load_owl() -> Image.Image:
    """Charge la chouette et retire d'éventuelles marges transparentes."""
    owl = Image.open(SOURCE).convert('RGBA')
    bbox = owl.split()[-1].getbbox()
    return owl.crop(bbox) if bbox else owl


def render(owl: Image.Image, size: int, scale: float) -> Image.Image:
    """Chouette centrée sur fond AVRA, dimensionnée par sa HAUTEUR."""
    canvas = Image.new('RGBA', (size, size), BG)
    target_h = max(1, round(size * scale))
    target_w = max(1, round(owl.width * target_h / owl.height))
    if target_w > size:                       # sécurité si le logo devenait large
        target_w = size
        target_h = round(owl.height * target_w / owl.width)
    resized = owl.resize((target_w, target_h), Image.LANCZOS)
    canvas.alpha_composite(resized, ((size - target_w) // 2, (size - target_h) // 2))
    return canvas


def main() -> None:
    if not os.path.exists(SOURCE):
        raise SystemExit(f'Source introuvable : {SOURCE}')
    os.makedirs(ICONS_DIR, exist_ok=True)
    owl = load_owl()
    print(f'Source : {owl.width}x{owl.height}')

    for s in STANDARD_SIZES:
        out = os.path.join(ICONS_DIR, f'icon-{s}x{s}.png')
        render(owl, s, SCALE_ANY).save(out)
        print(f'  icon-{s}x{s}.png')

    for s in MASKABLE_SIZES:
        out = os.path.join(ICONS_DIR, f'icon-maskable-{s}x{s}.png')
        render(owl, s, SCALE_MASKABLE).save(out)
        print(f'  icon-maskable-{s}x{s}.png')

    # iOS « Ajouter à l'écran d'accueil »
    apple = render(owl, 180, SCALE_ANY)
    apple.save(os.path.join(ICONS_DIR, 'apple-touch-icon.png'))
    apple.save(os.path.join(APP_DIR, 'apple-icon.png'))
    print('  apple-touch-icon.png + app/apple-icon.png')

    # Favicon (onglet du navigateur)
    render(owl, 32, SCALE_ANY).save(os.path.join(APP_DIR, 'icon.png'))
    render(owl, 256, SCALE_ANY).save(
        os.path.join(APP_DIR, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print('  app/icon.png + app/favicon.ico')
    print('\nTerminé.')


if __name__ == '__main__':
    main()
