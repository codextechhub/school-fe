import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsPanel,
  SettingsSectionHeader,
} from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useGetAcademicRulesQuery,
  useUpdateAcademicRulesMutation,
} from "@/redux/services/academics/academics-api";
import type { AcademicRules, TermWord } from "@/redux/services/academics/academics-types";
import { fieldErrorsFor, parseApiError, writeErrorMessage } from "@/utils/api-error";
import { useSettingsWrite } from "../use-settings-write";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

const MAX_TERMS = 6;
const MAX_ARMS = 12;
const FIELDS = ["term_word", "term_names", "default_arms"] as const;

const WORD_TEXT: Record<TermWord, string> = {
  TERM: "Screens and messages say First Term, This term, Sessions and Terms.",
  SEMESTER: "Screens and messages say First Semester, This semester, Sessions and Semesters.",
};

/**
 * The school's own academic structure defaults.
 *
 * The word the school uses for a part of the year (Term or Semester), which
 * every screen and message prints; the parts a new academic year starts with,
 * in order, which may be any number from one to six; and the arms offered when
 * classes are added for a level.
 *
 * All three are starting points. Changing them never renames a year, a term or
 * a class that already exists, because those names are printed on invoices and
 * reports already issued.
 */
export function AcademicsSection() {
  const query = useGetAcademicRulesQuery();
  const rules = query.data?.data;

  if (query.isLoading) return <SectionLoading label="Loading academic structure settings…" />;
  if (query.isError || !rules) {
    return (
      <SectionLoadError
        forbidden={parseApiError(query.error).status === 403}
        retry={query.refetch}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Academic structure"
        description="What your school calls the parts of its year, the ones a new year starts with, and the arms new classes are offered."
      />
      <AcademicsForm key={JSON.stringify(rules)} rules={rules} />
    </div>
  );
}

function AcademicsForm({ rules }: { rules: AcademicRules }) {
  const { canSave, reason } = useSettingsWrite(P.UPDATE_SETTINGS);
  const [save, { isLoading: saving }] = useUpdateAcademicRulesMutation();
  const [word, setWord] = useState<TermWord>(rules.term_word);
  const [terms, setTerms] = useState<string[]>(rules.term_names);
  const [arms, setArms] = useState<string[]>(rules.default_arms);
  const [armDraft, setArmDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const label = word === "SEMESTER" ? "semester" : "term";
  const duplicateOf = (list: string[], index: number) =>
    list.some((other, i) => i !== index && other.trim().toLowerCase() === list[index].trim().toLowerCase());
  const termProblem = (index: number) => {
    const name = terms[index].trim();
    if (!name) return `Give this ${label} a name.`;
    if (name.length > 30) return "Keep the name to 30 characters.";
    if (duplicateOf(terms, index)) return `Two ${label}s have this name.`;
    return "";
  };
  const termsInvalid = terms.some((_, i) => termProblem(i));

  const arm = armDraft.trim();
  const armProblem = !arm
    ? ""
    : arm.length > 30
      ? "Keep it to 30 characters."
      : arms.some((a) => a.toLowerCase() === arm.toLowerCase())
        ? "That arm is already on the list."
        : arms.length >= MAX_ARMS
          ? `A school can list up to ${MAX_ARMS}.`
          : "";
  const armsProblem = arms.length === 0 ? "List at least one arm." : "";

  const changed =
    word !== rules.term_word ||
    terms.map((t) => t.trim()).join("\n") !== rules.term_names.join("\n") ||
    arms.join("\n") !== rules.default_arms.join("\n");

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= terms.length) return;
    const next = [...terms];
    [next[index], next[target]] = [next[target], next[index]];
    setTerms(next);
  };
  const addArm = () => {
    if (!arm || armProblem) return;
    setArms([...arms, arm]);
    setArmDraft("");
  };

  const onSave = async () => {
    if (!changed || termsInvalid || armsProblem) return;
    setErrors({});
    try {
      await save({
        term_word: word,
        term_names: terms.map((t) => t.trim()),
        default_arms: arms,
      }).unwrap();
      toast.success("Academic structure settings saved.");
    } catch (error) {
      const byField = fieldErrorsFor(error, FIELDS);
      setErrors(byField);
      if (Object.keys(byField).length === 0) {
        toast.error(writeErrorMessage(error, "We could not save these settings. Try again."));
      }
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="What your school calls them"
        description="The word every screen and message uses for a part of the school year."
      >
        <div className="grid grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          {rules.term_word_options.map((option) => {
            const value = option.value as TermWord;
            const active = value === word;
            return (
              <button
                key={value}
                type="button"
                disabled={!canSave}
                aria-pressed={active}
                onClick={() => setWord(value)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed",
                  active ? "border-primary bg-primary/5" : "border-white-02 bg-white hover:border-gray-02",
                )}
              >
                <span className="block font-mont text-xs font-semibold text-gray-01">{option.label}</span>
                <span className="mt-1 block font-mont text-[11px] leading-4 text-gray-05">{WORD_TEXT[value] ?? ""}</span>
              </button>
            );
          })}
        </div>
        <ErrorLine text={errors.term_word} />
      </SettingsPanel>

      <SettingsPanel
        title={word === "SEMESTER" ? "Semesters in a year" : "Terms in a year"}
        description={`In order. Every new academic year starts with these ${label}s, and you can still change a year's own ${label}s when you create it. Years already set up keep theirs.`}
      >
        <div className="space-y-2.5 px-4 py-4 sm:px-5">
          <ol className="space-y-2">
            {terms.map((name, index) => {
              const problem = termProblem(index);
              return (
                <li key={index}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-7 shrink-0 place-content-center rounded-full bg-gray-03 font-mont text-xs font-semibold text-gray-01">
                      {index + 1}
                    </span>
                    <Input
                      aria-label={`${label} ${index + 1} name`}
                      className="min-w-0 flex-1 basis-40"
                      value={name}
                      maxLength={40}
                      disabled={!canSave}
                      aria-invalid={problem ? true : undefined}
                      onChange={(e) => setTerms(terms.map((t, i) => (i === index ? e.target.value : t)))}
                    />
                    {canSave ? (
                      <span className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === terms.length - 1} onClick={() => move(index, 1)}>
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${name || `this ${label}`}`}
                          disabled={terms.length === 1}
                          onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </span>
                    ) : null}
                  </div>
                  {problem ? (
                    <p role="alert" className="mt-1 pl-9 font-mont text-[11px] text-destructive">{problem}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {canSave ? (
            <Button
              variant="outline"
              disabled={terms.length >= MAX_TERMS}
              onClick={() => setTerms([...terms, ""])}
            >
              <Plus className="size-4" />
              Add a {label}
            </Button>
          ) : null}
          <ErrorLine text={errors.term_names} inline />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Arms for new classes"
        description="Offered, in this order, when classes are added for a level: JSS1 with A, B and C makes JSS1 A, JSS1 B and JSS1 C. Classes already made keep their names."
      >
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <ul className="flex flex-wrap gap-2">
            {arms.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 rounded-full border border-white-02 bg-gray-03 py-1 pl-3 pr-1.5 font-mont text-xs text-gray-01"
              >
                {item}
                {canSave ? (
                  <button
                    type="button"
                    aria-label={`Remove ${item}`}
                    onClick={() => setArms(arms.filter((a) => a !== item))}
                    className="grid size-5 place-content-center rounded-full text-gray-05 hover:bg-white hover:text-gray-01"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {canSave ? (
            <div className="flex max-w-md flex-wrap items-start gap-2">
              <Input
                className="min-w-0 flex-1"
                placeholder="For example, Red"
                value={armDraft}
                maxLength={40}
                onChange={(e) => setArmDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addArm();
                  }
                }}
              />
              <Button variant="outline" onClick={addArm} disabled={!arm || !!armProblem}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          ) : null}
          <ErrorLine text={armProblem || armsProblem || errors.default_arms} inline />
        </div>
      </SettingsPanel>

      {canSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {changed ? <span className="font-mont text-xs text-gray-05">Unsaved changes</span> : null}
          <Button onClick={onSave} loading={saving} disabled={!changed || termsInvalid || !!armsProblem || saving}>
            Save academic structure settings
          </Button>
        </div>
      ) : (
        <ReadOnlyNote reason={reason} />
      )}
    </div>
  );
}

function ErrorLine({ text, inline }: { text?: string; inline?: boolean }) {
  if (!text) return null;
  return (
    <p role="alert" className={cn("font-mont text-[11px] text-destructive", !inline && "px-4 pb-3 sm:px-5")}>
      {text}
    </p>
  );
}
