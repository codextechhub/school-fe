import { P, type PermissionCode } from "@/permissions";
import type { DatasetType } from "@/redux/services/dashboard/import-types";

/**
 * Each dataset's own import key, where its module registers one.
 *
 * The import engine lets this key stand in for its generic validate and import
 * keys on a batch of that dataset (`HasImportBatchRBACPermission` on the
 * server), so a registrar may finish a student import without holding the
 * engine's keys. It does not stand in for the upload: POST `/import/batches/`
 * has no batch yet to read a dataset from, and asks for
 * `import.batches.create` alone.
 */
const DATASET_IMPORT_PERMISSION: Partial<Record<DatasetType, PermissionCode>> =
  {
    students: P.IMPORT_STUDENTS,
    guardians: P.IMPORT_STUDENTS,
    staff: P.IMPORT_STAFF,
    academic_structure: P.IMPORT_STRUCTURE,
    subjects: P.IMPORT_STRUCTURE,
  };

/**
 * Whether this reader can take a file of `dataset` through the whole wizard.
 *
 * Three server writes have to succeed: the upload, the check and the import.
 * The upload needs `import.batches.create`; the other two need either the
 * dataset's own import key or both of `import.batches.run` and
 * `import.batches.import`. A button that opens the wizard asks this, so it is
 * never offered to somebody who would be refused halfway through.
 */
export function canRunImport(
  dataset: DatasetType,
  hasPermission: (code: PermissionCode) => boolean,
): boolean {
  if (!hasPermission(P.UPLOAD_IMPORT_BATCH)) return false;
  const datasetKey = DATASET_IMPORT_PERMISSION[dataset];
  if (datasetKey && hasPermission(datasetKey)) return true;
  return (
    hasPermission(P.RUN_IMPORT_VALIDATION) &&
    hasPermission(P.EXECUTE_IMPORT_BATCH)
  );
}
