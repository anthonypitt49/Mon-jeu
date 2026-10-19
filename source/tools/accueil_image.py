"""Image commune de l'écran de chargement (../assets/cartes/accueil.jpg), à partir d'une image générée par IA.

Usage : python3 tools/accueil_image.py <image source> [décalage=0.67] → ../assets/cartes/accueil.jpg (1920 × 1080).
Le sujet est poussé vers la droite (le texte de l'écran est à gauche) ; la bande du bas, où le service de génération met
son logo, est coupée ; le vide à gauche prolonge le bord de l'image puis s'assombrit ; léger renforcement de netteté
(l'image source fait ~970 px de large).
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter

src = Image.open(sys.argv[1]).convert('RGB')
centre = float(sys.argv[2]) if len(sys.argv) > 2 else 0.67
W, H = 1920, 1080
k = (H + 90) / src.height  # 90 px de plus : la bande du logo sort du cadre
im = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS)
im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
x = round(W * centre - im.width / 2)
out = Image.new('RGB', (W, H))
part = im.crop((max(0, -x), 0, max(0, -x) + min(W - max(x, 0), im.width - max(0, -x)), H))
if x > 0:  # vide à gauche : la colonne de bord étirée et floutée, assombrie vers la gauche, puis l'image fondue dedans
    F = 260  # (largeur du fondu, pour qu'aucune couture ne se voie)
    edge = im.crop((0, 0, 24, H)).resize((x + F, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(40))
    dark = Image.new('RGB', (x + F, H), (4, 8, 12))
    ramp = Image.linear_gradient('L').rotate(90, expand=True).resize((x + F, H))  # 255 à droite → 0 à gauche
    out.paste(Image.composite(edge, dark, ramp), (0, 0))
    fade = Image.linear_gradient('L').rotate(90, expand=True).resize((F, H))
    mask = Image.new('L', part.size, 255); mask.paste(fade, (0, 0))
    out.paste(part, (x, 0), mask)
else:
    out.paste(part, (0, 0))
dst = Path(__file__).resolve().parent.parent.parent / 'assets' / 'cartes' / 'accueil.jpg'
out.save(dst, quality=82, optimize=True, progressive=True)
print(dst, round(dst.stat().st_size / 1024), 'Ko')
