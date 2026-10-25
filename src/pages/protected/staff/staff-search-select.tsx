import { useMemo, useState } from "react";

import { SearchSelect } from "@/components/custom/search-select";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";

/**
 * Pick one person who still works at the school, by typing part of their name.
 *
 * **The directory is searched, not a page of it.** The directory sends 25
 * people a page, so a picker fed the first page offers Mrs. Adeyemi at a school
 * of 20 and leaves her out at a school of 30, with nothing on screen to say she
 * is missing. What is typed goes to the directory's own search, which matches
 * the fields the reader may read there (name, staff number, email), and the
 * list shows what comes back.
 *
 * People who have left are dropped. Handing a resigned teacher a class or a
 * subject is a mistake, because neither carries an end date of its own.
 * Somebody on leave stays: they still hold the post. A reader who may not read
 * Employment status is not told who has left, so they see everybody and the
 * server refuses a leaver.
 *
 * `value` is the staff record id as a string, empty for nobody.
 */
export function StaffSearchSelect({
  id,
  label,
  value,
  onChange,
  currentName,
  isRequired,
  clearable = true,
  placeholder = "Search staff by name",
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (staffId: string) => void;
  /** The name for `value` before it has turned up in any search. */
  currentName?: string;
  isRequired?: boolean;
  clearable?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const search = useDebounce(query.trim(), 300);
  const { data, isFetching } = useGetStaffListQuery({
    search: search || undefined,
    page_size: 50,
  });

  const options = useMemo(
    () =>
      (data?.data ?? [])
        .filter((person) => person.on_roll !== false)
        .map((person) => ({
          value: String(person.id),
          label: person.job_title
            ? `${person.full_name} - ${person.job_title}`
            : person.full_name,
        })),
    [data],
  );

  return (
    <SearchSelect
      id={id}
      label={label}
      isRequired={isRequired}
      clearable={clearable}
      options={options}
      value={value}
      selectedLabel={currentName}
      searching={isFetching}
      onSearchChange={setQuery}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}
