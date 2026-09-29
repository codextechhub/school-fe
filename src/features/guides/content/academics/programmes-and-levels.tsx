import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";
import { useGuideWords } from "../../guide-words";

export default function ProgrammesAndLevelsArticle() {
  const w = useGuideWords();
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>A programme is a stage of schooling, such as Nursery, Primary or Junior Secondary. Its levels are the rungs pupils climb inside it, such as JSS1, JSS2 and JSS3. Classes sit at a level, so levels must exist before classes can. Open <strong>Academic Structure</strong>, then <strong>Programmes &amp; Levels</strong>.</p>
        <GuideChecklist items={[
          `The school year you are setting up exists on Sessions & ${w.Terms}.`,
          "The year selector at the foot of the sidebar shows that year.",
          "You have the list of levels in each programme, in order.",
          "Departments are added, if you want to group programmes under them.",
        ]} />
        <GuideCallout tone="info" title="Programmes stay, levels belong to a year">A programme carries over from year to year. Its levels belong to the year you are looking at, so a year you have just created shows every programme with no levels. If you may copy structure, the notice at the top of the list offers <strong>Copy from another year</strong>, which brings another year&apos;s levels across instead of making you type them again.</GuideCallout>
      </GuideSection>

      <GuideSection id="add-a-programme" title="Add a programme">
        <GuideSteps>
          <GuideStep title="Open the form">Select <strong>Add programme</strong>.</GuideStep>
          <GuideStep title="Name it">Type the <strong>Programme name</strong>, for example <em>Junior Secondary</em>. The <strong>Code</strong> is built from the name; type over it to use your own, such as JSS.</GuideStep>
          <GuideStep title="Pick a department">Choose a <strong>Department</strong>, or leave it as <strong>No department</strong>. It is optional.</GuideStep>
          <GuideStep title="Choose where it applies">When your school runs more than one branch, choose <strong>The whole school</strong> or <strong>One branch</strong>. Most schools run one set of programmes across every branch.</GuideStep>
          <GuideStep title="Save">Select <strong>Create</strong>. The programme appears in the list with no levels yet.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="add-levels" title="Add levels">
        <p>Add levels in the order pupils move through them. There are two ways:</p>
        <GuideSteps>
          <GuideStep title="One at a time">Select <strong>Add level</strong> on the programme. Type the <strong>Level name</strong>, for example <em>JSS1</em>, set where it promotes to (see below) and select <strong>Create</strong>.</GuideStep>
          <GuideStep title="Several at once">Choose <strong>Add levels in bulk</strong> from the programme&apos;s menu, or <strong>Add several</strong> inside an open programme. Type one level name per line. Codes are generated for you, and the preview under <strong>What will be created</strong> shows each line before you save.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="warning" title="Bulk adding stops on a duplicate">If a line matches a level the programme already has, it is marked <strong>Already exists</strong> and nothing is added until you remove that line.</GuideCallout>
        <p>A level inside a programme that belongs to one branch belongs to that branch too. The form states the branch rather than offering a choice.</p>
      </GuideSection>

      <GuideSection id="set-promotion" title="Say where each level promotes to">
        <p>Every level needs an answer to one question: where do its pupils go at the end of the year? Open a level and use <strong>Promotes to</strong>:</p>
        <GuideSteps>
          <GuideStep title="Another level">Pick the next level, for example JSS1 promotes to JSS2.</GuideStep>
          <GuideStep title="Pupils leave the school">Choose this for the last level, such as JSS3 at a school that ends there. The level then reads <strong>Pupils finish here</strong>.</GuideStep>
          <GuideStep title="Not set yet">The starting answer. Pupils at a level left unset cannot be promoted.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="danger" title="Do not leave levels unset before promotion">A programme shows <strong>Promotion path ready</strong> only when every active level has an answer. Until then it reads, for example, <em>2 levels need promotion rules</em>. Fix these before the end of the year.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-the-list" title="Read the programme list">
        <p>Each programme shows its code and department, and counts its <strong>Levels</strong>, <strong>Classes</strong> and <strong>Offerings</strong> (subjects taught at its levels). Select the programme, or <strong>View levels</strong>, to open <strong>Levels in order</strong>. Use <strong>Expand all</strong> to open every programme.</p>
        <p>Each level row shows its classes, its subjects and its promotion, such as <em>Promotes to JSS2</em>. Select a level to edit it. The search box looks at level names as well as programme names.</p>
      </GuideSection>

      <GuideSection id="archive-and-restore" title="Archive and restore">
        <p>Archive a programme from its menu, or a level with the archive button on its row. An archived programme or level stops appearing when anyone picks one. Its levels, classes and subject offerings stay exactly where they are.</p>
        <p>Set the status filter to <strong>Archived</strong> to find one again, then use <strong>Restore</strong>.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <GuideSteps>
          <GuideStep title="Add programme is greyed out">You are looking at an archived year, which is read-only. Switch to the active year in the sidebar.</GuideStep>
          <GuideStep title="A programme has no Add level">The programme is archived, the year is read-only, or your role cannot create structure. Restore an archived programme first.</GuideStep>
          <GuideStep title="Every programme shows zero levels">The year you are looking at has not been set up yet. Check the year selector, or copy the structure from another year.</GuideStep>
          <GuideStep title="A level name is refused">Level names must be unique inside their programme. The same name can exist in a different programme.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Each programme lists its levels in order, and every active programme reads Promotion path ready.</GuideCallout>
      </GuideSection>
    </div>
  );
}
