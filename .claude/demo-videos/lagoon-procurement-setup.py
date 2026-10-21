"""Sets Lagoon View Academy up to buy through procurement, in the local database only.

It casts the procurement demo video: Mr Bakare asks, Ngozi or Kemi approve first,
the principal approves at N500,000 and over. Run from backend/apps:

    python manage.py shell < ../../school-fe/.claude/demo-videos/lagoon-procurement-setup.py

Safe to re-run: every row is fetched before it is created.
"""
import datetime

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import transaction

from schools.vs_schools.models import School
from vs_finance.budgets import approve_budget, create_budget, set_budget_lines
from vs_finance.models import (
    Account, BankAccount, Budget, CostCenter, FiscalPeriod, FiscalYear,
    JournalEntry, JournalLine, LedgerEntity,
)
from vs_finance.posting import post_journal
from vs_procurement.models import Vendor, VendorCategory
from vs_rbac.models import Permission, TenantRolePermission, TenantRoleTemplate, TenantUserRoleAssignment
from vs_tenants.models import Branch
from vs_workflow.models import WorkflowApproverGroup, WorkflowApproverGroupMember

U = get_user_model()
school = School.objects.get(slug="lagoon-view")
tenant = school.tenant
entity = LedgerEntity.objects.get(tenant=tenant, code="LAGOONVIEW")
main = Branch.objects.get(tenant=tenant, is_main=True)

bakare = U.objects.get(email="oluwaseun.bakare@lagoon-view.example.com")
ngozi = U.objects.get(email="ngozi.ibekwe@lagoon-view.example.com")
kemi = U.objects.get(email="kemi.afolabi@lagoon-view.example.com")
principal = U.objects.get(email="admin@lagoon-view.example.com")


def say(text):
    print(f"  {text}")


# 1. Approval rules: requisition, order, invoice, payment and credit note.
call_command("seed_procurement_approvals", tenant=["lagoon-view"])

with transaction.atomic():
    # 2. Roles.
    requester, made = TenantRoleTemplate.objects.get_or_create(
        tenant=tenant, key="department-requester",
        defaults={
            "name": "Department Requester",
            "description": "Heads of department who ask for what their department needs to buy.",
        },
    )
    for key in (
        "procurement.requisition.view", "procurement.requisition.create",
        "procurement.requisition.update", "procurement.requisition.submit",
        "procurement.catalog_item.view", "workflow.instance.view",
    ):
        TenantRolePermission.objects.get_or_create(
            role=requester, permission=Permission.objects.get(key=key), defaults={"granted": True},
        )
    say(f"Department Requester role {'created' if made else 'already there'}")

    procurement_admin = TenantRoleTemplate.objects.get(tenant=tenant, name="Procurement Admin")

    def grant(user, role):
        live = TenantUserRoleAssignment.objects.filter(
            tenant=tenant, user=user, role=role, revoked_at__isnull=True,
        ).exists()
        if not live:
            TenantUserRoleAssignment.objects.create(
                tenant=tenant, user=user, role=role, branch=None, assigned_by=principal,
                reason_note="Procurement for the lab purchase",
            )
        say(f"{user.full_name}: {role.name}")

    grant(bakare, requester)
    grant(kemi, procurement_admin)
    grant(ngozi, procurement_admin)
    grant(principal, procurement_admin)

    # 3. Who approves: a Finance or Procurement Admin first, the principal at N500,000 and over.
    for code, people in (
        ("procurement-approver", (ngozi, kemi)),
        ("procurement-senior-approver", (principal,)),
    ):
        group = WorkflowApproverGroup.all_objects.get(tenant=tenant, code=code)
        for person in people:
            WorkflowApproverGroupMember.objects.get_or_create(
                group=group, kind="USER", user=person, defaults={"added_by": principal},
            )
        say(f"{group.name}: {', '.join(p.full_name for p in people)}")

    # 4. The school's bank account, with what was in it when the books opened here.
    cash = Account.objects.get(entity=entity, code="1100")
    bank, made = BankAccount.objects.get_or_create(
        entity=entity, name="Lagoon View main account",
        defaults={
            "bank_name": "Demo Bank", "account_number": "2034517786", "gl_account": cash,
            "is_active": True, "is_primary": True, "is_primary_collection": True,
        },
    )
    if not JournalEntry.objects.filter(entity=entity, reference="LV-OPENING-BANK").exists():
        date = datetime.date(2026, 10, 1)
        entry = JournalEntry.objects.create(
            entity=entity, date=date,
            period=FiscalPeriod.objects.get(entity=entity, is_closing=False, start_date__lte=date, end_date__gte=date),
            narration="Balance brought forward from the bank", reference="LV-OPENING-BANK", source="BANK",
            branch=main,
        )
        JournalLine.objects.create(entry=entry, account=cash, debit=6_000_000_00, credit=0,
                                   description="Balance at the bank")
        JournalLine.objects.create(entry=entry, account=Account.objects.get(entity=entity, code="3200"),
                                   debit=0, credit=6_000_000_00, description="Brought forward")
        post_journal(entry, actor_user=ngozi)
    say(f"bank account: {bank.name}, {bank.bank_name} {bank.account_number}")

    # 5. Cost centres, a lab expense account and the year's approved plan.
    lab_account, _ = Account.objects.get_or_create(
        entity=entity, code="5310",
        defaults={"name": "Teaching & laboratory materials", "account_type": "EXPENSE",
                  "parent": Account.objects.get(entity=entity, code="5000"), "is_postable": True},
    )
    admin_account = Account.objects.get(entity=entity, code="5300")
    centres = {}
    for code, name in (("SCI-LAB", "Science lab"), ("ADMIN", "Administration"),
                       ("ICT", "ICT"), ("SPORTS", "Sports")):
        centres[code], _ = CostCenter.objects.get_or_create(entity=entity, code=code, defaults={"name": name})
    year = FiscalYear.objects.get(entity=entity, year=2026)
    plan = Budget.objects.filter(entity=entity, fiscal_year=year, branch=main, name="2026 operating plan").first()
    if plan is None:
        plan = create_budget(entity, name="2026 operating plan", fiscal_year=year, branch=main, actor_user=ngozi)
        monthly = {"SCI-LAB": (lab_account, 200_000_00), "ADMIN": (admin_account, 450_000_00),
                   "ICT": (admin_account, 150_000_00), "SPORTS": (lab_account, 80_000_00)}
        set_budget_lines(plan, [
            {"account": account, "cost_center": centres[code], "period_no": n, "amount": amount}
            for code, (account, amount) in monthly.items() for n in range(1, 13)
        ])
        approve_budget(plan, actor_user=principal)
    say(f"budget: {plan.name}, {plan.get_status_display()}; Science lab N2,400,000 for the year")

    # 6. Three laboratory suppliers.
    payable = Account.objects.get(entity=entity, code="2100")
    category, _ = VendorCategory.objects.get_or_create(
        entity=entity, code="LAB", defaults={"name": "Laboratory equipment", "default_expense_account": lab_account},
    )
    for code, name, email, phone, number in (
        ("LABTECH", "Labtech Supplies Ltd", "sales@labtech.example.ng", "0802 410 7731", "1012345678"),
        ("SCIENTIA", "Scientia Nigeria Ltd", "orders@scientia.example.ng", "0809 225 4410", "1023456789"),
        ("UNILAB", "Unilab Stores", "hello@unilab.example.ng", "0813 660 2918", "1034567890"),
    ):
        Vendor.objects.get_or_create(
            entity=entity, code=code,
            defaults={
                "name": name, "category": category, "email": email, "phone": phone,
                "address": "Lagos", "bank_name": "Demo Bank", "bank_account_number": number,
                "bank_account_name": name, "payable_account": payable,
                "default_expense_account": lab_account, "payment_terms": "NET_30",
                "kyc_status": "VERIFIED", "is_active": True,
            },
        )
    say("suppliers: Labtech Supplies Ltd, Scientia Nigeria Ltd, Unilab Stores")

print("Done.")
