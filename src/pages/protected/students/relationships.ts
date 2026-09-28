import { useGetGuardianRulesQuery } from "@/redux/services/students/students-api";
import {
  RELATIONSHIPS,
  type LabelledOption,
} from "@/redux/services/students/students-types";

/**
 * The relationships a picker offers at this school.
 *
 * The school's own list from its guardian rules: the fixed eight, plus any
 * words it has added (Sponsor, Driver), with Other last. Until the rules load,
 * and on an older server, the fixed eight.
 */
export function useRelationshipOptions(): readonly LabelledOption[] {
  const { data } = useGetGuardianRulesQuery();
  return data?.data.relationships ?? RELATIONSHIPS;
}

/**
 * The words to show for a relationship.
 *
 * The server's own label wins (it carries the school's word for a relationship
 * stored as Other). Then a fixed choice's label. Then the value itself, which
 * for one of the school's own relationships is already the word.
 */
export function relationshipLabel(value: string, serverLabel?: string): string {
  if (serverLabel) return serverLabel;
  return RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}
