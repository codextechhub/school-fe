import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { ProblemGrid } from "./problem-grid";

export default function ReviewApplicantsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>An applicant is a child the school has recorded but not yet admitted. They take no class seat and appear on no register. Open <strong>Applicants</strong> in the sidebar to see them. The badge on that item counts applications waiting on a decision.</p>
        <GuideChecklist items={[
          "Your role lets you view students.",
          "To decide on an application, your role also lets you change a student's status.",
          "You know whether your school requires an admission number when a child joins.",
        ]} />
      </GuideSection>

      <GuideSection id="three-stages" title="The three stages">
        <p>Three cards across the top of the page switch between the stages, each with its count:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Awaiting decision</strong>: applications to enrol or close, longest waiting first.</li>
          <li><strong>Needs a class</strong>: students already on the roll who have no class yet.</li>
          <li><strong>Closed</strong>: applications that were closed, kept so the school can look up later why a family did not join.</li>
        </ul>
        <p>Each card shows the level applied for, the guardian and how long ago the child applied. Select a card to open the full record.</p>
      </GuideSection>

      <GuideSection id="add-an-applicant" title="Add an applicant">
        <GuideSteps>
          <GuideStep title="Start the form">Select <strong>Add applicant</strong>. The enrolment form opens with <strong>Save as an applicant</strong> already chosen.</GuideStep>
          <GuideStep title="Record the application">Fill in the student&apos;s details, the branch where your school has more than one, and the <strong>Level applied for</strong>. An applicant is not given a class.</GuideStep>
          <GuideStep title="Add a guardian">Every applicant needs at least one guardian and exactly one primary contact.</GuideStep>
          <GuideStep title="Save">On <strong>Review</strong>, select <strong>Save applicant</strong>. You return to Applicants and the child appears under Awaiting decision.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="admission-steps" title="Move an applicant through your steps">
        <p>Where your school has named its admission steps in <strong>Settings</strong> under <strong>Admissions</strong>, the board shows them. A school with no steps sees none of this.</p>
        <GuideSteps>
          <GuideStep title="Filter by step">Above the applications, choose <strong>All steps</strong>, <strong>Not started</strong> or a step to list only the children at it. Each chip shows its count.</GuideStep>
          <GuideStep title="Read the step">Each card has a <strong>Step</strong> row with the step the child is at, or <strong>Not started</strong>.</GuideStep>
          <GuideStep title="Move the child on">Pick the next step in the step list on the card. A drawer opens, for example <strong>Move to Interview</strong>, with a <strong>Reason (optional)</strong> box kept on the applicant&apos;s history, where only roles allowed to read reasons (School Admin and Branch Admin, unless your school changes that) can see it. When the step is an offer, the drawer also says how many days the family has to accept. Select <strong>Move</strong>, and XVS confirms, for example <strong>Tunde Okafor moved to Interview.</strong></GuideStep>
        </GuideSteps>
        <p>At a step your school has made an offer, the card says how long the family has: <strong>Offer open until 12 Oct 2026.</strong></p>
        <GuideCallout tone="warning" title="An expired offer waits for you">When the days run out the card turns amber: <strong>Offer expired on 12 Oct 2026. Extend it, move them on, or close the application.</strong> Nothing happens to the application until somebody decides. Select <strong>Extend 7 days</strong> to open <strong>Extend the offer</strong>, add an optional reason, and select <strong>Extend</strong> to give the family another week from today. You can also move the child to another step, or close the application.</GuideCallout>
      </GuideSection>

      <GuideSection id="put-on-the-roll" title="Put an applicant on the roll">
        <GuideSteps>
          <GuideStep title="Choose the application">Under <strong>Awaiting decision</strong>, find the child and select <strong>Put on the roll</strong>.</GuideStep>
          <GuideStep title="Give the admission number">Enter the <strong>Admission number</strong>. If your school requires one, the field is required and shows the school&apos;s own format hint. Otherwise you may leave it blank and issue it later.</GuideStep>
          <GuideStep title="Enrol">Add a <strong>Reason (optional)</strong> if it helps, then select <strong>Enrol</strong>. The child becomes an enrolled student.</GuideStep>
        </GuideSteps>
        <p>Where your school requires documents before enrolling, the child is not put on the roll until each is on their record. The refusal names what is missing, for example <em>Tunde Bello cannot be confirmed until the birth certificate and transfer certificate are on their record.</em> Upload them on the child&apos;s <strong>Documents</strong> tab first.</p>
        <GuideCallout tone="warning" title="Enrolling does not give them a class">Putting an applicant on the roll does not seat them anywhere. Place them next, so the placement carries its own reason and appears on their history. Until then they appear under <strong>Needs a class</strong>.</GuideCallout>
      </GuideSection>

      <GuideSection id="close-an-application" title="Close an application">
        <GuideSteps>
          <GuideStep title="Choose the application">Under <strong>Awaiting decision</strong>, select <strong>Close application</strong>.</GuideStep>
          <GuideStep title="Give a reason">Write the <strong>Reason</strong>. It is kept on the record so the decision can be read later. Select <strong>Continue</strong>.</GuideStep>
          <GuideStep title="Confirm">Select <strong>Close application</strong> in the confirmation. The record moves to <strong>Closed</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Closing is not withdrawing">A closed application belongs to a child who was never on the roll. Withdrawing is for a student who was enrolled and has left, and it is done with Change status on their profile.</GuideCallout>
      </GuideSection>

      <GuideSection id="place-in-a-class" title="Place them in a class">
        <p>Open <strong>Needs a class</strong> and select <strong>Assign a class</strong> on a card. Choose the <strong>Destination class</strong>, a <strong>Reason</strong> and the <strong>Effective date</strong>, then select <strong>Assign student</strong>. To place several children at once, use <strong>Classes &amp; Transfers</strong> instead.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ProblemGrid items={[
          { title: "Put on the roll is missing", body: "Deciding on an application needs permission to change a student's status. You can still read the application." },
          { title: "Enrol stays disabled", body: "Your school requires an admission number. Enter one that matches the format shown under the field." },
          { title: "Put on the roll is refused for missing documents", body: "Your school requires those documents before an applicant joins the roll, and the message names the ones missing. Upload them on the child's Documents tab, then try again." },
          { title: "There is no step list on the cards", body: "Your school has not named any admission steps. A school administrator sets them in Settings, under Admissions." },
          { title: "An applicant I added is not listed", body: "Check the branch and year in the sidebar. An applicant is listed under the year of the level they applied for, or the running year if they named no level." },
          { title: "Assign a class is missing", body: "Placing a student needs the class assignment permission. Ask whoever places students at your school." },
        ]} />
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Every application under Awaiting decision has been enrolled or closed with a reason, no card shows an expired offer, and Needs a class is empty.</GuideCallout>
      </GuideSection>
    </div>
  );
}
