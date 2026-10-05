import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A failed action shows its message once.
 *
 * The response interceptor in `base-api.ts` toasts every failed write that is
 * not marked `silent`, so a screen that also toasts from its own `catch` puts
 * the same red message on screen twice. These tests drive real screens through
 * the real interceptor with a stubbed server and count the toasts.
 *
 * Bright Star School's admin, Mrs Adeyemi, is the reader throughout. Where the
 * screen owns a refusal (an inline duplicate name, a field she may not write,
 * a year that already has structure), the interceptor stays quiet and the
 * screen's own message is the one she sees.
 */

const toastSpies = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  message: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastSpies }));
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

/** Radix overlays reduced to plain markup: what they hold is under test, not how they open. */
const { box, shown } = vi.hoisted(() => ({
  box: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  shown: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: shown,
  SheetTrigger: box,
  SheetClose: box,
  SheetContent: box,
  SheetHeader: box,
  SheetFooter: box,
  SheetTitle: box,
  SheetDescription: box,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: shown,
  DialogClose: box,
  DialogContent: box,
  DialogDescription: box,
  DialogFooter: box,
  DialogHeader: box,
  DialogOverlay: box,
  DialogPortal: box,
  DialogTitle: box,
  DialogTrigger: box,
}));
vi.mock("@/components/custom/search-select", () => ({
  SearchSelect: ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[];
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
  }) => (
    <select
      aria-label="search-select"
      value={value ?? ""}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    >
      <option value="" />
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
    fieldAccess: {},
  }),
}));
vi.mock("@/components/custom/permission-gate", () => ({
  default: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks/use-action-param", () => ({ useActionParam: () => undefined }));
vi.mock("@/hooks/use-academics-lens", () => ({
  useAcademicsLens: () => ({
    lens: { branch: "all" },
    branch: null,
    multiBranch: false,
    readOnlyYear: false,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({
  useBranchLens: () => ({
    applies: false,
    pinnedBranch: null,
    branch: "all",
    branches: [],
    label: "",
  }),
}));
vi.mock("@/hooks/use-school-words", () => ({
  useSchoolWords: () => ({ defaultArms: ["A", "B"] }),
}));

// The rooms page's own children: its toggle is what is under test.
vi.mock("@/pages/protected/calendar/rooms/room-directory", () => ({
  RoomDirectory: ({
    rooms,
    onToggle,
  }: {
    rooms: { id: number; name: string }[];
    onToggle: (room: { id: number; name: string }) => void;
  }) => (
    <div>
      {rooms.map((room) => (
        <button key={room.id} type="button" onClick={() => onToggle(room)}>
          Toggle {room.name}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("@/pages/protected/calendar/rooms/room-filters", () => ({ RoomFilters: () => null }));
vi.mock("@/pages/protected/calendar/components/room-drawer", () => ({ RoomDrawer: () => null }));
vi.mock("@/pages/protected/students/drawers/confirm-dialog", () => ({
  ConfirmDialog: ({ onConfirm, confirmLabel }: { onConfirm: () => void; confirmLabel: string }) => (
    <button type="button" onClick={onConfirm}>
      {confirmLabel}
    </button>
  ),
}));

import { baseApi } from "@/redux/services/base-api";
import { authSliceReducer } from "@/redux/features/auth/auth-slice";
import { academicsApi } from "@/redux/services/academics/academics-api";
import { calendarApi } from "@/redux/services/calendar/calendar-api";
import { BulkLevelsDrawer } from "./academics/programs/bulk-levels-drawer";
import { RollForwardDialog } from "./academics/session/roll-forward-dialog";
import { EntityDrawer } from "./academics/components/entity-drawer";
import { GenerateArmsDrawer } from "./classes/generate-arms-drawer";
import Rooms from "./calendar/rooms";
import { QualificationRemove } from "./staff/profile/qualification-editor";
import { ExportButton } from "@/components/custom/export-button";
import { useUpdateDepartmentMutation } from "@/redux/services/academics/academics-api";
import type {
  AcademicSession,
  Level,
  Program,
} from "@/redux/services/academics/academics-types";
import type { StaffQualification } from "@/redux/services/staff/staff-types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Reply = { status: number; body: unknown };
type Route = { method: string; path: RegExp; reply: Reply };

let routes: Route[] = [];
const respond = (method: string, path: RegExp, status: number, body: unknown) => {
  routes.push({ method, path, reply: { status, body } });
};

const fetchMock = vi.fn(async (input: Request) => {
  const { pathname } = new URL(input.url);
  const hit = routes.find((r) => r.method === input.method && r.path.test(pathname));
  const { status, body } = hit?.reply ?? {
    status: 200,
    body: { success: true, message: "", data: [] },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
});

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authSliceReducer },
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  });

let container: HTMLDivElement;
let root: Root;
let store: ReturnType<typeof makeStore>;

beforeEach(() => {
  routes = [];
  for (const spy of Object.values(toastSpies)) spy.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  store = makeStore();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

/** Lets the request, the interceptor and the screen's catch all finish. */
const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const render = async (ui: ReactNode) => {
  await act(async () => {
    root.render(
      <Provider store={store}>
        <MemoryRouter>{ui}</MemoryRouter>
      </Provider>,
    );
  });
  await settle();
};

const button = (label: string) => {
  const found = [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.trim().startsWith(label),
  );
  if (!found) throw new Error(`No button labelled "${label}"`);
  return found;
};

const click = async (label: string) => {
  await act(async () => button(label).click());
  await settle();
};

const type = async (field: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const choose = async (select: HTMLSelectElement, value: string) => {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const refusal = (status: number, code: string, message: string, detail: object = {}) => ({
  status,
  body: { success: false, message, error: { code, detail } },
});

const errorToasts = () => toastSpies.error.mock.calls.map((call) => call[0]);

const SCIENCES: Program = {
  id: 7,
  name: "Sciences",
  branch: null,
  levels: [],
} as unknown as Program;

describe("a failed action shows one red message", () => {
  it("academics: a refused bulk level create toasts the server's sentence once", async () => {
    const { status, body } = refusal(
      422,
      "DUPLICATE_IN_BATCH",
      "Some of these levels already exist in this programme.",
      { names: ["JSS1"] },
    );
    respond("POST", /\/academics\/programs\/7\/levels\/bulk\/$/, status, body);

    await render(<BulkLevelsDrawer open program={SCIENCES} onClose={vi.fn()} />);
    await type(container.querySelector("textarea")!, "JSS1\nJSS2");
    await click("Add 2 levels");

    // The sentence, not "JSS1": the first string in `detail` is a name, not an explanation.
    expect(errorToasts()).toEqual(["Some of these levels already exist in this programme."]);
  });

  it("classes: a refused arm generation toasts once", async () => {
    const { status, body } = refusal(403, "PERMISSION_DENIED", "You do not have permission to do that.");
    respond("POST", /\/academics\/classes\/generate-arms\/$/, status, body);
    const jss1 = { id: 1, name: "JSS1", program_name: "Junior Secondary", branch: null } as unknown as Level;

    // Opened after mounting, as the classes screen does: opening is what fills the level and arms.
    await render(<GenerateArmsDrawer open={false} levels={[jss1]} classes={[]} onClose={vi.fn()} />);
    await render(<GenerateArmsDrawer open levels={[jss1]} classes={[]} onClose={vi.fn()} />);
    await click("Create 2 classes");

    expect(errorToasts()).toEqual(["You do not have permission to do that."]);
  });

  it("calendar: a refused room deactivation toasts once", async () => {
    respond("GET", /\/academics\/timetable\/rooms\/$/, 200, {
      success: true,
      message: "",
      data: [{ id: 4, name: "Science Laboratory", is_active: true }],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
    });
    const { status, body } = refusal(
      409,
      "ROOM_IN_USE",
      "Science Laboratory still holds 18 lessons this term.",
    );
    respond("PATCH", /\/academics\/timetable\/rooms\/4\/$/, status, body);

    await render(<Rooms />);
    await click("Toggle Science Laboratory");

    expect(errorToasts()).toEqual(["Science Laboratory still holds 18 lessons this term."]);
  });

  it("staff: a failed qualification removal toasts once", async () => {
    respond("DELETE", /\/i\/me\/staff\/qualifications\/12\/$/, 500, {
      success: false,
      message: "An unexpected error occurred.",
      error: { code: "SERVER_ERROR" },
    });
    const row = { id: 12, qualification: "B.Ed Mathematics" } as unknown as StaffQualification;

    await render(<QualificationRemove row={row} onClose={vi.fn()} />);
    await click("Remove qualification");

    expect(errorToasts()).toEqual(["A server error occurred. Please try again later."]);
  });

  it("settings: the academic and calendar rules saves leave their failure to the section", async () => {
    // Silent like every other settings save, so the section's own toast is the only one.
    respond("PUT", /\/academics\/rules\/$/, 500, { success: false, message: "", error: { code: "SERVER_ERROR" } });
    respond("PUT", /\/academics\/calendar\/rules\/$/, 500, { success: false, message: "", error: { code: "SERVER_ERROR" } });

    await act(async () => {
      await store
        .dispatch(academicsApi.endpoints.updateAcademicRules.initiate({ term_word: "Term" } as never))
        .catch(() => undefined);
      await store
        .dispatch(calendarApi.endpoints.updateCalendarRules.initiate({ week_starts_on: 1 } as never))
        .catch(() => undefined);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorToasts()).toEqual([]);
  });

  it("export: a failed run is said once, by the button", async () => {
    respond("GET", /\/exports\/from-screen\/$/, 200, {
      success: true,
      message: "",
      data: { config: { entity_key: "academics.subjects" }, unmapped: [] },
    });
    respond("POST", /\/exports\/quick\/$/, 500, {
      success: false,
      message: "That export could not be produced.",
      error: { code: "EXPORT_FAILED" },
    });

    await render(<ExportButton screen="academics.subjects" params={{}} />);
    await click("Export");

    expect(errorToasts()).toEqual(["That export could not be produced."]);
  });
});

describe("a refusal the screen owns still shows its own message", () => {
  it("export: a refused preparation is a read the interceptor leaves to the button", async () => {
    const { status, body } = refusal(403, "PERMISSION_DENIED", "You cannot export subjects.");
    respond("GET", /\/exports\/from-screen\/$/, status, body);

    await render(<ExportButton screen="academics.subjects" params={{}} />);
    await click("Export");

    expect(errorToasts()).toEqual(["You cannot export subjects."]);
  });

  const nextYear = { id: 9, name: "2027/2028" } as unknown as AcademicSession;
  const pickSourceAndCopy = async () => {
    respond("GET", /\/academics\/sessions\/$/, 200, {
      success: true,
      message: "",
      data: [
        { id: 8, name: "2026/2027", status: "ACTIVE" },
        { id: 9, name: "2027/2028", status: "PLANNED" },
      ],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 2 },
    });
    await render(<RollForwardDialog open target={nextYear} onClose={vi.fn()} />);
    await choose(container.querySelector("select")!, "8");
    await click("Copy structure");
  };

  it("academics: a year that already has structure is said by the dialog, once", async () => {
    const { status, body } = refusal(
      409,
      "TARGET_YEAR_NOT_EMPTY",
      "2027/2028 already has 6 levels and 12 classes. Copy into an empty year.",
    );
    respond("POST", /\/academics\/sessions\/9\/roll-forward\/$/, status, body);

    await pickSourceAndCopy();

    expect(errorToasts()).toEqual([
      "2027/2028 already has 6 levels and 12 classes. Copy into an empty year.",
    ]);
  });

  it("academics: any other roll-forward failure is left to the interceptor", async () => {
    const { status, body } = refusal(409, "NOTHING_TO_COPY", "2026/2027 has nothing to copy.");
    respond("POST", /\/academics\/sessions\/9\/roll-forward\/$/, status, body);

    await pickSourceAndCopy();

    expect(errorToasts()).toEqual(["2026/2027 has nothing to copy."]);
  });

  /** A department drawer saving through the real mutation, as the screen does. */
  function DepartmentDrawer() {
    const [update] = useUpdateDepartmentMutation();
    return (
      <EntityDrawer
        open
        editing
        saving={false}
        copy={{
          title: "Edit Sciences",
          subtitle: "",
          nameLabel: "Department name",
          namePlaceholder: "",
          codePlaceholder: "",
          scopeHint: "",
        }}
        initial={{ name: "Sciences", code: "SCI", description: "", branch: null }}
        onClose={vi.fn()}
        onSave={(write) => update({ id: 3, ...write }).unwrap()}
      />
    );
  }

  const renameAndSave = async () => {
    await render(<DepartmentDrawer />);
    await type(container.querySelector("input")!, "Arts");
    await click("Save changes");
  };

  it("academics: a duplicate name lands under the name field, with no toast", async () => {
    const { status, body } = refusal(
      409,
      "DUPLICATE_NAME",
      "Arts already exists. Names are unique across the whole school, so pick a different one.",
      { field: "name" },
    );
    respond("PATCH", /\/academics\/departments\/3\/$/, status, body);

    await renameAndSave();

    expect(errorToasts()).toEqual([]);
    expect(container.textContent).toContain(
      "Arts already exists. Names are unique across the whole school, so pick a different one.",
    );
  });

  it("academics: a field she may not write is said on the form, with no toast", async () => {
    const { status, body } = refusal(
      403,
      "field_write_denied",
      "You may not change the department name.",
      { name: ["You may not change this field."] },
    );
    respond("PATCH", /\/academics\/departments\/3\/$/, status, body);

    await renameAndSave();

    expect(errorToasts()).toEqual([]);
    expect(container.textContent).toContain("You may not change the department name.");
  });
});
