import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

const PROBLEMS = [
  ["Request go-live is greyed out in the control room", "Some required steps are still open. The Going live panel names them."],
  ["There is no Request go-live button at all", "Your role can see where the school stands but cannot ask to go live. A school administrator sends the request."],
  ["The request button on the form stays disabled", "Pick a preferred date and tick the confirmation box."],
  ["You sent the request with a mistake", "You cannot withdraw a request. Use the link under the pending request to tell XVS, and they will decline it so you can send another."],
  ["You cannot open the go-live request", "Your account does not include go-live requests. Ask whoever set up your account."],
] as const;

export default function RequestGoLiveArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Going live is a request, not a switch. When your required steps are done, you ask XVS to take your school live, and XVS reviews every request by hand. Open <strong>Go-Live</strong> from the sidebar, or select <strong>Request go-live</strong> in the control room&apos;s <strong>Going live</strong> panel.</p>
        <GuideChecklist items={[
          "Every required step in the control room shows Done.",
          "The school name, sign-in address and school code on your profile are correct.",
          "Your administrators have accepted their invitations.",
          "You have agreed a preferred go-live date with your staff.",
        ]} />
      </GuideSection>

      <GuideSection id="check-readiness" title="Check you are ready">
        <p>The top card shows your readiness: <strong>Not ready</strong>, <strong>Ready</strong>, <strong>Pending approval</strong> or <strong>Live</strong>, and when it was last checked. When you are not ready, it lists the required steps that are not done yet, with <strong>Back to control room</strong>. Select <strong>Re-check</strong> after finishing a step to have XVS look again.</p>
      </GuideSection>

      <GuideSection id="send-the-request" title="Send the request">
        <p>When you are <strong>Ready</strong>, the request form opens on the same card.</p>
        <GuideSteps>
          <GuideStep title="Pick a preferred date">Choose a <strong>Preferred date</strong>, today or later. XVS aims for it, and your school goes live when XVS approves the request.</GuideStep>
          <GuideStep title="Add a note if it helps">Use <strong>Anything XVS should know (optional)</strong> for timing, staff availability or data.</GuideStep>
          <GuideStep title="Confirm and send">Tick the box confirming your information is correct and your staff are ready to use XVS, then select <strong>Request go-live</strong>.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="while-you-wait" title="While XVS reviews it">
        <p>Your readiness shows <strong>Pending approval</strong>, and the card says when and by whom the request was sent. <strong>Request history</strong> lists every request you have sent; choose <strong>View details</strong> from a row&apos;s menu to read one in full.</p>
        <GuideCallout tone="warning" title="A request cannot be withdrawn">If something in it is wrong, use the link under the pending request to tell XVS. They will decline it so you can send another.</GuideCallout>
      </GuideSection>

      <GuideSection id="if-it-is-declined" title="If XVS declines it">
        <p>A card says <strong>XVS did not approve this request.</strong> It shows who reviewed it, when, and the reason in XVS&apos;s own words. Your steps are untouched and your school is ready again.</p>
        <GuideSteps>
          <GuideStep title="Fix what the reason describes">Make the change XVS asked for, usually on one of the checklist screens.</GuideStep>
          <GuideStep title="Send it again">Select <strong>Submit a new request</strong> to jump to the form, and send it as before. Select <strong>Get help</strong> if the reason is unclear.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="if-activation-fails" title="If activation fails">
        <p>Occasionally XVS approves a request but switching the school on breaks. The card shows <strong>Activation failed</strong> and a <strong>Failure reference</strong>. Nothing at your school was changed and there is nothing for you to fix.</p>
        <p>Select <strong>Report this to XVS</strong> to send the reference in a support ticket. <strong>Try again</strong> takes you to the form if you want to send the request again.</p>
      </GuideSection>

      <GuideSection id="after-go-live" title="After go-live">
        <p>The go-live screen says your school is live and offers <strong>Go to School Dashboard</strong>. The full sidebar opens, your staff can sign in, and onboarding closes: the control room stays available as a read-only record, and you can still find it from the search box.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-black-01">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-01">{body}</p>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideCallout tone="tip" title="You are done when">Your readiness shows <strong>Live</strong>, the go-live screen offers <strong>Go to School Dashboard</strong>, and your staff can sign in and reach their screens.</GuideCallout>
      </GuideSection>
    </div>
  );
}
