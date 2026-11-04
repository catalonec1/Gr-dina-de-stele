"""Fill the spreadsheet templates with sample data, recalculate them in LibreOffice
(headless) and compare every computed total with values computed in Python.

python3 tests/test_sheets.py   -> exit 0 when all checks pass
"""
import datetime as dt
import os
import random
import shutil
import subprocess
import sys
import tempfile

from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(ROOT, "generator"))
import sheets  # noqa: E402
from sheets_i18n import S  # noqa: E402

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))


def recalc(src, tmp):
    out = os.path.join(tmp, "out")
    os.makedirs(out, exist_ok=True)
    prof = "file://" + os.path.join(tmp, "lo-profile")
    subprocess.run(["soffice", "-env:UserInstallation=" + prof, "--headless", "--calc", "--convert-to", "xlsx",
                    "--outdir", out, src], check=True, capture_output=True, timeout=180)
    return load_workbook(os.path.join(out, os.path.basename(src)), data_only=True)


def near(a, b):
    return a is not None and abs(float(a) - float(b)) < 0.005


def errors_in(wb):
    bad = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and c.value.startswith("#") and c.value.rstrip("!?/0").upper() in (
                        "#REF", "#NAME", "#VALUE", "#DIV", "#N/A", "#NUM", "ERR:", "#NULL"):
                    bad.append("%s!%s=%s" % (ws.title, c.coordinate, c.value))
                if isinstance(c.value, str) and (c.value.startswith("Err:") or c.value in ("#NAME?", "#REF!", "#VALUE!", "#DIV/0!", "#N/A")):
                    bad.append("%s!%s=%s" % (ws.title, c.coordinate, c.value))
    return bad


def test_budget(lang, tmp):
    t = S[lang]
    src = os.path.join(tmp, "b-%s.xlsx" % lang)
    sheets.budget(lang, src)
    wb = load_workbook(src)
    rng = random.Random(7)
    year = sheets.DEFAULT_YEAR
    inc = t["income_default"]
    exp = t["expense_default"]
    tx = wb[t["tx"]]
    expect = {}  # (month, category) -> sum
    rows = []
    for i in range(300):
        y = year if i % 25 else year - 1  # some rows in another year must be ignored
        m = rng.randint(1, 12)
        d = rng.randint(1, 28 if m == 2 else 30)
        cat = rng.choice(inc + exp)
        amt = round(rng.uniform(1, 900), 2)
        rows.append((dt.date(y, m, d), cat, amt))
        if y == year:
            expect[(m, cat)] = expect.get((m, cat), 0) + amt
    # boundary dates: last day of month and first day of next month
    for (d, cat, amt) in ((dt.date(year, 1, 31), exp[0], 100.0), (dt.date(year, 2, 1), exp[0], 50.0), (dt.date(year, 12, 31), inc[0], 10.0)):
        rows.append((d, cat, amt))
        expect[(d.month, cat)] = expect.get((d.month, cat), 0) + amt
    for r, (d, cat, amt) in enumerate(rows, start=2):
        tx.cell(row=r, column=1, value=d)
        tx.cell(row=r, column=2, value=cat)
        tx.cell(row=r, column=4, value=amt)
    planned = {}
    for m, mname in enumerate(t["months"], start=1):
        ws = wb[mname]
        for i in range(len(exp)):
            v = 100 + i
            ws.cell(row=22 + i, column=2, value=v)
            planned[(m, exp[i])] = v
    # savings goals: far deadline
    gs = wb[t["goals"]]
    gs["C2"] = dt.date(dt.date.today().year + 1, dt.date.today().month, 1)
    dp = wb[t["deposits"]]
    g0 = t["goals_default"][0][0]
    for r, a in enumerate((500, 250.5, 249.5), start=2):
        dp.cell(row=r, column=1, value=dt.date(year, 1, r))
        dp.cell(row=r, column=2, value=g0)
        dp.cell(row=r, column=3, value=a)
    filled = os.path.join(tmp, "bf-%s.xlsx" % lang)
    wb.save(filled)
    out = recalc(filled, tmp)
    check("budget %s: no formula errors" % lang, not errors_in(out), str(errors_in(out)[:5]))
    ok, detail = True, []
    year_inc = year_exp = 0
    for m, mname in enumerate(t["months"], start=1):
        ws = out[mname]
        ti = te = 0
        for i, cat in enumerate(inc):
            v = expect.get((m, cat), 0)
            ti += v
            if not near(ws.cell(row=9 + i, column=3).value, v):
                ok = False
                detail.append((mname, cat, ws.cell(row=9 + i, column=3).value, v))
        for i, cat in enumerate(exp):
            v = expect.get((m, cat), 0)
            te += v
            if not near(ws.cell(row=22 + i, column=3).value, v):
                ok = False
                detail.append((mname, cat, ws.cell(row=22 + i, column=3).value, v))
            if not near(ws.cell(row=22 + i, column=4).value, planned[(m, cat)] - v):
                ok = False
                detail.append((mname, cat, "left"))
        ok &= near(ws["B3"].value, ti) and near(ws["B4"].value, te) and near(ws["B5"].value, ti - te)
        if ti:
            ok &= near(ws["B6"].value, (ti - te) / ti)
        ok &= str(year) in str(ws["A1"].value)
        year_inc += ti
        year_exp += te
    check("budget %s: monthly actuals match transactions (incl. month boundaries, other year ignored)" % lang, ok, str(detail[:3]))
    sm = out[t["summary"]]
    check("budget %s: year summary totals" % lang, near(sm["B16"].value, year_inc) and near(sm["C16"].value, year_exp) and near(sm["D16"].value, year_inc - year_exp))
    check("budget %s: empty category rows stay blank" % lang, out[t["months"][0]].cell(row=9 + len(inc), column=3).value in (None, ""))
    g = out[t["goals"]]
    check("budget %s: goal saved = deposits" % lang, near(g["D2"].value, 1000) and near(g["E2"].value, t["goals_default"][0][1] - 1000))
    check("budget %s: progress bar text" % lang, isinstance(g["F2"].value, str) and g["F2"].value.count("█") == round(10 * 1000 / t["goals_default"][0][1]) and g["F2"].value.endswith("%"), str(g["F2"].value))
    check("budget %s: needed per month = remaining / 12" % lang, near(g["G2"].value, (t["goals_default"][0][1] - 1000) / 12), str(g["G2"].value))
    check("budget %s: unused goal rows blank" % lang, g["D11"].value in (None, "") and g["F11"].value in (None, ""))
    # category drop-down covers all categories
    st = out[t["setup"]]
    lst = [st.cell(row=r, column=4).value for r in range(sheets.INC0, sheets.INC0 + sheets.N_INC + sheets.N_EXP)]
    check("budget %s: drop-down list holds every category" % lang, all(c in lst for c in inc + exp))


def test_habits(lang, tmp):
    t = S[lang]
    src = os.path.join(tmp, "h-%s.xlsx" % lang)
    sheets.habits(lang, src)
    wb = load_workbook(src)
    y = sheets.DEFAULT_YEAR
    feb = wb[t["months"][1]]
    marks = {0: 28, 1: 14, 2: 0}
    for row, n in marks.items():
        for d in range(1, n + 1):
            feb.cell(row=5 + row, column=1 + d, value="✓")
    filled = os.path.join(tmp, "hf-%s.xlsx" % lang)
    wb.save(filled)
    out = recalc(filled, tmp)
    check("habits %s: no formula errors" % lang, not errors_in(out), str(errors_in(out)[:5]))
    days_ok = all(out[mn]["AK1"].value == [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i] for i, mn in enumerate(t["months"]))
    check("habits %s: days in month (%d, non-leap Feb)" % (lang, y), days_ok)
    f = out[t["months"][1]]
    check("habits %s: Feb done counts" % lang, [f.cell(row=5 + r, column=33).value for r in range(3)] == [28, 14, 0])
    check("habits %s: Feb rate 100%%/50%%/0%%" % lang, near(f["AH5"].value, 1) and near(f["AH6"].value, 0.5) and near(f["AH7"].value, 0))
    check("habits %s: progress bar" % lang, f["AI5"].value == "█" * 10 and f["AI6"].value == "█" * 5 + "░" * 5)
    check("habits %s: habit names copied to other months" % lang, f["A5"].value == t["habits_default"][0])
    wd = dt.date(y, 2, 1).weekday()
    check("habits %s: weekday header" % lang, f["B3"].value == t["dow"][wd] and f["AE3"].value in (None, "") and f["AC3"].value == t["dow"][dt.date(y, 2, 28).weekday()])
    check("habits %s: blank rows stay blank" % lang, f["AG19"].value in (None, "") and f["AH19"].value in (None, ""))


def main():
    tmp = tempfile.mkdtemp()
    try:
        for lang in ("en", "ro", "ru"):
            test_budget(lang, tmp)
            test_habits(lang, tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    failed = [r for r in results if not r[1]]
    for n, ok, d in results:
        print("ok  " if ok else "FAIL", n, "" if ok else d)
    print("%d checks, %d failed" % (len(results), len(failed)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
