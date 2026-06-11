from PIL import Image
import os

folder = r"C:\Users\Saidk\Downloads\Pdf-20260611T030924Z-3-001\Pdf"

# Ordered image list:
# 1. Cover
# 2. GLP Safety (health section opener, per user instructions)
# 3-13. Health images
# 14-32. Peptide guides
# 33. Bacteriostatic Water "Demonized" (second to last)
# 34. Inner Animal poster (last)

image_order = [
    # COVER
    "file_00000000a0d471fdb426c33a450fc10e.png",
    # HEALTH SECTION
    "glp-safety-ruleouts (1).png",
    "glp-warning-signs.png",
    "no-guilt-glp-medications.png",
    "glp-headache-area.png",
    "gallbladder-pain-area.png",
    "pancreas-pain-area.png",
    "fat-loss-toxins.png",
    "rotateinjecsite.png",
    "badbacguide.jpg",
    "guide-bac-water.png",
    "guide-peptide-storage.png",
    "2c7678c8cfa6303d8ca132c7788b7fe9.png",
    # PEPTIDE SECTION
    "c7a7d7ca20fd666c75d39271fcc97a3b.png",
    "1fe5b0accbec9c1de75178324352cd0b.png",
    "6c6a588f255dc229fafb63deb6418d88.png",
    "ae8699a88071d2b6f3651e10e69bc1eb.png",
    "67b357fdc4e6da3b2960b0ff037f3d66.png",
    "abe0eb3fc062b2ed50e88d5483f4dcef.png",
    "7b32985ceae0ae3583afbff32dd45509.png",
    "BPC.png",
    "TB500.png",
    "kpv.png",
    "AOD.png",
    "NAD+.png",
    "cjc-ipamorelin-guide.png",
    "guide-ghkcu-reactions.png",
    "guide-ghkcu-expect.png",
    "4b57fb443d7764d72bf0fc6de7a96b50.png",
    "6f18dcff1ab4ba2faaac6d9dced8b998.png",
    "tesacheat.jpg",
    "motcss31cheat (1).jpg",
    # ENDING
    "file_00000000018071fd8abdceccca1595ce.png",
    "file_000000003d787230b9be350149419e61.png",
]

images = []
missing = []
for filename in image_order:
    path = os.path.join(folder, filename)
    if os.path.exists(path):
        img = Image.open(path).convert("RGB")
        images.append(img)
        print(f"  Added: {filename}")
    else:
        missing.append(filename)
        print(f"  MISSING: {filename}")

if missing:
    print(f"\nWarning: {len(missing)} file(s) not found.")

if images:
    output_path = os.path.join(folder, "VPN_Peptide_Guide.pdf")
    images[0].save(output_path, save_all=True, append_images=images[1:])
    print(f"\nDone! PDF saved: {output_path}")
    print(f"Total pages: {len(images)}")
else:
    print("\nNo images found!")
