"""Generate an English source edition; Vite builds both with shared dependencies."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
pairs = [line.split('\t', 1) for line in (root/'scripts/en.tsv').read_text().splitlines() if line]
pairs.append(("'Vé'", "'Tickets'"))
pattern = re.compile('|'.join(re.escape(k) for k,v in sorted(pairs,key=lambda x:-len(x[0]))))
translations = dict(pairs)
def translate(text, js=False):
    def replacement(m):
        result = translations[m[0]]
        if js and m[0] != "'Vé'": result = result.replace("'", "\\'")
        return result
    return pattern.sub(replacement, text)
source=root/'source'; target=source/'src-en';target.mkdir(exist_ok=True)
for p in (source/'src').iterdir():
    if p.is_file():
        text=translate(p.read_text(),p.suffix=='.js').replace('seating-map.svg','seating-map-en.svg')
        (target/p.name).write_text(text)
html=translate((source/'index.html').read_text()).replace('<html lang="vi">','<html lang="en">').replace('seating-map.svg','seating-map-en.svg')
(source/'en.html').write_text(html)
(root/'public/assets/seating-map-en.svg').write_text(translate((root/'public/assets/seating-map.svg').read_text()))
print('Generated English source and HTML')
