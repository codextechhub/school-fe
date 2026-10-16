import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function ApproveAndPublishArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>When a class teacher submits their class, it waits for the principal under <strong>Gradebook</strong>, <strong>Approvals</strong>. From there you return it, write the principal&apos;s comments, or approve and publish it. Published classes stay on the list.</p>
        <GuideChecklist items={[
          "Your role may approve and publish results.",
          "The class's teacher has submitted it, so it reads Awaiting approval.",
        ]} />
      </GuideSection>

      <GuideSection id="read-the-class" title="Read the class">
        <p>The decision desk separates classes awaiting approval from those already published. Select a class to bring its subjects, class teacher, stage and held results into focus. A held result names the student and who held it. Select <strong>Open broadsheet</strong> to read every student&apos;s marks and open any student&apos;s report.</p>
      </GuideSection>

      <GuideSection id="comments" title="Write the principal's comments">
        <p>A report card prints the principal&apos;s comment for the band its student&apos;s overall average falls in, so a class has one comment per band. Select <strong>Principal&apos;s comments</strong>, start each band from the school&apos;s remark or write your own, and save. A band left blank prints the school&apos;s remark.</p>
      </GuideSection>

      <GuideSection id="return" title="Return a class">
        <GuideSteps>
          <GuideStep title="Choose who it goes back to">The class teacher, to change comments or ratings, or one subject&apos;s teacher, to change that subject&apos;s marks.</GuideStep>
          <GuideStep title="Write why">The note is required. It is pinned where they will see it, and nothing is deleted.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="publish" title="Approve and publish">
        <p>Select <strong>Approve and publish</strong>. Before anything happens you see how many results will be released, how many guardians will be emailed, how many have no email on file, and each held student. Publishing locks every mark, comment and rating; a change after that is an amendment.</p>
        <GuideCallout tone="info" title="Several classes at once">When two or more classes are waiting, tick them and select <strong>Publish</strong> at the top. Each class is published on its own, so one that cannot be published does not stop the others.</GuideCallout>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="There is no Return or Publish button">The class is not awaiting approval, or your role can only read it.</GuideStep>
          <GuideStep title="A held student was not released">Held results stay back when the class is published. Lifting the hold under Fee holds releases the result then.</GuideStep>
        </GuideSteps>
      </GuideSection>
    </div>
  );
}
