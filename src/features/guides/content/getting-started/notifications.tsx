import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function NotificationsArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Notifications tell you what has happened that concerns you, such as a reply on a support ticket or a decision waiting for you. Every signed-in user has them, including while the school is still being set up.</p>
        <GuideChecklist items={[
          "You are signed in.",
          "You know the bell in the header is where new notifications arrive.",
        ]} />
      </GuideSection>

      <GuideSection id="use-the-bell" title="Use the bell">
        <GuideSteps>
          <GuideStep title="Read the count">A number on the bell shows how many notifications you have not read. No number means nothing is waiting.</GuideStep>
          <GuideStep title="Open the tray">Select the bell to see your latest unread notifications. When there are none it reads <strong>You are all caught up</strong>.</GuideStep>
          <GuideStep title="Open or clear one">Select a notification to mark it read and open the record it is about. The cross beside it marks it read without leaving the page. <strong>Clear all</strong> marks every one read.</GuideStep>
        </GuideSteps>
        <GuideCallout title="Some notifications open nothing">A notification about something this app has no screen for is marked read where it stands. The message itself is the whole notification.</GuideCallout>
      </GuideSection>

      <GuideSection id="notification-centre" title="Use the Notification Centre">
        <p>Select <strong>View all notifications</strong> at the foot of the tray, or <strong>Notifications</strong> under Communication in the sidebar once your school is live.</p>
        <GuideSteps>
          <GuideStep title="Choose a tab">The page opens on <strong>Unread</strong>. <strong>Read</strong> and <strong>All</strong> show older notifications.</GuideStep>
          <GuideStep title="Search">Type in <strong>Search notifications</strong> to find one by its words.</GuideStep>
          <GuideStep title="Catch up in one step">Select <strong>Mark all as read</strong> to clear everything unread.</GuideStep>
        </GuideSteps>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Nothing to show</strong> on Read or All: nothing has been sent to you yet.</li>
          <li><strong>No notifications match that search</strong>: try a different word, or clear the search box.</li>
          <li><strong>We could not load your notifications</strong>: select <strong>Try again</strong>. If it keeps failing, raise a support ticket from the headset in the header.</li>
          <li>Too many notifications about one support ticket: open the ticket and select <strong>Mute</strong>.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "The bell shows no number, or only notifications you are still working on.",
          "You can open a notification's record from the tray.",
          "You can find an older notification in the Notification Centre.",
        ]} />
      </GuideSection>
    </div>
  );
}
