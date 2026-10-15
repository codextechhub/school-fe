import type { DateFormatters } from "@/lib/dates";
import type { ExamPaper } from "@/redux/services/gradebook/gradebook-types";

/** "Wed 3 Dec, morning": when the subject's examination paper is sat. */
export function examPaperText(fmt: DateFormatters, paper: ExamPaper | null): string | null {
  if (!paper) return null;
  const day = fmt.formatDay(paper.date, { weekday: "short", year: false });
  return paper.sitting_label ? `${day}, ${paper.sitting_label.toLowerCase()}` : day;
}
