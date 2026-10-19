import { useState } from "react";
import { Link } from "react-router";

import { SettingsPanel, SettingsSectionHeader } from "@/components/settings/settings-layout";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolWords } from "@/hooks/use-school-words";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import { useGetProgramsQuery } from "@/redux/services/academics/academics-api";
import {
  useActivateScaleMutation,
  useActivateStructureMutation,
  useCopyScaleMutation,
  useCopyStructureMutation,
  useDeleteScaleMutation,
  useDeleteStructureMutation,
  useGetGradebookSettingsQuery,
  useGetScalesQuery,
  useGetStructuresQuery,
} from "@/redux/services/gradebook/gradebook-api";
import type { Scale, Structure } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { parseApiError } from "@/utils/api-error";

import { useSettingsBranches } from "../use-settings-branches";
import { useSettingsWrite } from "../use-settings-write";
import { bandRanges } from "./gradebook/checks";
import { FamiliesPanel } from "./gradebook/families-panel";
import { ReportCardPanel } from "./gradebook/report-card-panel";
import { ScaleDrawer, type ScaleDrawerMode } from "./gradebook/scale-drawer";
import { ProgrammeRecords, type Programme } from "./gradebook/setup-records";
import { done } from "./gradebook/setup-write";
import { StructureDrawer, type StructureDrawerMode } from "./gradebook/structure-drawer";
import { TemplatesPanel } from "./gradebook/templates-panel";
import { ReadOnlyNote, SectionLoadError, SectionLoading } from "./shared";

/**
 * The school's gradebook rules: what each programme's marks are made of, how
 * they are graded, what prints on a report card, which programmes are
 * moderated, who in a family hears of a released result, and the principal's
 * remark templates.
 *
 * Everything here binds every branch, so only a reader who covers the whole
 * school changes it, as the server insists; anyone else reads it. A rule a
 * published result rests on is locked, and is changed by copying it.
 *
 * Field Access governs the parts of the setup resource: the components, their
 * maximums, the bands, their remarks, the remark templates and who is told of a
 * released result. A hidden part leaves its panel or column; a read-only one
 * leaves its editing controls.
 */
export function GradebookSection() {
  const settingsQuery = useGetGradebookSettingsQuery();
  const settings = settingsQuery.data?.data;
  const { canSave, reason } = useSettingsWrite(P.MANAGE_ASSESSMENT_SETUP);

  if (settingsQuery.isLoading) return <SectionLoading label="Loading gradebook settings…" />;
  if (settingsQuery.isError || !settings) {
    return (
      <SectionLoadError
        forbidden={parseApiError(settingsQuery.error).status === 403}
        retry={settingsQuery.refetch}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Gradebook"
        description="Applies to every branch · set before the term starts and rarely changed"
      />
      <ReadOnlyNote reason={reason} />
      <StructuresPanel canSave={canSave} />
      <ScalesPanel canSave={canSave} />
      <ReportCardPanel settings={settings} canSave={canSave} />
      <FamiliesPanel settings={settings} canSave={canSave} />
      <TemplatesPanel canSave={canSave} />
      <SettingsPanel
        title="Who takes what"
        description="Which students take each subject that is not core, class by class. A student who does not take a subject is on no sheet, no average and no position for it."
      >
        <div className="px-4 py-4 sm:px-5">
          <Link
            to={routesPath.PROTECTED.GRADEBOOK.ELECTIVES}
            className="font-mont text-sm font-medium text-primary hover:underline"
          >
            Open the grid
          </Link>
        </div>
      </SettingsPanel>
    </div>
  );
}

/** The programmes a school runs, for the cards. Read from Academic structure. */
function useProgrammes(): Programme[] {
  const { data } = useGetProgramsQuery();
  return (data?.data ?? []).filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }));
}

function StructuresPanel({ canSave }: { canSave: boolean }) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SETUP);
  const { term } = useSchoolWords();
  const { data, isLoading } = useGetStructuresQuery();
  const programmes = useProgrammes();
  const branches = useSettingsBranches();
  const [drawer, setDrawer] = useState<StructureDrawerMode | null>(null);
  const [copy] = useCopyStructureMutation();
  const [activate] = useActivateStructureMutation();
  const [remove] = useDeleteStructureMutation();
  if (access.isHidden("components")) return null;
  const editable = canSave && !access.isReadOnly("components") && !access.isReadOnly("max_score");
  const showMax = !access.isHidden("max_score");

  return (
    <SettingsPanel
      title="Assessment structures"
      description="The parts each programme's marks are made of, such as two continuous assessments and an examination. They must total 100, with at most one examination."
    >
      {isLoading ? (
        <p className="px-4 py-4 font-mont text-xs text-gray-05 sm:px-5">Loading structures…</p>
      ) : (
        <ProgrammeRecords<Structure>
          noun="structure"
          consequence={`A class that already has marks this ${term} keeps the structure it started with.`}
          programmes={programmes}
          records={data?.data ?? []}
          canSave={editable}
          emptyHint="Nothing in use. Score sheets for this programme cannot open until a structure is put in use."
          check={(s) => (showMax ? s.total_check : undefined)}
          renderBody={(s) => <ComponentsTable structure={s} showMax={showMax} />}
          onEdit={(structure) => setDrawer({ kind: "edit", structure })}
          onCreate={(programme) => setDrawer({ kind: "create", programme })}
          onCopy={async (s) => {
            try {
              const copied = await copy(s.id).unwrap();
              setDrawer({ kind: "edit", structure: copied.data });
              return true;
            } catch {
              return false;
            }
          }}
          onActivate={(s) => done(activate(s.id).unwrap(), `${s.name} in use`, `It is ${s.program_name}'s structure now.`)}
          onDelete={(s) => done(remove(s.id).unwrap(), "Draft deleted")}
        />
      )}
      {drawer && <StructureDrawer mode={drawer} branches={branches} onClose={() => setDrawer(null)} />}
    </SettingsPanel>
  );
}

function ComponentsTable({ structure, showMax }: { structure: Structure; showMax: boolean }) {
  return (
    <div className="overflow-hidden rounded-md border border-white-02">
      <table className="w-full font-mont text-sm">
        <thead className="bg-white-05 text-left text-xs text-gray-05">
          <tr>
            <th className="px-3 py-2 font-medium">Component</th>
            {showMax && <th className="px-3 py-2 text-right font-medium">Maximum</th>}
            <th className="px-3 py-2 font-medium">Kind</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white-02">
          {(structure.components ?? []).map((component) => (
            <tr key={component.id}>
              <td className="px-3 py-2 text-gray-01">{component.name}</td>
              {showMax && <td className="px-3 py-2 text-right text-gray-01">{component.max_score}</td>}
              <td className="px-3 py-2 text-xs text-gray-05">
                {component.is_exam ? "The examination" : "Continuous assessment"}
              </td>
            </tr>
          ))}
        </tbody>
        {showMax && structure.total !== undefined && (
          <tfoot className="border-t border-white-02 text-xs">
            <tr>
              <td className="px-3 py-2 text-gray-05">Total</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-01">{structure.total} of 100</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function ScalesPanel({ canSave }: { canSave: boolean }) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SETUP);
  const { data, isLoading } = useGetScalesQuery();
  const programmes = useProgrammes();
  const branches = useSettingsBranches();
  const [drawer, setDrawer] = useState<ScaleDrawerMode | null>(null);
  const [copy] = useCopyScaleMutation();
  const [activate] = useActivateScaleMutation();
  const [remove] = useDeleteScaleMutation();
  if (access.isHidden("bands")) return null;
  const editable = canSave && !access.isReadOnly("bands") && !access.isReadOnly("remark");
  const showRemark = !access.isHidden("remark");

  return (
    <SettingsPanel
      title="Grading scales"
      description="The grade and remark each band of percentage earns. Every mark from 0 to 100 must fall in exactly one band."
    >
      {isLoading ? (
        <p className="px-4 py-4 font-mont text-xs text-gray-05 sm:px-5">Loading scales…</p>
      ) : (
        <ProgrammeRecords<Scale>
          noun="scale"
          consequence="Every result not yet published is graded by it from now on; published results keep the grades they were given."
          programmes={programmes}
          records={data?.data ?? []}
          canSave={editable}
          emptyHint="Nothing in use. Score sheets for this programme cannot open until a scale is put in use."
          check={(s) => s.check}
          renderBody={(s) => <BandTiles scale={s} showRemark={showRemark} />}
          onEdit={(scale) => setDrawer({ kind: "edit", scale })}
          onCreate={(programme) => setDrawer({ kind: "create", programme })}
          onCopy={async (s) => {
            try {
              const copied = await copy(s.id).unwrap();
              setDrawer({ kind: "edit", scale: copied.data });
              return true;
            } catch {
              return false;
            }
          }}
          onActivate={(s) => done(activate(s.id).unwrap(), `${s.name} in use`, `It is ${s.program_name}'s scale now.`)}
          onDelete={(s) => done(remove(s.id).unwrap(), "Draft deleted")}
        />
      )}
      {drawer && <ScaleDrawer mode={drawer} branches={branches} onClose={() => setDrawer(null)} />}
    </SettingsPanel>
  );
}

function BandTiles({ scale, showRemark }: { scale: Scale; showRemark: boolean }) {
  const bands = scale.bands ?? [];
  const ranges = bandRanges(bands.map((b) => b.min_score));
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {bands.map((band, index) => (
        <li key={band.id} className="min-w-0 rounded-md border border-white-02 px-3 py-2">
          <p className={`font-mont text-base font-semibold ${band.is_fail ? "text-error-text" : "text-gray-01"}`}>
            {band.grade}
          </p>
          <p className="font-mont text-xs text-gray-06">{ranges[index]}</p>
          {showRemark && band.remark && <p className="truncate font-mont text-xs text-gray-05">{band.remark}</p>}
        </li>
      ))}
    </ul>
  );
}
