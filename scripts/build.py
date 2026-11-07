"""Reproduce English assets from the exact upstream deployed release."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
pairs = [line.split('\t', 1) for line in (root/'scripts/en.tsv').read_text().splitlines() if line]
pattern = re.compile('|'.join(re.escape(k) for k,v in sorted(pairs,key=lambda x:-len(x[0]))))
translations = dict(pairs)
def translate(text):
    return pattern.sub(lambda m: translations[m[0]], text)
html = (root/'scripts/original.html').read_text()
html = re.sub(r'<script type="module" crossorigin src="[^"]+"></script>', '<script type="module" src="./language.js"></script>\n  <link rel="stylesheet" href="./language.css">', html)
html = html.replace('  <link rel="stylesheet" href="./language.css">', '').replace('</head>', '  <link rel="stylesheet" href="./language.css">\n</head>')
html = html.replace('<div class="bar__tools">', '<div class="bar__tools"><nav class="language" aria-label="Language / Ngôn ngữ"><a href="./?lang=vi" lang="vi" data-lang="vi">VI</a><a href="./en.html?lang=en" lang="en" data-lang="en">EN</a></nav>')
(root/'index.html').write_text(html)
(root/'en.html').write_text(translate(html).replace('lang="vi">\n<head>', 'lang="en">\n<head>'))
(root/'bundle/english.js').write_text(translate((root/'bundle/index-O45g60J9.js').read_text()).replace('seating-map.svg','seating-map-en.svg').replace('.price,90,122,{size:37', '.price,90,122,{size:24'))
(root/'assets/seating-map-en.svg').write_text(translate((root/'assets/seating-map.svg').read_text()))
(root/'en.html').write_text((root/'en.html').read_text().replace('seating-map.svg','seating-map-en.svg'))
print('Built Vietnamese and English pages from upstream 9c7613d')
