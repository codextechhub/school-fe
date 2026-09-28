import { beforeEach, describe, expect, it, vi } from "vitest";
import { P } from "@/permissions";

const state = vi.hoisted(() => ({
  held: new Set<string>(),
  wholeSchool: true,
  choices: [] as { id: number; name: string }[],
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: (code: string) => state.held.has(code) }),
}));
vi.mock("./use-settings-branches", () => ({
  useSettingsBranches: () => ({
    applies: true,
    wholeSchool: state.wholeSchool,
    choices: state.choices,
    isLoading: false,
  }),
}));

import { readOnlySentence, useSettingsWrite } from "./use-settings-write";

const IKEJA = { id: 11, name: "Ikeja Branch" };
const LEKKI = { id: 12, name: "Lekki Branch" };

/**
 * Who may change a setting: the permission the endpoint checks, and a reach
 * that covers everything the setting binds.
 */
describe("useSettingsWrite", () => {
  beforeEach(() => {
    state.held = new Set([P.UPDATE_SETTINGS]);
    state.wholeSchool = true;
    state.choices = [IKEJA, LEKKI];
  });

  it("lets a whole-school administrator change the school's rules", () => {
    expect(useSettingsWrite(P.UPDATE_SETTINGS)).toEqual({ canSave: true, reason: null });
  });

  it("keeps a branch administrator holding the permission off the school's rules", () => {
    state.wholeSchool = false;
    state.choices = [IKEJA];
    expect(useSettingsWrite(P.UPDATE_SETTINGS)).toEqual({ canSave: false, reason: "reach" });
    expect(useSettingsWrite(P.UPDATE_SETTINGS, "")).toEqual({ canSave: false, reason: "reach" });
  });

  it("lets a branch administrator change their own branch's setting", () => {
    state.wholeSchool = false;
    state.choices = [IKEJA];
    expect(useSettingsWrite(P.UPDATE_SETTINGS, String(IKEJA.id))).toEqual({ canSave: true, reason: null });
  });

  it("keeps a branch administrator off another branch's setting", () => {
    state.wholeSchool = false;
    state.choices = [IKEJA];
    expect(useSettingsWrite(P.UPDATE_SETTINGS, LEKKI.id)).toEqual({ canSave: false, reason: "reach" });
  });

  it("names a missing permission before reach, whatever the reach", () => {
    state.held = new Set();
    expect(useSettingsWrite(P.UPDATE_SETTINGS)).toEqual({ canSave: false, reason: "permission" });
    state.wholeSchool = false;
    expect(useSettingsWrite(P.UPDATE_SETTINGS, IKEJA.id)).toEqual({ canSave: false, reason: "permission" });
  });
});

describe("readOnlySentence", () => {
  it("sends a missing permission to the school administrator", () => {
    expect(readOnlySentence("permission")).toBe(
      "You can read these rules. Changing them is the school administrator's to do.",
    );
  });

  it("tells a branch-bound reader the rule binds every branch", () => {
    expect(readOnlySentence("reach", { subject: "your school's profile", one: true })).toBe(
      "You can read your school's profile. It applies to every branch, so changing it is for an administrator who covers the whole school.",
    );
  });

  it("points a branch-bound reader at the picker where their own branch is offered", () => {
    expect(readOnlySentence("reach", { subject: "this rule", one: true, branchPicker: true })).toBe(
      "You can read this rule for the whole school. To change it for your branch, pick it above.",
    );
  });
});
