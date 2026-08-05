import re, urllib.request, os, sys

UA = "curl/7.68.0"
FAMILIES = {
    "GreatVibes": "Great+Vibes",
    "Inter": "Inter:wght@400;600",
}
OUT = "src/lib/print/fonts"
os.makedirs(OUT, exist_ok=True)

for base, fam in FAMILIES.items():
    url = f"https://fonts.googleapis.com/css2?family={fam}&display=swap"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=30).read().decode()
    n = 0
    for block in re.findall(r"@font-face\s*{([^}]+)}", css):
        style = re.search(r"font-style:\s*(\w+)", block)
        weight = re.search(r"font-weight:\s*(\d+)", block)
        urls = re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+\.ttf)\)", block)
        if not urls:
            continue
        style_name = "Italic" if style and style.group(1) == "italic" else ("Regular" if weight and weight.group(1) == "400" else "SemiBold")
        name = f"{base}-{style_name}.ttf"
        chosen = next((u for u in urls if "latin" in u), urls[-1])
        dest = os.path.join(OUT, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 10000:
            print("exists", name)
            continue
        urllib.request.urlretrieve(chosen, dest)
        print("saved", name, os.path.getsize(dest), "bytes")
        n += 1
    if n == 0 and not os.listdir(OUT):
        print("WARN no files for", base, file=sys.stderr)
print("done")
