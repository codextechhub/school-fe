import { GuideCallout, GuideChecklist, GuideSection, GuideStep, GuideSteps } from "../../article-components";

export default function MessagesArticle() {
  return (
    <div className="space-y-10">
      <GuideSection id="before-you-start" title="Before you start">
        <p>Messages is the school&apos;s own inbox. Staff write to each other, to a pupil&apos;s parents and to pupils, keep staff groups, and send one message to many colleagues at once. Open <strong>Messages</strong> under Communication in the sidebar. A number beside it counts the messages waiting for you.</p>
        <GuideChecklist items={[
          "Your role can read messages. Starting or answering one needs a separate permission, so a role may read without being able to write.",
          "To write to a parent or a pupil, your role can message families, and you are one of the staff that family can reach: their class teacher, a teacher of their class, or the school office.",
          "To create a group or send a broadcast, your role holds that permission. Ask an administrator if the choice is missing.",
        ]} />
        <GuideCallout tone="info" title="Messages are text only">Messages carry plain text. Alerts about a new message tell you who wrote and where to read it. They never carry the message itself.</GuideCallout>
      </GuideSection>

      <GuideSection id="read-and-reply" title="Read and reply">
        <p>The list on the left shows your conversations, newest first. Use the tabs to narrow it to <strong>Direct</strong> messages, <strong>Parents and pupils</strong>, <strong>Groups</strong> or <strong>Broadcasts</strong>, switch on <strong>Unread</strong>, or search by name, pupil or words in a message you can read. On a phone, selecting a conversation fills the screen and the back arrow returns to the list.</p>
        <GuideSteps>
          <GuideStep title="Open a conversation">Select it. The newest message is at the bottom, and opening it marks what you can see as read. Select <strong>Load earlier messages</strong> to go further back.</GuideStep>
          <GuideStep title="Write a reply">Type in the box and select <strong>Send</strong>. Press Ctrl or Cmd with Enter to send from the keyboard. A message can be up to 4,000 characters, and a counter appears as you near the limit.</GuideStep>
          <GuideStep title="If a send fails">Your words stay in the box. Select Send again: the same words are never delivered twice, even if the first try did get through.</GuideStep>
        </GuideSteps>
        <p>A conversation that is read-only shows the reason where the box would be, for example when the other person no longer works at the school.</p>
        <GuideCallout tone="tip" title="Direct messages between two colleagues are private">Only the two people in a staff-to-staff conversation can read it. Nobody, including a school leader, has a way to open it.</GuideCallout>
      </GuideSection>

      <GuideSection id="start-a-message" title="Start a message">
        <GuideSteps>
          <GuideStep title="Choose New, then Message">Select <strong>New</strong> at the top of the page.</GuideStep>
          <GuideStep title="Pick who it is for">Choose <strong>Colleague</strong> and search for the person. To write to a family, choose <strong>Parent or pupil</strong>, find the pupil, and then choose the pupil or one of their parents. A parent who has no parent app account is shown greyed out with that reason, because they cannot be messaged yet.</GuideStep>
          <GuideStep title="Write the first message">Write it and select <strong>Send message</strong>. If you already have a conversation with that person about that pupil, your message goes into it instead of starting a second one.</GuideStep>
        </GuideSteps>
        <GuideCallout tone="info" title="Parents and pupils can read more than you may expect">A pupil&apos;s primary parent can read every conversation the pupil has with staff, without replying. A pupil&apos;s own app says so plainly to the pupil.</GuideCallout>
      </GuideSection>

      <GuideSection id="groups" title="Staff groups">
        <p>A group is a conversation for staff you choose, such as the JSS1 form teachers. Groups hold staff only.</p>
        <GuideSteps>
          <GuideStep title="Create it">Select <strong>New</strong>, then <strong>Group</strong>. Give it a name, choose its members and, if you like, write a first message. At a school with several branches you also choose the branch, and only that branch&apos;s staff can be added.</GuideStep>
          <GuideStep title="Look after it">Open the group and select <strong>People</strong>. The owner can rename the group, add colleagues, remove members and make another member an owner. Everyone can leave.</GuideStep>
        </GuideSteps>
        <p>Someone added later sees only what is said after they join. Someone removed, or who leaves, loses the group, including what was said while they were in it. The last owner cannot leave while others remain: make another member an owner first.</p>
      </GuideSection>

      <GuideSection id="broadcasts" title="Broadcasts and replies">
        <p>A broadcast is one message from you to many colleagues, with a title. Each recipient gets it in their own inbox, and they see how many people it went to but not who.</p>
        <GuideSteps>
          <GuideStep title="Write it">Select <strong>New</strong>, then <strong>Broadcast</strong>. Add a title and the message, choose the branch where your school has several, and choose the people. <strong>Select all shown</strong> adds everyone on the page you are looking at.</GuideStep>
          <GuideStep title="Choose the reply setting">Pick <strong>One-way</strong> when people only need to read it. Pick <strong>Replies allowed</strong> when you want answers: each reply comes to you privately, and other recipients never see it. The setting is fixed once the broadcast is sent.</GuideStep>
          <GuideStep title="Answer a broadcast you received">On a broadcast that allows replies, select <strong>Reply privately</strong>. Your answer opens a private conversation with the sender. On a one-way broadcast the screen says so, and there is nothing to reply to.</GuideStep>
        </GuideSteps>
        <p>As the sender you can open <strong>Recipients</strong> to see the full list. Replies arrive in your inbox, each as its own conversation under <strong>Broadcasts</strong>.</p>
      </GuideSection>

      <GuideSection id="what-leaders-can-inspect" title="What leaders can inspect">
        <p>A school leader with the right permissions can read some conversations they are not part of. This is read-only, and <strong>every opening is recorded in the audit trail</strong>, with who opened what and when.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Groups</strong> within their branches.</li>
          <li><strong>Broadcasts</strong> within their branches, the broadcast itself and never the private replies to it.</li>
          <li><strong>Pupil conversations</strong> within their branches, held by those with welfare oversight. These are also readable by each pupil&apos;s primary parent.</li>
        </ul>
        <p>If you hold one of these permissions, <strong>Oversight</strong> appears at the top of the Messages page. A list shows only names, who is in each conversation and how many messages it holds. Opening one shows a banner that you are reading without taking part, and there is no box to write in. Direct messages between colleagues and conversations between staff and parents cannot be inspected.</p>
      </GuideSection>

      <GuideSection id="common-problems" title="Common problems">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>There is no New button.</strong>: your role cannot start messages, groups or broadcasts. Ask an administrator.</li>
          <li><strong>Your role cannot send messages.</strong>: you can read but not write. An administrator can change this under Field Access.</li>
          <li>A parent or pupil is not in the list: you can reach only the pupils you teach or look after, or, if you are in the school office, those at your branches.</li>
          <li>The group name or a person&apos;s name looks blank or generic: your role may not read names in messages. Field Access decides this for each role.</li>
          <li>A colleague is missing from the picker: only staff at your branches, or at the whole school, can be chosen.</li>
        </ul>
      </GuideSection>

      <GuideSection id="completion-check" title="Completion check">
        <GuideChecklist items={[
          "The conversation appears in your list, and the person you wrote to can see your message.",
          "The number beside Messages in the sidebar drops as you read what was waiting.",
          "For a broadcast, the sender sees the recipient list and the reply setting.",
        ]} />
      </GuideSection>
    </div>
  );
}
