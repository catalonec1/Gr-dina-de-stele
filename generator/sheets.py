"""Spreadsheet templates (.xlsx, works in Excel, LibreOffice and Google Sheets).

Only functions supported by all three are used (SUMIFS, COUNTIF, DATE, EOMONTH, WEEKDAY,
CHOOSE, REPT, ROUND, MIN, MAX, IF, YEAR, MONTH, TODAY). No data bars / macros.
"""
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

from sheets_i18n import S

DARK = "1E2230"
BLUE = "345AA6"
INPUT = PatternFill("solid", fgColor="FFF7CC")
HEAD = PatternFill("solid", fgColor=BLUE)
SUB = PatternFill("solid", fgColor="E8EDF7")
GREEN = PatternFill("solid", fgColor="CDEBC5")
GRAYF = PatternFill("solid", fgColor="E6E6E6")
WHITE_B = Font(bold=True, color="FFFFFF")
BOLD = Font(bold=True)
TITLE = Font(bold=True, size=18, color=DARK)
thin = Side(style="thin", color="C8CCD6")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
MONEY = '#,##0.00'
PCT = '0%'
DATEF = 'yyyy-mm-dd'
DEFAULT_YEAR = 2027

N_INC, N_EXP = 10, 25
INC0, EXP0 = 6, 18  # first category rows on the Setup sheet
TX_ROWS = 1000


def q(name):
    return "'%s'" % name.replace("'", "''")


def head(ws, row, labels, col=1):
    for i, lab in enumerate(labels):
        c = ws.cell(row=row, column=col + i, value=lab)
        c.fill = HEAD
        c.font = WHITE_B
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BOX


def fit_page(ws, landscape=False):
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def start_sheet(wb, t, title, lines):
    ws = wb.active
    ws.title = t["start"]
    ws["A1"] = title
    ws["A1"].font = TITLE
    for i, line in enumerate(lines):
        ws.cell(row=3 + i, column=1, value=line).alignment = Alignment(wrap_text=True, vertical="top")
    ws.cell(row=4 + len(lines), column=1, value=t["credit"]).font = Font(italic=True, color="777777", size=9)
    ws.column_dimensions["A"].width = 110
    for i in range(len(lines)):
        ws.row_dimensions[3 + i].height = 30
    ws.sheet_view.showGridLines = False
    return ws


# ---------------------------------------------------------------- budget

def budget(lang, path):
    t = S[lang]
    wb = Workbook()
    start_sheet(wb, t, t["budget_title"], t["budget_help"])

    # Setup
    st = wb.create_sheet(t["setup"])
    st["A1"] = t["setup"]
    st["A1"].font = TITLE
    st["A2"], st["B2"] = t["year"], DEFAULT_YEAR
    st["A3"], st["B3"] = t["currency"], "€"
    for c in ("B2", "B3"):
        st[c].fill = INPUT
        st[c].border = BOX
    st["A2"].font = st["A3"].font = BOLD
    head(st, INC0 - 1, [t["income_cats"]])
    head(st, EXP0 - 1, [t["expense_cats"]])
    for i in range(N_INC):
        c = st.cell(row=INC0 + i, column=1, value=t["income_default"][i] if i < len(t["income_default"]) else None)
        c.fill, c.border = INPUT, BOX
    for i in range(N_EXP):
        c = st.cell(row=EXP0 + i, column=1, value=t["expense_default"][i] if i < len(t["expense_default"]) else None)
        c.fill, c.border = INPUT, BOX
    # helper list D6:D40 = income then expense categories (for the drop-down)
    for i in range(N_INC):
        st.cell(row=INC0 + i, column=4, value="=IF(A%d=\"\",\"\",A%d)" % (INC0 + i, INC0 + i))
    for i in range(N_EXP):
        r = INC0 + N_INC + i
        st.cell(row=r, column=4, value="=IF(A%d=\"\",\"\",A%d)" % (EXP0 + i, EXP0 + i))
    st.column_dimensions["A"].width = 32
    st.column_dimensions["B"].width = 12
    st.column_dimensions["D"].hidden = True
    cat_list = "%s!$D$%d:$D$%d" % (q(t["setup"]), INC0, INC0 + N_INC + N_EXP - 1)
    YEAR = "%s!$B$2" % q(t["setup"])
    CUR = "%s!$B$3" % q(t["setup"])

    # Transactions
    tx = wb.create_sheet(t["tx"])
    head(tx, 1, [t["date"], t["category"], t["description"], t["amount"]])
    dv = DataValidation(type="list", formula1="=" + cat_list, allow_blank=True)
    tx.add_data_validation(dv)
    dv.add("B2:B%d" % (TX_ROWS + 1))
    dvd = DataValidation(type="date", operator="greaterThan", formula1="DATE(2000,1,1)", allow_blank=True)
    tx.add_data_validation(dvd)
    dvd.add("A2:A%d" % (TX_ROWS + 1))
    for r in range(2, TX_ROWS + 2):
        tx.cell(row=r, column=1).number_format = DATEF
        tx.cell(row=r, column=4).number_format = MONEY
        for col in range(1, 5):
            tx.cell(row=r, column=col).fill = INPUT
    for col, w in zip("ABCD", (13, 26, 36, 14)):
        tx.column_dimensions[col].width = w
    tx.freeze_panes = "A2"
    TXN = q(t["tx"])

    # Month sheets
    month_names = t["months"]
    for m, mname in enumerate(month_names, start=1):
        ws = wb.create_sheet(mname)
        ws["A1"] = '="%s "&%s' % (mname, YEAR)
        ws["A1"].font = TITLE
        ws["H1"] = "=DATE(%s,%d,1)" % (YEAR, m)
        ws["I1"] = "=DATE(%s,%d,1)" % (YEAR, m + 1)
        ws.column_dimensions["H"].hidden = True
        ws.column_dimensions["I"].hidden = True
        inc_r0, exp_r0 = 9, 22
        inc_tot = inc_r0 + N_INC
        exp_tot = exp_r0 + N_EXP
        kpis = [(t["income"], "=C%d" % inc_tot, MONEY), (t["expenses"], "=C%d" % exp_tot, MONEY),
                (t["balance"], "=B3-B4", MONEY), (t["savings_rate"], '=IF(B3=0,"",B5/B3)', PCT)]
        for i, (lab, f, fmt) in enumerate(kpis):
            a = ws.cell(row=3 + i, column=1, value=lab)
            a.font = BOLD
            b = ws.cell(row=3 + i, column=2, value=f)
            b.number_format = fmt
            b.font = BOLD
            b.fill = SUB
            b.border = BOX
        ws["C3"] = "=%s" % CUR
        for sec, r0, n, src0, sign in ((t["income"], inc_r0, N_INC, INC0, 1), (t["expenses"], exp_r0, N_EXP, EXP0, -1)):
            ws.cell(row=r0 - 2, column=1, value=sec).font = Font(bold=True, size=13, color=BLUE)
            lastcol = t["difference"] if sign == 1 else t["left"]
            head(ws, r0 - 1, [t["category"], t["planned"], t["actual"], lastcol])
            for i in range(n):
                r = r0 + i
                ws.cell(row=r, column=1, value="=IF(%s!A%d=\"\",\"\",%s!A%d)" % (q(t["setup"]), src0 + i, q(t["setup"]), src0 + i))
                b = ws.cell(row=r, column=2)
                b.fill = INPUT
                b.number_format = MONEY
                ws.cell(row=r, column=3, value=(
                    '=IF(A{r}="","",SUMIFS({tx}!$D:$D,{tx}!$B:$B,A{r},{tx}!$A:$A,">="&$H$1,{tx}!$A:$A,"<"&$I$1))'
                ).format(r=r, tx=TXN)).number_format = MONEY
                d = '=IF(A{r}="","",C{r}-B{r})' if sign == 1 else '=IF(A{r}="","",B{r}-C{r})'
                ws.cell(row=r, column=4, value=d.format(r=r)).number_format = MONEY
                for col in range(1, 5):
                    ws.cell(row=r, column=col).border = BOX
            tr = r0 + n
            ws.cell(row=tr, column=1, value=t["total"]).font = BOLD
            for col in (2, 3):
                c = ws.cell(row=tr, column=col, value="=SUM(%s%d:%s%d)" % (L(col), r0, L(col), tr - 1))
                c.number_format, c.font, c.fill = MONEY, BOLD, SUB
            c = ws.cell(row=tr, column=4, value=("=C%d-B%d" if sign == 1 else "=B%d-C%d") % (tr, tr))
            c.number_format, c.font, c.fill = MONEY, BOLD, SUB
            ws.conditional_formatting.add("D%d:D%d" % (r0, tr), CellIsRule(operator="lessThan", formula=["0"], font=Font(color="C0392B", bold=True)))
        ws.conditional_formatting.add("B5", CellIsRule(operator="lessThan", formula=["0"], font=Font(color="C0392B", bold=True)))
        for col, w in zip("ABCD", (30, 14, 14, 16)):
            ws.column_dimensions[col].width = w
        fit_page(ws)

    # Year summary
    sm = wb.create_sheet(t["summary"], 2)
    sm["A1"] = '="%s "&%s' % (t["summary"], YEAR)
    sm["A1"].font = TITLE
    head(sm, 3, [t["month"], t["income"], t["expenses"], t["balance"], t["savings_rate"]])
    for i, mname in enumerate(month_names):
        r = 4 + i
        sm.cell(row=r, column=1, value=mname)
        for col, src in ((2, "B3"), (3, "B4"), (4, "B5")):
            sm.cell(row=r, column=col, value="=%s!%s" % (q(mname), src)).number_format = MONEY
        sm.cell(row=r, column=5, value='=IF(B%d=0,"",D%d/B%d)' % (r, r, r)).number_format = PCT
        for col in range(1, 6):
            sm.cell(row=r, column=col).border = BOX
    tr = 16
    sm.cell(row=tr, column=1, value=t["total"]).font = BOLD
    for col in (2, 3, 4):
        c = sm.cell(row=tr, column=col, value="=SUM(%s4:%s15)" % (L(col), L(col)))
        c.number_format, c.font, c.fill = MONEY, BOLD, SUB
    c = sm.cell(row=tr, column=5, value='=IF(B16=0,"",D16/B16)')
    c.number_format, c.font, c.fill = PCT, BOLD, SUB
    sm.conditional_formatting.add("D4:D16", CellIsRule(operator="lessThan", formula=["0"], font=Font(color="C0392B", bold=True)))
    for col, w in zip("ABCDE", (16, 14, 14, 14, 14)):
        sm.column_dimensions[col].width = w
    ch = BarChart()
    ch.type = "col"
    ch.title = "%s / %s" % (t["income"], t["expenses"])
    ch.add_data(Reference(sm, min_col=2, max_col=3, min_row=3, max_row=15), titles_from_data=True)
    ch.set_categories(Reference(sm, min_col=1, min_row=4, max_row=15))
    ch.height, ch.width = 9, 20
    sm.add_chart(ch, "G3")
    fit_page(sm, landscape=True)

    # Savings goals + deposits
    gs = wb.create_sheet(t["goals"])
    head(gs, 1, [t["goal"], t["target"], t["deadline"], t["saved"], t["remaining"], t["progress"], t["per_month"]])
    DEP = q(t["deposits"])
    for i in range(10):
        r = 2 + i
        if i < len(t["goals_default"]):
            gs.cell(row=r, column=1, value=t["goals_default"][i][0])
            gs.cell(row=r, column=2, value=t["goals_default"][i][1])
        for col in (1, 2, 3):
            gs.cell(row=r, column=col).fill = INPUT
        gs.cell(row=r, column=2).number_format = MONEY
        gs.cell(row=r, column=3).number_format = DATEF
        gs.cell(row=r, column=4, value='=IF(A{r}="","",SUMIFS({d}!$C:$C,{d}!$B:$B,A{r}))'.format(r=r, d=DEP)).number_format = MONEY
        gs.cell(row=r, column=5, value='=IF(A{r}="","",MAX(0,B{r}-D{r}))'.format(r=r)).number_format = MONEY
        gs.cell(row=r, column=6, value=('=IF(OR(A{r}="",N(B{r})=0),"",REPT("█",ROUND(10*MIN(1,D{r}/B{r}),0))'
                                        '&REPT("░",10-ROUND(10*MIN(1,D{r}/B{r}),0))&" "&ROUND(100*MIN(1,D{r}/B{r}),0)&"%")').format(r=r)).font = Font(color=BLUE)
        gs.cell(row=r, column=7, value=('=IF(OR(A{r}="",C{r}=""),"",E{r}/MAX(1,(YEAR(C{r})-YEAR(TODAY()))*12'
                                        '+MONTH(C{r})-MONTH(TODAY())))').format(r=r)).number_format = MONEY
        for col in range(1, 8):
            gs.cell(row=r, column=col).border = BOX
    for col, w in zip("ABCDEFG", (26, 13, 13, 13, 13, 22, 18)):
        gs.column_dimensions[col].width = w
    gs.freeze_panes = "A2"
    fit_page(gs, landscape=True)
    dp = wb.create_sheet(t["deposits"])
    head(dp, 1, [t["date"], t["goal"], t["amount"]])
    dvg = DataValidation(type="list", formula1="=%s!$A$2:$A$11" % q(t["goals"]), allow_blank=True)
    dp.add_data_validation(dvg)
    dvg.add("B2:B501")
    for r in range(2, 502):
        dp.cell(row=r, column=1).number_format = DATEF
        dp.cell(row=r, column=3).number_format = MONEY
        for col in (1, 2, 3):
            dp.cell(row=r, column=col).fill = INPUT
    for col, w in zip("ABC", (13, 26, 14)):
        dp.column_dimensions[col].width = w
    dp.freeze_panes = "A2"

    wb.properties.creator = "Star Garden Learning"
    wb.properties.title = t["budget_title"]
    wb.save(path)
    return dict(year_cell="%s!B2" % t["setup"], months=month_names)


# ---------------------------------------------------------------- habits

N_HAB = 15


def habits(lang, path):
    t = S[lang]
    wb = Workbook()
    start_sheet(wb, t, t["habit_title"], t["habit_help"])
    first = None
    dow = ",".join('"%s"' % d for d in t["dow"])
    for m, mname in enumerate(t["months"], start=1):
        ws = wb.create_sheet(mname)
        ws["A1"] = '="%s · %s "&$B$2' % (t["habit_title"], mname)
        ws["A1"].font = Font(bold=True, size=16, color=DARK)
        ws["A2"] = t["year"]
        ws["A2"].font = BOLD
        if first is None:
            ws["B2"] = DEFAULT_YEAR
            ws["B2"].fill = INPUT
            first = mname
        else:
            ws["B2"] = "=%s!$B$2" % q(first)
        ws.merge_cells("B2:D2")
        ws["AK1"] = "=DAY(EOMONTH(DATE($B$2,%d,1),0))" % m  # days in month
        ws.column_dimensions["AK"].hidden = True
        head(ws, 4, [t["habit"]] + [str(d) for d in range(1, 32)] + [t["done"], t["rate"], t["progress"]])
        for d in range(1, 32):
            col = 1 + d
            ws.cell(row=4, column=col, value=d)
            c = ws.cell(row=3, column=col, value='=IF(%d>$AK$1,"",CHOOSE(WEEKDAY(DATE($B$2,%d,%d),2),%s))' % (d, m, d, dow))
            c.alignment = Alignment(horizontal="center")
            c.font = Font(size=8, color="555555")
            ws.column_dimensions[L(col)].width = 3.6
        dv = DataValidation(type="list", formula1='"✓"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add("B5:AF%d" % (4 + N_HAB))
        for i in range(N_HAB):
            r = 5 + i
            if first == mname:
                a = ws.cell(row=r, column=1, value=t["habits_default"][i] if i < len(t["habits_default"]) else None)
                a.fill = INPUT
            else:
                ws.cell(row=r, column=1, value='=IF(%s!A%d="","",%s!A%d)' % (q(first), r, q(first), r))
            for d in range(1, 32):
                c = ws.cell(row=r, column=1 + d)
                c.alignment = Alignment(horizontal="center")
                c.border = BOX
            ws.cell(row=r, column=33, value='=IF(A%d="","",COUNTIF(B%d:AF%d,"✓"))' % (r, r, r))
            ws.cell(row=r, column=34, value='=IF(A%d="","",AG%d/$AK$1)' % (r, r)).number_format = PCT
            ws.cell(row=r, column=35, value='=IF(A%d="","",REPT("█",ROUND(10*AH%d,0))&REPT("░",10-ROUND(10*AH%d,0)))' % (r, r, r)).font = Font(color=BLUE)
            ws.cell(row=r, column=1).border = BOX
        rng = "B5:AF%d" % (4 + N_HAB)
        ws.conditional_formatting.add(rng, FormulaRule(formula=['B$4>$AK$1'], fill=GRAYF))
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"✓"'], fill=GREEN))
        ws.column_dimensions["A"].width = 30
        ws.column_dimensions["AG"].width = 8
        ws.column_dimensions["AH"].width = 9
        ws.column_dimensions["AI"].width = 14
        ws.freeze_panes = "B5"
        fit_page(ws, landscape=True)
    wb.properties.creator = "Star Garden Learning"
    wb.properties.title = t["habit_title"]
    wb.save(path)
