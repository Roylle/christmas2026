"""Copy the validated build to the repository root served by GitHub Pages."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
assert (root/'dist/index.html').exists()
for name in ('index.html','en.html'):
    shutil.copy2(root/'dist'/name,root/name)
for name in ('assets','bundle'):
    # Retain old hashed bundles so clients with cached HTML keep working.
    shutil.copytree(root/'dist'/name,root/name,dirs_exist_ok=True)
