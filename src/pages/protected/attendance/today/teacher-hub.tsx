import { Link } from "react-router";
import { ChevronRight, ClipboardList } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type {
  RegisterStatus,
  TeacherClassCard,
  TeacherHub as TeacherHubData,
  TeacherLessonCard,
} from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { ClosedDayNotice } from "../components/closed-day-notice";
import { timeOnDay } from "../time-on-day";

/**
 * A teacher's own registers for one day: the class they lead, and the lessons
 * they teach where their school marks lessons.
 *
 * Each card says where its register stands. The status and who submitted it
 * follow the register's own Field Access switches, so a teacher whose role may
 * not read the status sees the card without it.
 */
export function TeacherHub({ hub }: { hub: TeacherHubData }) {
  if (hub.closed) {
    return <ClosedDayNotice closed={hub.closed} dateLabel={hub.date_label} />;
  }

  const lessons = hub.lessons ?? [];
  if (hub.classes.length === 0 && lessons.length === 0) {
    return (
      <OutlinedNotice
        icon={ClipboardList}
        title="No registers for you on this day"
        body="You do not lead a class, and no lesson on your timetable falls on this day. A class teacher's register appears here once you are made a class's teacher."
      />
    );
  }

  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <h2 className="font-mont text-base font-semibold text-black-01">My registers</h2>
      <ul className="grid gap-3">
        {hub.classes.map((card) => (
          <ClassCard key={card.class_id} card={card} date={hub.date} />
        ))}
        {lessons.map((card) => (
          <LessonCard key={card.slot_id} card={card} date={hub.date} />
        ))}
      </ul>
      {!hub.lesson_marking_on && hub.classes.length > 0 && (
        <p className="text-sm text-gray-06">
          Lesson marking is off for your classes, so a class has one register a day and nothing else.
        </p>
      )}
    </Panel>
  );
}

const STATUS_TEXT: Record<RegisterStatus, { text: string; variant: "active" | "pending" | "inactive" }> = {
  SUBMITTED: { text: "Submitted", variant: "active" },
  READY: { text: "Ready to submit", variant: "pending" },
  IN_PROGRESS: { text: "In progress", variant: "pending" },
  NOT_STARTED: { text: "Not yet taken", variant: "pending" },
  CLOSED_DAY: { text: "No register", variant: "inactive" },
};

function ClassCard({ card, date }: { card: TeacherClassCard; date: string }) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const fmt = useSchoolDisplay();
  const { today } = fmt;
  const status = !access.isHidden("status") ? card.status : undefined;
  const submitted =
    card.submitted_at && !access.isHidden("taken_by")
      ? `Submitted ${timeOnDay(fmt, card.submitted_at, date)}${card.submitted_by_name ? ` by ${card.submitted_by_name}` : ""}`
      : null;
  const size = card.student_count !== undefined ? `${card.student_count} students` : null;
  return (
    <CardRow
      title={`${card.class_name} · morning register`}
      meta={submitted ?? [`Taken before the first lesson`, size].filter(Boolean).join(" · ")}
      status={status}
      to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(card.class_id, date === today() ? undefined : date)}
      cta={status === "SUBMITTED" ? "Open" : "Take register"}
    />
  );
}

function LessonCard({ card, date }: { card: TeacherLessonCard; date: string }) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_LESSON);
  const fmt = useSchoolDisplay();
  const { formatTime, today } = fmt;
  const status = !access.isHidden("status") ? card.status : undefined;
  const marked =
    card.submitted_at && !access.isHidden("taken_by")
      ? `marked ${timeOnDay(fmt, card.submitted_at, date)}`
      : null;
  return (
    <CardRow
      title={`${card.period_label} · ${card.subject}`}
      meta={[card.class_name, formatTime(card.start_time), marked].filter(Boolean).join(" · ")}
      status={status}
      to={routesPath.PROTECTED.ATTENDANCE.LESSON_ID(card.slot_id, date === today() ? undefined : date)}
      cta={status === "SUBMITTED" ? "Open" : "Mark lesson"}
    />
  );
}

function CardRow({
  title,
  meta,
  status,
  to,
  cta,
}: {
  title: string;
  meta: string;
  status?: RegisterStatus;
  /** Where the card opens. A card with none is information only. */
  to?: string;
  cta?: string;
}) {
  const chip = status ? STATUS_TEXT[status] : null;
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-black-01">{title}</p>
        <p className="text-xs text-gray-05">{meta}</p>
      </div>
      {chip && (
        <Badge variant={chip.variant} className="rounded-full">
          {chip.text}
        </Badge>
      )}
      {to && cta && (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {cta}
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      )}
    </>
  );
  const box = "flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3";
  return (
    <li>
      {to ? (
        <Link to={to} className={`${box} transition-colors hover:bg-primary/5`}>
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}
