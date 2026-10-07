import {
  GuideCallout,
  GuideChecklist,
  GuideSection,
  GuideStep,
  GuideSteps,
} from "../../article-components";

const PROBLEMS = [
  { title: "Nothing can be posted anywhere", body: "No fiscal period is open, or the calendar has run out. The finance dashboard warns about this. Someone who covers the whole school creates the next fiscal year." },
  { title: "New fiscal year is missing", body: "Opening a year changes every branch's calendar, so only someone who covers the whole school is offered it." },
  { title: "Run close steps is refused", body: "A check marked Blocks the close has failed. Fix what it names, such as Trial balance agrees (debits equal credits) or AR reconciled (what customers owe), and run it again. A check marked Done by the close is not the reason: the close does that work itself." },
  { title: "A month will not close although its checks pass", body: "An earlier month is still open. Months close in order, so September closes once August is closed, and January once December of the year before is. Close the month the message names first. Force close does not get past this." },
  { title: "Re-open is refused on a month", body: "A later month is still closed. Months re-open from the latest back: to correct August while September is closed, re-open September first. A locked later month means the earlier one can no longer be re-opened." },
  { title: "A document is refused for a closed month", body: "A journal, credit note or other finance document is checked against its own branch's month when it is sent for approval or resumed. If Ikeja Branch has closed September 2026, an Ikeja document dated in September is refused at once, with a message naming Ikeja Branch and September 2026, while Lekki's still go. Re-open the month for that branch, or date the document in a month it still has open. At a school with one branch the message names only the month." },
  { title: "The month still reads Open under All branches", body: "The school's month closes only once every branch has closed it. The Each branch rows show which branch is still open." },
  { title: "Lock period is greyed out", body: "It is the last period of a year that is not closed yet. Close the fiscal year first." },
  { title: "Close fiscal year is greyed out", body: "At least one period is still Open. Soft-close or close every period first." },
  { title: "Re-open is greyed out on a month", body: "Its fiscal year is closed. Someone who covers the whole school re-opens the year first." },
  { title: "Re-open year is missing or greyed out", body: "Only someone who covers the whole school may re-open a year. An archived year must be unarchived first, and a locked year cannot be re-opened." },
  { title: "Archive year is greyed out", body: "The year is too recent. The message says the first day it can be archived." },
] as const;

/**
 * The fiscal calendar, closing by branch, and the records kept behind a close.
 *
 * At a school with one branch nothing here asks for a branch. Opening and
 * re-opening a fiscal year, archiving a year and checking the closed figures
 * are offered only to a reader who covers the whole school; force close needs
 * its own permission.
 */
export default function CloseAPeriodArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>The fiscal calendar decides which dates anything can be posted on. Every invoice, receipt, payroll run and journal must fall in an <strong>open</strong> period. Closing a period at month end stops late entries changing figures you have already reported.</p>
        <GuideChecklist items={[
          "Everything for the month is recorded: fees, receipts, payroll, claims, petty cash.",
          "The bank is reconciled for the month.",
          "No journals are left as drafts, and the month's fees billed ahead are released.",
          "At a school with more than one branch, you know which branch you are closing.",
        ]} />
      </GuideSection>

      <GuideSection id="create-the-calendar" title="Create the fiscal year">
        <GuideSteps>
          <GuideStep title="Open Fiscal Periods">Choose a year from the list at the top, or select <strong>New fiscal year</strong>. Opening a year changes every branch&apos;s calendar, so only someone who covers the whole school is offered it.</GuideStep>
          <GuideStep title="Set it up">Enter the <strong>Fiscal year label</strong>, the <strong>Period frequency</strong> (Monthly for 12 periods, Quarterly for 4), and the <strong>Starting month</strong> and <strong>Starting day</strong>. The preview says exactly what will be created.</GuideStep>
          <GuideStep title="Select Create fiscal calendar">All the new periods start open.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Never let the calendar run out">
          When the last period passes and no next year exists, every posting is refused. Finance Settings, <strong>Fiscal calendar</strong>, under <strong>Opening the next year</strong>, chooses what happens as the end nears: <strong>Open the next fiscal year automatically</strong> (the default), or <strong>Warn finance staff only</strong>, which emails whoever may open a year. <strong>Days ahead</strong> sets how early, from 7 to 180 days.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="branches" title="Each branch closes its own books">
        <p>At a school with more than one branch, each branch closes, re-opens and locks its own months, and closes its own year. The school&apos;s month reads closed once every branch has closed it, and the school&apos;s year once every branch has closed its year.</p>
        <p>A bursar who works in one branch sees and closes that branch without being asked. Someone who works in several picks a branch, or <strong>All branches</strong>, from the list at the top. Under All branches the screen shows the school&apos;s own state, lists <strong>Each branch</strong> under a month so you can see which one is still open, and every action asks which branch it is for.</p>
        <p>Say Bright Star&apos;s March reads Open under All branches. Ikeja has closed March and Lekki has not: Lekki&apos;s bursar closes it, and the school&apos;s March then reads Closed.</p>
      </GuideSection>

      <GuideSection id="period-statuses" title="What each status allows">
        <GuideSteps>
          <GuideStep title="Open">Ordinary posting allowed.</GuideStep>
          <GuideStep title="Soft Closed">Only closing entries. It can be reopened.</GuideStep>
          <GuideStep title="Closed">Closed after the close steps have run. It can be reopened by someone with permission.</GuideStep>
          <GuideStep title="Locked">A permanent seal. Corrections go into a later open period.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="close-a-month" title="Close a month">
        <GuideSteps>
          <GuideStep title="Select the period">Its panel shows the <strong>Close checklist</strong>, including whether the trial balance balances and whether draft journals remain. A check named by an accounting term has the plain words beside it, such as <strong>Trial balance agrees (debits equal credits)</strong> or <strong>AP reconciled (what is owed to suppliers)</strong>. One already in plain words, such as <strong>Earlier months closed</strong>, stands alone. A check marked <strong>Blocks the close</strong> must pass; one marked <strong>Warning only</strong> will not stop it. One marked <strong>Done by the close</strong> is work the close does itself, such as posting depreciation that has fallen due or releasing fees billed ahead, so it needs nothing from you.</GuideStep>
          <GuideStep title="Soft close, if you are still tidying up">Select <strong>Soft close</strong> to stop ordinary posting while you finish adjustments.</GuideStep>
          <GuideStep title="Run close steps">Select <strong>Run close steps</strong> and confirm with <strong>Run period close</strong>. Where you are asked, choose the branch. The period reads Closed.</GuideStep>
        </GuideSteps>
        <p><strong>Re-open</strong> on a soft-closed or closed month lets ordinary posting back in. It asks for a reason, which goes on the audit trail with your name. A month of a closed year cannot be re-opened until the year is. Typing &quot;periods and close&quot; into the search box in the header opens the same workbench, as <strong>Periods &amp; Close</strong>.</p>
      </GuideSection>

      <GuideSection id="close-in-order" title="Months close in order">
        <p>A month closes only once every earlier month is closed, and re-opens only while every later month is open. The order runs across the year end: January waits for December of the year before, although that year itself may stay open for the auditors. At a school with more than one branch each branch keeps its own order, so Ikeja can close September while Lekki is still on August.</p>
        <p>Say Bright Star&apos;s bursar tries to close September while August is still open. The checklist shows <strong>Earlier months closed</strong> as Blocks the close, and names August. She closes August, then September. Later the accountant finds an August error: she re-opens September first, then August, corrects it, and closes both again.</p>
        <p>Under <strong>All branches</strong>, Earlier months closed answers branch by branch. Say Ikeja has closed August and Lekki has not. Viewing September under All branches, the check names Lekki and its open August, and says Ikeja can close September now. It is then a warning, not a block: Ikeja&apos;s close, and a force close of it, stay available. It blocks the close only when no branch still to close the month can close it.</p>
        <p>The order is on by default. Someone who covers the whole school can turn it off under Finance Settings, <strong>Fiscal calendar</strong>, <strong>Closing months</strong>, with <strong>Close months in order</strong>.</p>
      </GuideSection>

      <GuideSection id="force-close" title="Close past a failed check">
        <p>Sometimes a month must close while a check still fails, for example when the bank statement is late and the accountant has agreed the balance. Someone with the force close permission sees <strong>Force close</strong> on the month. The dialog lists the <strong>Checks you are overriding</strong> and asks for a reason; both go on the audit trail with your name.</p>
        <GuideCallout tone="warning" title="Force close is not a shortcut">
          Use it only when the person responsible has agreed why the check can wait. Fix the failing check in the next month. Force close never gets past the order months close in: an earlier month that is still open at that branch has to be closed first. Under All branches it stays available for a branch that can close.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="close-the-year" title="Close the fiscal year">
        <p>When every period is soft-closed or closed, the banner reads <strong>Ready for year-end close</strong>. <strong>Close fiscal year</strong> posts the year-end journal, moving the year&apos;s surplus or deficit into retained earnings, and seals the year. At a school with more than one branch, each branch closes its own year, and the school&apos;s year closes once every branch has.</p>
        <p><strong>Re-open year</strong> reverses the year-end journal so a month can be corrected; the year must then be closed again. It asks for a reason. Only someone who covers the whole school may re-open a year, even one branch&apos;s: a branch&apos;s bursar closes their own year but does not re-open it. An archived year must be unarchived first, and a locked year cannot be re-opened at all.</p>
        <GuideCallout tone="danger" title="Locks are permanent">
          <strong>Lock period</strong> cannot be undone, and a locked year cannot be re-opened. Agree the year&apos;s figures with the head and your auditor first.
        </GuideCallout>
      </GuideSection>

      <GuideSection id="archive-a-year" title="Archive an old year">
        <p>A closed or locked year that is old enough can be archived, so it stops crowding the year pickers, period pickers and document lists for every branch. Nothing is deleted, and bills still unpaid from it stay in the lists. Wherever the school has an archived year, a <strong>Show archived years</strong> switch on the lists and reports brings it back to read and report on.</p>
        <GuideSteps>
          <GuideStep title="Open the year under All branches">Archiving binds every branch, so it is offered to someone who covers the whole school and may archive years, on the school&apos;s own calendar.</GuideStep>
          <GuideStep title="Select Archive year">Give a reason, such as <em>FY 2023 is finished and audited</em>, and confirm. <strong>Unarchive year</strong> brings it back, also with a reason.</GuideStep>
        </GuideSteps>
        <p>A year may be archived once enough time has passed since it ended: two years unless the school changed it under Finance Settings, <strong>Fiscal calendar</strong>.</p>
      </GuideSection>

      <GuideSection id="sealed-figures" title="Check the closed figures">
        <p>Every month close, month lock and year close stores each account&apos;s balance, branch by branch. <strong>Closed figures</strong> under Reports &amp; Close recomputes them from the ledger and compares. Choose a year, or <strong>Every closed year</strong>, and select <strong>Verify closed figures</strong>. Each closed month and year reads as matching, or names the balances that moved: the <strong>Closed debit</strong> and <strong>Closed credit</strong> stored when it closed, and what the ledger says now.</p>
        <p>The check covers every branch, so only someone who covers the whole school can run it. It runs when asked, and it changes and repairs nothing. If a figure moved, tell your accountant.</p>
      </GuideSection>

      <GuideSection id="record-keeping" title="How long records are kept">
        <p>Financial records are kept for a set number of years, counted from the end of each fiscal year. While a record is kept it cannot be deleted, whatever its screen offers; a delete is refused and says when the hold ends. Finance Settings, <strong>Fiscal calendar</strong>, under <strong>Record keeping</strong>, shows the <strong>Statutory floor</strong> set for every school (read-only), <strong>The school&apos;s own period (years)</strong>, which can only lengthen it, and the <strong>Period in force</strong>. <strong>Archive a closed year after (years)</strong> sets how old a year must be to archive. Only someone who covers the whole school can change these.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(({ title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="The month is closed when">
          Its checklist passes, every branch has closed it so the school&apos;s month reads Closed, the next period is open for the new month, and a next fiscal year exists before this one runs out.
        </GuideCallout>
      </GuideSection>
    </div>
  );
}
