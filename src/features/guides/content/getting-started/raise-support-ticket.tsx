import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function RaiseSupportTicketArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Your school is its own first line of support. A ticket goes to the people at your school who look after support, and they send it on to XVS when they cannot solve it themselves. The same ticket, with the same reference and replies, travels with it.</p>
        <GuideChecklist items={[
          "Stay on the screen where the problem happened.",
          "Know what you expected, and what happened instead.",
          "Have a screenshot ready if it helps to show the problem.",
          "Leave out passwords, reset links and invitation links.",
        ]} />
      </GuideSection>

      <GuideSection id="raise-a-ticket" title="Raise a ticket">
        <GuideSteps>
          <GuideStep title="Open the help panel">Select the headset beside the bell in the header. <strong>How can we help?</strong> opens over the page you are on, and the ticket records which screen that was. <strong>Raise an issue</strong> on the <strong>Support</strong> screen opens the same panel.</GuideStep>
          <GuideStep title="Check the guides for this page">The link at the foot of the panel lists the guides written for this screen. <strong>Back to your ticket</strong> returns to the form with anything you typed kept.</GuideStep>
          <GuideStep title="Write a Title and Description">The title is one line, up to 220 characters. In the description, say what happened, what you expected, and what you have tried.</GuideStep>
          <GuideStep title="Choose a Category and Priority">Category is one of Support request, Bug report, Help, Account, Billing or Other. Priority runs from Low to Urgent; keep Urgent for work that has stopped.</GuideStep>
          <GuideStep title="Add screenshots or files">Optional. Up to 5 files of 10 MB each: images, PDFs and spreadsheets.</GuideStep>
          <GuideStep title="Select Create ticket">You see <strong>Ticket filed</strong> and a <strong>Reference</strong>. Keep the reference. Select <strong>Done</strong> to return to your page, or <strong>File another ticket</strong>.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="A file did not upload">If the confirmation names a file that did not upload, the ticket is still filed. Do not raise it again: add the file as a reply on the ticket instead.</GuideCallout>
      </GuideSection>

      <GuideSection id="follow-a-ticket" title="Follow a ticket">
        <p>Open <strong>Support</strong> under Communication in the sidebar. The tabs <strong>Open</strong>, <strong>Resolved</strong>, <strong>Closed</strong> and <strong>All</strong> filter the list, and <strong>Search tickets</strong> finds one by its words. The <strong>Status</strong> column reads <strong>With XVS</strong> once a ticket has been sent on.</p>
        <GuideSteps>
          <GuideStep title="Open the ticket">Select a row. The <strong>Conversation</strong> shows every reply, newest at the bottom, and refreshes by itself while the page is open.</GuideStep>
          <GuideStep title="Reply">Type in the box under the conversation and select <strong>Send reply</strong>, or press Ctrl Enter (Command Enter on a Mac). <strong>Attach file</strong> adds one file to the reply. Everybody on the ticket sees what you write.</GuideStep>
          <GuideStep title="Mute or Unmute">You are notified about activity on tickets you are part of. <strong>Mute</strong> stops those notifications without taking you off the ticket.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="send-to-xvs" title="Work a ticket and send it to XVS">
        <p>If you look after support for your school, a ticket shows a <strong>Manage</strong> panel on the right (below the conversation on a phone).</p>
        <GuideSteps>
          <GuideStep title="Solve it at the school where you can">Reply in the conversation, then select <strong>Mark resolved</strong> when it is fixed, or <strong>Close ticket</strong> when nothing more will happen. <strong>Mark open</strong> brings a resolved or closed ticket back.</GuideStep>
          <GuideStep title="Select Send to XVS">Use it when the problem is beyond the school. Fill in <strong>What have you already tried?</strong> and select <strong>Send</strong>. A <strong>With XVS</strong> note shows who sent it and when, and the conversation carries on in the same place.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>You can read this ticket, but you cannot reply to it.</strong>: you can see the ticket but are not one of the people who may answer it.</li>
          <li>A closed ticket shows <strong>This ticket is closed.</strong> and no reply box. Ask whoever looks after support at your school to select <strong>Mark open</strong>, or raise a fresh ticket and quote the old reference.</li>
          <li><strong>Nothing raised yet</strong> on the Support screen: nobody has raised a ticket you can see. Check the <strong>All</strong> tab before assuming a ticket is lost.</li>
          <li>Support is missing from the sidebar: while your school is still being set up, the sidebar shows only the onboarding screens. Type <em>support</em> into the search box and choose <strong>View support tickets</strong>.</li>
          <li>There is no <strong>Send to XVS</strong> button: either the ticket is already with XVS, or you do not look after support for your school.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "You have the ticket reference.",
          "The ticket appears on the Support screen.",
          "The description says what happened and what you expected.",
          "No password or private link is in the ticket.",
        ]} />
      </GuideSection>
    </div>
  );
}
