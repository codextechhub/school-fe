import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function NotLiveYetArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Until a school goes live, only the parts of XVS needed to set it up are open. Everything else opens on the day the school goes live. Nothing is wrong with your account, and nothing you have done is lost.</p>
        <GuideChecklist items={[
          "Your school is still working through its onboarding checklist.",
          "You know who at your school is leading the setup.",
        ]} />
      </GuideSection>

      <GuideSection id="recognise-it" title="Recognise it">
        <p>The header reads <strong>Not available yet</strong>, or the page shows <strong>This part of XVS opens when your school goes live</strong> with the note that onboarding is the part you can use and your checklist is where you left it. It appears whenever you open a screen that is closed before go-live, from a bookmark, an old link or the address bar.</p>
        <GuideCallout tone="info" title="Not a permission problem">A colleague with a bigger role sees the same page. Go-live opens these screens for everybody at once.</GuideCallout>
      </GuideSection>

      <GuideSection id="what-you-can-use" title="What you can use before go-live">
        <GuideSteps>
          <GuideStep title="The onboarding screens">The sidebar shows the <strong>Onboarding</strong> group: <strong>Control Room</strong>, <strong>Academic Structure</strong> and <strong>Go-Live</strong>, each only if your role includes it. Select <strong>Back to control room</strong> on the notice to return to the checklist.</GuideStep>
          <GuideStep title="The search box">It offers only the screens a school can open before go-live, so it is a safe way to reach them.</GuideStep>
          <GuideStep title="Notifications and help">The bell, the headset and the how-to guides all work before go-live.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li>There is no branch or session selector at the foot of the sidebar: setup belongs to the school as a whole, so the selectors appear only after go-live.</li>
          <li>The school has gone live but the notice still shows: reload the page so XVS reads the school&apos;s new status.</li>
          <li>You need a closed screen to finish setup: raise a ticket from the headset in the header and say which checklist step is blocked.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "You know the screen is closed until go-live, not refused to you.",
          "You can get back to the Control Room or another onboarding screen.",
        ]} />
      </GuideSection>
    </div>
  );
}
