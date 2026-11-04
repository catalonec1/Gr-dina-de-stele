"""Build spreadsheet products: products/budget-planner and products/habit-tracker."""
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sheets  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "products")
NAMES = {"budget-planner": ("Budget-Planner", sheets.budget), "habit-tracker": ("Habit-Tracker", sheets.habits)}
README = ("{title}\nThree languages: English, Romanian, Russian (one .xlsx file each).\n"
          "Excel / LibreOffice: open the file. Google Sheets: upload it to Google Drive, then 'Open with Google Sheets'.\n"
          "Type only in the light-yellow cells. Everything else is calculated.\n"
          "Licence: personal use. Please do not resell or share the files.\n")


def main():
    for slug, (base, fn) in NAMES.items():
        d = os.path.join(OUT, slug, "files")
        os.makedirs(d, exist_ok=True)
        paths = []
        for lang in ("en", "ro", "ru"):
            p = os.path.join(d, "%s-%s.xlsx" % (base, lang.upper()))
            fn(lang, p)
            paths.append(p)
        with zipfile.ZipFile(os.path.join(OUT, slug, slug + ".zip"), "w", zipfile.ZIP_DEFLATED) as z:
            for p in paths:
                z.write(p, os.path.basename(p))
            z.writestr("README.txt", README.format(title=base.replace("-", " ")))
        print(slug, [os.path.basename(p) for p in paths])


if __name__ == "__main__":
    main()
