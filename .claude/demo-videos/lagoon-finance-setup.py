"""Gives Lagoon View Academy a month of finance history to film, in the local database only.

It prepares the "More than fees" film. Everything the film does on camera is
left undone; everything it needs to have happened already is recorded through
the finance modules' own services, so journals, approvals and audit rows are
the ones the screens would have written:

0. Approval routes. The finance routes every school is provisioned with, plus
   the petty cash return route, each with the principal (and Kemi Afolabi
   where a ladder needs a second person) in its approver group. Ngozi Ibekwe
   records the documents on camera, so she is put in no group.
1. Payroll. Ten Main Branch staff on two salary structures, with their tax
   numbers, pension administrators and bank accounts. Payroll moved onto these
   books in September, so January to August is carried in as each person's
   own pay brought forward, and the September run is raised, approved by the
   principal, posted and paid on 1 October. Its PAYE, pension, NHF and NSITF
   are filed and remitted on 6 and 7 October. October's run is the film's.
2. Petty cash. The Main Branch office float of N50,000, established from the
   bank on 1 October, with three vouchers. The plumber's voucher, the count
   and the top-up are the film's.
3. Fixed assets. Five assets bought in 2025 and 2026, depreciated to the end
   of September. October's depreciation run is the film's. The register is
   brought in the way one migrated from another system is: each asset at
   cost against retained earnings, and the 2025 depreciation, for which these
   books hold no year, carried in as one brought-forward entry.
4. Reminders. A school reminder policy at 7, 14 and 30 days overdue, and
   three overdue bills. Only two pupils at the school were enrolled in
   2025/2026 and are not used elsewhere in the films (Daniel Nwankwo and Musa
   Adeleke), so they carry the Third Term 2025/2026 arrears, billed from the
   school's own fee structure; Temitope Adegoke carries an unpaid books and
   uniform bill raised before the 2026/2027 resumption. No reminder is
   generated: the film runs them.
5. Concessions, credit notes and payment plans need no configuration beyond
   section 0, so this section only prints the limits the film runs into.
6. The bank statement for October, written as CSV for the bank-statement
   import: one line for every posted movement on the main account, plus a
   N1,075 transfer charge the books do not have. It is written afresh on
   every run until a statement has been imported for the account, so a run
   just before filming the bank scene picks up anything the earlier scenes
   posted (a claim paid from the bank, the petty cash top-up).

Run from backend/apps, after backing the database up:

    python manage.py shell < ../../school-fe/.claude/demo-videos/lagoon-finance-setup.py

Set ``LV_DRY_RUN=1`` to run every section and roll it all back at the end.

Safe to re-run: every row is fetched before it is created, and a section
whose work is already done does nothing. Each section runs in its own
transaction, so a failure leaves none of that section behind.

The staff bank accounts are fake but well-formed NUBANs, so the payment
provider is pointed at the in-process fake for that one section: it names
each account's holder after the staff member, and the accounts read as
verified. Nothing else in the script talks to a provider. Invoice copies,
parent-app pushes and transfer-account requests for the arrears bills are
held back, so no family hears of a bill dated in April.
"""
import csv
import datetime
import os
from pathlib import Path
from unittest import mock

from django.contrib.auth import get_user_model
from django.db import transaction

from schools.vs_schools.models import School
from vs_finance.models import (
    Account, BankAccount, BankStatement, CostCenter, Customer, DepreciationSchedule, FeeStructure,
    FixedAsset, FiscalPeriod, Invoice, InvoiceLine, JournalEntry, JournalLine, LedgerEntity,
    Payment, PayrollRun, PettyCashFund, PettyCashVoucher, PettyCashVoucherLine, SalaryComponent,
    SalaryStructure, EmployeeSalary, TaxCode, TaxFiling, TaxObligation,
)
from vs_finance.models.payroll_statutory import (
    PayBroughtForward, PensionFundAdministrator, StaffBankAccount,
)
from vs_tenants.models import Branch

U = get_user_model()
school = School.objects.get(slug="lagoon-view")
tenant = school.tenant
entity = LedgerEntity.objects.get(tenant=tenant, code="LAGOONVIEW")
main = Branch.objects.get(tenant=tenant, is_main=True)
bank = BankAccount.objects.get(entity=entity, name="Lagoon View main account")

ngozi = U.objects.get(email="ngozi.ibekwe@lagoon-view.example.com")
kemi = U.objects.get(email="kemi.afolabi@lagoon-view.example.com")
principal = U.objects.get(email="admin@lagoon-view.example.com")

DRY_RUN = os.environ.get("LV_DRY_RUN") == "1"
STATEMENT_DATE = datetime.date(2026, 10, 22)
STATEMENT_FILE = Path(
    "/Users/mac/Documents/Dev-Projects/GitHub/school-fe/.claude/demo-videos/out/"
    "lagoon-bank-statement-oct-2026.csv"
)


class DryRun(Exception):
    """Raised at the end of a dry run to roll every section back."""


def say(text):
    print(f"  {text}")


def account(code):
    return Account.objects.get(entity=entity, code=code)


def naira(kobo):
    return f"N{kobo / 100:,.2f}"


def approval_routes():
    """The finance approval routes and who sits in each approver group.

    The routes come from the provisioning functions, with their default
    stages, and each call leaves a route that already has live steps as it
    stands. The groups those routes name are filled here:

    * adjustments (concessions, credit notes, refunds, write-offs, credit
      transfers, provisions): the principal and Kemi Afolabi, so the two-step
      concession and credit-note ladder has a different person for each step;
    * senior adjustments: the principal;
    * expense claims, petty cash returns and payroll runs: the principal.

    The payroll group also holds the Finance Admin role, which the route gave
    it when it was created; the engine keeps whoever prepared a run off its
    approval, so Ngozi never approves her own.
    """
    from vs_finance.approvals import (
        adopt_petty_cash_return_template, ensure_tenant_approval_templates,
        ensure_tenant_expense_claim_template, ensure_tenant_payroll_approval,
    )
    from vs_finance.constants import (
        WF_ADJUSTMENT_APPROVER_GROUP, WF_EXPENSE_CLAIM_APPROVER_GROUP, WF_PAYROLL_APPROVER_GROUP,
        WF_PETTY_CASH_RETURN_APPROVER_GROUP, WF_SENIOR_ADJUSTMENT_APPROVER_GROUP,
    )
    from vs_workflow.models import WorkflowApproverGroup, WorkflowApproverGroupMember

    print("0. Approval routes")
    with transaction.atomic():
        made = [t.name for t, created in ensure_tenant_approval_templates(tenant, created_by=principal) if created]
        for template, created in (
            ensure_tenant_expense_claim_template(tenant, created_by=principal),
            ensure_tenant_payroll_approval(tenant, created_by=principal),
            adopt_petty_cash_return_template(tenant, created_by=principal),
        ):
            if created:
                made.append(template.name)
        say(f"routes published now: {', '.join(made) or 'none, all were in place'}")

        for code, people in (
            (WF_ADJUSTMENT_APPROVER_GROUP, (principal, kemi)),
            (WF_SENIOR_ADJUSTMENT_APPROVER_GROUP, (principal,)),
            (WF_EXPENSE_CLAIM_APPROVER_GROUP, (principal,)),
            (WF_PETTY_CASH_RETURN_APPROVER_GROUP, (principal,)),
            (WF_PAYROLL_APPROVER_GROUP, (principal,)),
        ):
            group = WorkflowApproverGroup.all_objects.get(tenant=tenant, code=code)
            for person in people:
                WorkflowApproverGroupMember.objects.get_or_create(
                    group=group, kind="USER", user=person, defaults={"added_by": principal},
                )
            members = [
                m.user.full_name if m.user_id else f"role {m.role.name}"
                for m in group.members.select_related("user", "role")
            ]
            say(f"{group.name}: {', '.join(members)}")


# --------------------------------------------------------------------------- #
# 1. Payroll                                                                   #
# --------------------------------------------------------------------------- #

#: Two pay templates: (name, description, basic %, housing %, transport %).
STRUCTURES = (
    ("Teaching staff", "Classroom teachers and heads of department", 50, 30, 20),
    ("Management and administration", "Principal, bursary and branch office", 45, 35, 20),
)

#: Who is paid: (email, structure, monthly gross in naira, PFA, annual rent in naira, bank code, bank).
STAFF = (
    ("admin@lagoon-view.example.com", "Management and administration", 850_000,
     "Stanbic IBTC Pension Managers", 4_800_000, "058", "Guaranty Trust Bank"),
    ("oluwaseun.bakare@lagoon-view.example.com", "Teaching staff", 420_000,
     "Access ARM Pensions", 2_400_000, "044", "Access Bank"),
    ("ngozi.ibekwe@lagoon-view.example.com", "Management and administration", 380_000,
     "Leadway Pensure PFA", 2_200_000, "057", "Zenith Bank"),
    ("branch.admin@lagoon-view.example.com", "Management and administration", 300_000,
     "Stanbic IBTC Pension Managers", 1_800_000, "011", "First Bank of Nigeria"),
    ("tolu.fashola@lagoon-view.example.com", "Teaching staff", 260_000,
     "Access ARM Pensions", 1_500_000, "033", "United Bank for Africa"),
    ("amina.garba@lagoon-view.example.com", "Teaching staff", 240_000,
     "Leadway Pensure PFA", 1_400_000, "058", "Guaranty Trust Bank"),
    ("chinedu.okeke@lagoon-view.example.com", "Teaching staff", 230_000,
     "Stanbic IBTC Pension Managers", 1_200_000, "044", "Access Bank"),
    ("bisi.olanrewaju@lagoon-view.example.com", "Teaching staff", 210_000,
     "Access ARM Pensions", 1_200_000, "057", "Zenith Bank"),
    ("kunle.adebayo@lagoon-view.example.com", "Teaching staff", 195_000,
     "Leadway Pensure PFA", 0, "011", "First Bank of Nigeria"),
    ("amaka.nwosu@lagoon-view.example.com", "Teaching staff", 185_000,
     "Stanbic IBTC Pension Managers", 960_000, "033", "United Bank for Africa"),
)

SEPTEMBER_END = datetime.date(2026, 9, 30)


def nuban(bank_code, serial):
    """A 10-digit account number whose last digit is the NUBAN check digit for ``bank_code``."""
    digits = bank_code + serial
    total = sum(int(d) * w for d, w in zip(digits, (3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3)))
    return serial + str((10 - total % 10) % 10)


def opening_figures(salary, basic_share, settings):
    """January to August 2026 for a person paid the same every month: the pay brought forward.

    PAYE is the cumulative tax to the end of August that the tax table in
    force would have taken from eight equal months, worked out by the payroll
    module's own PAYE function, so September continues the year exactly as
    if every month had been run here.
    """
    from vs_finance.payroll_tax import YearToDate, compute_paye, table_for

    gross = salary.gross_amount * 8
    pension = gross * settings.employee_pension_rate_bps // 10000
    nhf = gross * basic_share // 100 * settings.nhf_rate_bps // 10000
    table = table_for(settings.tax_country, datetime.date(2026, 8, 31))
    paye = compute_paye(
        table.snapshot(), month=8, prior=YearToDate(), gross_now=gross, taxable_now=gross,
        pension_now=pension, nhf_now=nhf, annual_rent=salary.annual_rent,
    ).amount
    return {
        "gross_amount": gross, "taxable_pay": gross, "paye_amount": paye,
        "pension_amount": pension, "nhf_amount": nhf,
        "employer_name": "", "evidence_reference": "Payroll records, January to August 2026",
    }


def payroll():
    """Structures, the roster, staff bank accounts, and September raised, approved, posted and paid."""
    from vs_finance.constants import (
        PayBroughtForwardSource, PayrollRunStatus, SalaryCalcMethod, SalaryComponentKind,
    )
    from vs_finance.payroll import generate_run_from_roster, pay_payroll, post_payroll, submit_payroll_run
    from vs_finance.payroll_statutory import (
        assert_one_active_row, payroll_settings, record_creation, replace_components,
        save_pay_brought_forward,
    )
    from vs_finance.staff_banking import set_staff_bank_account
    from vs_payments.providers.fake import FakeProvider
    from vs_payments.providers.registry import register, unregister
    from vs_workflow.services.actions import record_action

    print("1. Payroll")
    with transaction.atomic():
        structures, shares = {}, {}
        for name, description, basic, housing, transport in STRUCTURES:
            structure = SalaryStructure.objects.filter(entity=entity, name=name).first()
            if structure is None:
                structure = SalaryStructure.objects.create(entity=entity, name=name, description=description)
                replace_components(structure, [
                    SalaryComponent(
                        name=label, kind=SalaryComponentKind.EARNING,
                        calc_method=SalaryCalcMethod.PERCENT_OF_GROSS, rate_bps=rate * 100,
                        is_basic=label == "Basic", is_pensionable=True, is_taxable=True, sequence=n,
                    )
                    for n, (label, rate) in enumerate((("Basic", basic), ("Housing", housing),
                                                        ("Transport", transport)))
                ], actor_user=ngozi, creating=True)
            structures[name], shares[name] = structure, basic
            say(f"structure {name}: basic {basic}%, housing {housing}%, transport {transport}%")

        settings = payroll_settings(entity)
        for n, (email, structure_name, gross, pfa_name, rent, _, _) in enumerate(STAFF, start=1):
            person = U.objects.get(email=email)
            salary = EmployeeSalary.objects.filter(entity=entity, employee=person, is_active=True).first()
            if salary is None:
                salary = EmployeeSalary(
                    entity=entity, employee=person, branch=main,
                    name=" ".join(p for p in (person.first_name, person.last_name) if p),
                    structure=structures[structure_name], gross_amount=gross * 100,
                    pfa=PensionFundAdministrator.objects.get(name=pfa_name),
                    tax_id=f"2{n:02d}4718{n:02d}63", pension_pin=f"PEN1004{n:02d}38{n:04d}",
                    annual_rent=rent * 100,
                )
                assert_one_active_row(salary)
                salary.save()
                record_creation(salary, actor_user=ngozi)
            if not PayBroughtForward.objects.filter(
                salary=salary, tax_year=2026, source=PayBroughtForwardSource.THIS_EMPLOYER,
            ).exists():
                save_pay_brought_forward(
                    salary, 2026, opening_figures(salary, shares[structure_name], settings),
                    source=PayBroughtForwardSource.THIS_EMPLOYER, actor_user=ngozi,
                )
            say(f"{salary.name}: {naira(salary.gross_amount)} a month, {structure_name}, {pfa_name}")

    # Staff bank accounts, resolved by the in-process fake provider.
    fake = FakeProvider(secret="lagoon-view-demo")
    with transaction.atomic():
        register("PAYSTACK", fake)
        try:
            for n, (email, *_, code, bank_name) in enumerate(STAFF, start=1):
                person = U.objects.get(email=email)
                number = nuban(code, f"0{n:02d}{n * 7919 % 1000000:06d}")
                fake.account_names[(code, number)] = f"{person.last_name} {person.first_name}".upper()
                row = set_staff_bank_account(
                    entity=entity, employee=person, bank_code=code, account_number=number,
                    bank_name=bank_name, actor_user=ngozi,
                )
                say(f"{person.full_name}: {bank_name} {row.account_number}, {row.get_verification_state_display()}")
        finally:
            unregister("PAYSTACK")

    # The September run: raised by Ngozi, approved by the principal, posted, paid on 1 October.
    with transaction.atomic():
        run = (PayrollRun.objects.filter(entity=entity, pay_date=SEPTEMBER_END)
               .exclude(run_status=PayrollRunStatus.CANCELLED).first())
        if run is None:
            run = generate_run_from_roster(
                entity, pay_date=SEPTEMBER_END, period_label="September 2026",
                narration="September 2026 salaries", actor_user=ngozi,
            )
        if run.status == "DRAFT":
            instance = submit_payroll_run(run, requested_by=ngozi)
            record_action(instance.id, principal, "APPROVED", comment="Approved for payment.")
            run.refresh_from_db()
        if run.run_status == PayrollRunStatus.DRAFT:
            post_payroll(run, actor_user=ngozi)
        if run.run_status == PayrollRunStatus.POSTED:
            pay_payroll(run, bank_account=bank, pay_date=datetime.date(2026, 10, 1), actor_user=ngozi)
        run.refresh_from_db()
        say(f"run {run.document_number} September 2026: gross {naira(run.gross_total)}, "
            f"PAYE {naira(run.paye_total)}, pension {naira(run.pension_total)}, "
            f"net {naira(run.net_total)}, {run.get_run_status_display()}")

    remit_september()


def remit_september():
    """File September's PAYE, pension, NHF and NSITF returns on 6 October and pay them on the 7th.

    ITF is a yearly levy, so it stays accruing. A return is prepared only for
    an obligation September's run left something owing on.
    """
    from vs_finance.tax_filing import file_filing, pay_filing, prepare_filing

    start, end = datetime.date(2026, 9, 1), SEPTEMBER_END
    with transaction.atomic():
        for obligation in TaxObligation.objects.filter(entity=entity, is_active=True).order_by("code"):
            if not obligation.code.startswith(("PAYE-", "PENSION-", "NHF", "NSITF")):
                continue
            filing = TaxFiling.objects.filter(entity=entity, obligation=obligation, period_start=start,
                                              period_end=end).first()
            if filing is None:
                with transaction.atomic():
                    filing = prepare_filing(obligation, period_start=start, period_end=end, actor_user=ngozi)
                    if not filing.amount_due:
                        transaction.set_rollback(True)
                        continue
            if filing.filing_status == "DRAFT":
                file_filing(filing, filed_date=datetime.date(2026, 10, 6),
                            filing_reference=f"{obligation.code}-2026-09", actor_user=ngozi)
            if filing.payment_status != "PAID":
                pay_filing(filing, bank_account=bank, pay_date=datetime.date(2026, 10, 7), actor_user=ngozi)
            filing.refresh_from_db()
            say(f"{obligation.name} September: {filing.document_number}, {naira(filing.amount_due)}, "
                f"{filing.get_filing_status_display()}, {filing.get_payment_status_display()}")


# --------------------------------------------------------------------------- #
# 2. Petty cash                                                                #
# --------------------------------------------------------------------------- #

#: Earlier vouchers: (reference, date, payee, what, naira).
VOUCHERS = (
    ("LV-PCV-01", datetime.date(2026, 10, 5), "Bookworld Stationers, Ajah",
     "Exercise books, markers and printer paper for the staff room", 8_500),
    ("LV-PCV-02", datetime.date(2026, 10, 9), "Total filling station, Lekki-Epe Expressway",
     "Diesel for the generator, 20 litres", 18_000),
    ("LV-PCV-03", datetime.date(2026, 10, 14), "Mama Nkechi cleaning supplies",
     "Detergent, mops and toilet rolls", 6_200),
)


def petty_cash():
    """The Main Branch office float, established from the bank, with three vouchers posted."""
    from vs_finance.petty_cash import establish_fund, post_voucher, price_voucher

    print("2. Petty cash")
    with transaction.atomic():
        gl, _ = Account.objects.get_or_create(
            entity=entity, code="1111",
            defaults={"name": "Petty cash - Main Branch office", "account_type": "ASSET",
                      "parent": account("1000"), "is_postable": True},
        )
        fund, _ = PettyCashFund.objects.get_or_create(
            entity=entity, name="Main Branch office float",
            defaults={"branch": main, "gl_account": gl, "custodian": ngozi,
                      "float_amount": 50_000_00, "current_balance": 0},
        )
        if not fund.vouchers.exists() and fund.current_balance == 0:
            establish_fund(fund, bank_account=bank, amount=50_000_00,
                           date=datetime.date(2026, 10, 1), actor_user=ngozi)
        admin = CostCenter.objects.filter(entity=entity, code="ADMIN").first()
        for reference, date, payee, what, amount in VOUCHERS:
            voucher = PettyCashVoucher.objects.filter(entity=entity, fund=fund, reference=reference).first()
            if voucher is None:
                voucher = PettyCashVoucher.objects.create(
                    entity=entity, branch=main, fund=fund, voucher_date=date, payee=payee,
                    narration=what, reference=reference, created_by=ngozi,
                )
                PettyCashVoucherLine.objects.create(
                    voucher=voucher, line_no=1, description=what, expense_account=account("5300"),
                    quantity=1, unit_price=amount * 100, cost_center=admin,
                )
                price_voucher(voucher)
                post_voucher(voucher, actor_user=ngozi)
            say(f"voucher {voucher.document_number} {date:%d %b}: {payee}, {naira(voucher.total)}")
        fund.refresh_from_db()
        say(f"{fund.name}: float {naira(fund.float_amount)}, in the tin {naira(fund.current_balance)}")


# --------------------------------------------------------------------------- #
# 3. Fixed assets                                                              #
# --------------------------------------------------------------------------- #

#: (name, tag, category, bought, naira cost, naira salvage, months of life).
ASSETS = (
    ("School bus, Toyota Coaster 30-seater", "LV-BUS-01", "VEHICLES",
     datetime.date(2025, 1, 15), 38_500_000, 3_500_000, 60),
    ("Generator, Perkins 60kVA", "LV-GEN-01", "PLANT_MACHINERY",
     datetime.date(2025, 6, 10), 9_800_000, 800_000, 84),
    ("Classroom desks and chairs, 120 sets", "LV-FUR-01", "FURNITURE",
     datetime.date(2025, 9, 1), 6_600_000, 0, 120),
    ("ICT lab laptops, 20 HP ProBook", "LV-ICT-01", "IT_EQUIPMENT",
     datetime.date(2026, 1, 12), 12_000_000, 0, 36),
    ("Science lab equipment, microscopes and balances", "LV-LAB-01", "EQUIPMENT",
     datetime.date(2026, 3, 9), 4_850_000, 250_000, 60),
)

BOOKS_OPEN = datetime.date(2026, 1, 1)


def fixed_assets():
    """The register at cost, 2025's depreciation carried in, January to September run.

    An asset bought in 2025 is capitalised on 1 January 2026, the first day
    these books hold, then given its real purchase date so its schedule runs
    from then; the months before 2026 are marked charged and carried in
    together as one brought-forward entry, as the spending demo command does
    for a migrated register. Depreciation from January to September is posted
    by the period run the Run depreciation button calls, one journal per
    month.
    """
    from vs_finance.assets import acquire_asset, build_depreciation_schedule, run_period_depreciation

    print("3. Fixed assets")
    with transaction.atomic():
        retained = account("3200")
        carried = 0
        for name, tag, category, bought, cost, salvage, months in ASSETS:
            asset = FixedAsset.objects.filter(entity=entity, asset_code=tag).first()
            if asset is not None:
                continue
            asset = FixedAsset.objects.create(
                entity=entity, branch=main, name=name, asset_code=tag, category=category,
                acquisition_date=max(bought, BOOKS_OPEN), cost=cost * 100, salvage_value=salvage * 100,
                useful_life_months=months, method="STRAIGHT_LINE", created_by=ngozi,
            )
            acquire_asset(asset, credit_account=retained, actor_user=ngozi, build_schedule=bought >= BOOKS_OPEN)
            if bought < BOOKS_OPEN:
                asset.acquisition_date = bought
                asset.save(update_fields=["acquisition_date", "updated_at"])
                build_depreciation_schedule(asset)
                before = asset.schedule.filter(depreciation_date__lt=BOOKS_OPEN)
                charged = sum(before.values_list("amount", flat=True))
                before.update(is_posted=True)
                asset.accumulated_depreciation = charged
                asset.save(update_fields=["accumulated_depreciation", "updated_at"])
                carried += charged
        if carried:
            entry = JournalEntry.objects.create(
                entity=entity, branch=main, date=BOOKS_OPEN,
                period=FiscalPeriod.objects.get(entity=entity, is_closing=False, start_date=BOOKS_OPEN),
                narration="Depreciation to 31 December 2025 brought forward on the asset register",
                reference="LV-ASSETS-BF", created_by=ngozi,
            )
            JournalLine.objects.create(entry=entry, line_no=1, account=retained, debit=carried, credit=0,
                                       description="Brought forward")
            JournalLine.objects.create(entry=entry, line_no=2, account=account("1900"), debit=0,
                                       credit=carried, description="Accumulated depreciation")
            from vs_finance.posting import post_journal

            post_journal(entry, actor_user=ngozi)
        if DepreciationSchedule.objects.filter(
            asset__entity=entity, is_posted=False, depreciation_date__lte=SEPTEMBER_END,
        ).exists():
            run_period_depreciation(entity, up_to_date=SEPTEMBER_END, actor_user=ngozi)
        for asset in FixedAsset.objects.filter(entity=entity).order_by("acquisition_date"):
            october = asset.schedule.filter(depreciation_date__month=10, depreciation_date__year=2026).first()
            say(f"{asset.document_number} {asset.name}: cost {naira(asset.cost)}, depreciated "
                f"{naira(asset.accumulated_depreciation)}, book value {naira(asset.cost - asset.accumulated_depreciation)}, "
                f"October charge {naira(october.amount) if october else 'none'}")


# --------------------------------------------------------------------------- #
# 4. Reminders: the policy and the overdue bills                               #
# --------------------------------------------------------------------------- #

#: Reminder stages: (level, name, days overdue, message).
STAGES = (
    (1, "Friendly reminder", 7,
     "This is a friendly reminder that {pupil}'s school fees are now past their due date. "
     "If you have paid already, thank you, and please ignore this message."),
    (2, "Second reminder", 14,
     "{pupil}'s school fees are now two weeks overdue. Please pay, or speak to the bursary "
     "about a payment plan."),
    (3, "Final notice", 30,
     "{pupil}'s school fees are now over a month overdue. Please settle the balance or contact "
     "the bursary this week."),
)


def reminders():
    """The school's reminder ladder and three overdue bills, posted through the billing services.

    The ladder has no service of its own; the rows are written as the
    reminder policy screen writes them. The arrears are billed by the fee
    structure the school bills every term with, stamped Third Term 2025/2026.
    """
    from vs_finance.fees import generate_invoices
    from vs_finance.models import DunningPolicy, DunningStage
    from vs_finance.receivables import post_invoice

    print("4. Reminders")
    with transaction.atomic():
        policy = DunningPolicy.objects.filter(entity=entity, name="School fee reminders").first()
        if policy is None:
            DunningPolicy.objects.filter(entity=entity, is_default=True).update(is_default=False)
            policy = DunningPolicy.objects.create(entity=entity, name="School fee reminders",
                                                  is_active=True, is_default=True)
            for level, name, days, message in STAGES:
                DunningStage.objects.create(policy=policy, level=level, name=name, min_days_overdue=days,
                                            channel="EMAIL,IN_APP", message=message)
        say(f"policy {policy.name}: " + ", ".join(
            f"{s.name} at {s.min_days_overdue} days" for s in policy.stages.order_by("level")))

    patches = (
        mock.patch("vs_finance.document_email.issue_invoice_copy", return_value=None),
        mock.patch("vs_finance.tasks.queue_invoice_issued_notification", return_value=None),
        mock.patch("schools.core.fal.tasks.send_guardian_invoice"),
        mock.patch("schools.core.fal.tasks.issue_transfer_account"),
    )
    for patch in patches:
        patch.start()
    try:
        with transaction.atomic():
            fees = FeeStructure.objects.get(entity=entity, code="FS-TERM1")
            for code, due in (("CU-92610215", datetime.date(2026, 7, 17)),
                              ("CU-92610212", datetime.date(2026, 8, 14))):
                customer = Customer.objects.get(entity=entity, code=code)
                generate_invoices(
                    fees, [customer], invoice_date=datetime.date(2026, 4, 6), due_date=due,
                    actor_user=ngozi, billing_period="S14-T43", billing_period_label="Third Term 2025/2026",
                )

            temitope = Customer.objects.get(entity=entity, code="CU-92610151")
            if not Invoice.objects.filter(entity=entity, customer=temitope, reference="LV-RESUMPTION-BOOKS").exists():
                invoice = Invoice.objects.create(
                    entity=entity, customer=temitope, branch=main,
                    invoice_date=datetime.date(2026, 7, 20), due_date=datetime.date(2026, 8, 14),
                    source="MANUAL", reference="LV-RESUMPTION-BOOKS",
                    narration="Books and uniform for resumption", billing_period="S15-T44",
                    billing_period_label="First Term 2026/2027", created_by=ngozi,
                )
                for n, (what, amount, tax) in enumerate((
                    ("Textbooks, JSS1 set", 14_500_00, "VAT-EXEMPT"),
                    ("School uniform, two sets", 9_000_00, "VAT-STD"),
                ), start=1):
                    InvoiceLine.objects.create(
                        invoice=invoice, line_no=n, description=what, revenue_account=account("4100"),
                        quantity=1, unit_price=amount, tax_code=TaxCode.objects.get(entity=entity, code=tax),
                    )
                post_invoice(invoice, actor_user=ngozi)

            today = STATEMENT_DATE
            for invoice in (Invoice.objects.filter(entity=entity, due_date__lt=today, status="POSTED")
                            .select_related("customer").order_by("due_date")):
                owed = invoice.total - invoice.amount_paid - invoice.amount_credited
                if owed > 0:
                    say(f"{invoice.document_number} {invoice.customer.name}, {invoice.billing_period_label or invoice.narration}: "
                        f"{naira(owed)} due {invoice.due_date:%d %b}, {(today - invoice.due_date).days} days overdue")
    finally:
        for patch in patches:
            patch.stop()


def adjustments_check():
    """What the concession, credit note and payment plan screens will meet. Changes nothing."""
    from vs_finance.document_settings import resolve_finance_document_settings
    from vs_workflow.models import WorkflowTemplate

    print("5. Concessions, credit notes and payment plans")
    limit = resolve_finance_document_settings(entity).concession_second_person_threshold
    say(f"one person may post a concession up to {naira(limit)} on a bill")
    for kind in ("finance.concession", "finance.credit_note"):
        template = WorkflowTemplate.all_objects.get(tenant=tenant, document_type=kind, branch=None)
        gates = {s.inclusion_condition.get("value") for s in template.stages.filter(retired_at__isnull=True)
                 if s.inclusion_condition}
        say(f"{template.name}: needs approval from {', '.join(naira(g) for g in gates if g) or 'any amount'} "
            f"of reductions on a bill")


# --------------------------------------------------------------------------- #
# 6. The bank statement file                                                   #
# --------------------------------------------------------------------------- #

def statement_text(line):
    """What the bank prints for one book line on the main account: (description, reference)."""
    entry = line.entry
    if entry.reference == "LV-OPENING-BANK":
        return "TRANSFER IN - BALANCE B/F FROM PREVIOUS ACCOUNT", "OPENING"
    receipt = Payment.objects.filter(journal=entry).select_related("customer").first()
    if receipt is not None:
        how = "CASH DEPOSIT" if receipt.method == "CASH" else "NIP TRF"
        return f"{how} - {receipt.customer.name.upper()} SCHOOL FEES", receipt.document_number
    from vs_procurement.models import VendorPayment

    paid = VendorPayment.objects.filter(journal=entry).select_related("vendor").first()
    if paid is not None:
        return f"NIP TRF TO {paid.vendor.name.upper()}", paid.document_number
    run = PayrollRun.objects.filter(disbursement_journal=entry).first()
    if run is not None:
        return f"BULK SALARY PAYMENT {run.period_label.upper()}", run.document_number
    filing = TaxFiling.objects.filter(remittances__journal=entry).select_related("obligation").first() \
        if hasattr(TaxFiling, "remittances") else None
    if filing is not None:
        return f"REMITTANCE {filing.obligation.name.upper()} SEP 2026", filing.document_number
    fund = PettyCashFund.objects.filter(entity=entity, gl_account__journal_lines__entry=entry).first()
    if fund is not None:
        return f"CASH WITHDRAWAL - {fund.name.upper()}", entry.document_number
    return (entry.narration or "TRANSFER").upper()[:80], entry.document_number


def bank_statement():
    """Write October's statement for the main account as CSV, unless one is already imported.

    The statement opens at nil on 1 October, the day the account's balance
    was brought into these books, so the brought-forward transfer is a line
    Auto-match can pair. After the books' own movements, a N1,075 transfer
    charge on the Labtech payment (N1,000 and 7.5% VAT) is the one line the
    books do not have.
    """
    from vs_finance.branch_ledger import ledger_lines

    print("6. Bank statement")
    if BankStatement.objects.filter(bank_account=bank).exists():
        say(f"a statement is already imported for {bank.name}; {STATEMENT_FILE.name} left as it is")
        return
    lines = list(
        ledger_lines(entity).filter(account=bank.gl_account, entry__date__gte=datetime.date(2026, 10, 1),
                                    entry__date__lte=STATEMENT_DATE)
        .select_related("entry").order_by("entry__date", "entry_id", "line_no")
    )
    rows = []
    for line in lines:
        description, reference = statement_text(line)
        rows.append([line.entry.date, description, reference, int(line.debit or 0), int(line.credit or 0)])
        if description.startswith("NIP TRF TO LABTECH"):
            rows.append([line.entry.date, "NIP TRANSFER FEE AND VAT", reference, 0, 1_075_00])
    STATEMENT_FILE.parent.mkdir(parents=True, exist_ok=True)
    balance = 0
    with STATEMENT_FILE.open("w", newline="") as handle:
        out = csv.writer(handle)
        out.writerow(["Transaction Date", "Description", "Reference", "Money In", "Money Out",
                      "Transaction ID", "Balance"])
        for n, (date, description, reference, money_in, money_out) in enumerate(rows, start=1):
            balance += money_in - money_out
            out.writerow([f"{date:%d/%m/%Y}", description, reference,
                          f"{money_in / 100:.2f}" if money_in else "",
                          f"{money_out / 100:.2f}" if money_out else "",
                          f"FT26{date:%m%d}{n:04d}", f"{balance / 100:.2f}"])
    say(f"{STATEMENT_FILE}: {len(rows)} lines, statement date {STATEMENT_DATE:%d %b %Y}, "
        f"opening N0.00, closing {naira(balance)}")


def run_all():
    approval_routes()
    payroll()
    petty_cash()
    fixed_assets()
    reminders()
    adjustments_check()


if DRY_RUN:
    try:
        with transaction.atomic():
            run_all()
            raise DryRun
    except DryRun:
        print("Dry run: everything rolled back.")
else:
    run_all()
    bank_statement()
    print("Done.")
