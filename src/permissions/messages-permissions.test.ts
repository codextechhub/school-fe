import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

/**
 * The ten Messages keys, each naming the key the server seeds.
 *
 * A code with no mapping resolves to "" and its screen then gates on nothing a
 * role can hold, so the inbox, the New menu and the oversight screens would be
 * missing for every school entitled to them. These assertions keep the app and
 * the backend's seed in step.
 */
describe("message keys", () => {
  it("resolves every key to the name the server checks", () => {
    expect(resolvePermissionKey(P.VIEW_MESSAGES)).toBe("school.messages.view");
    expect(resolvePermissionKey(P.SEND_MESSAGES)).toBe("school.messages.send");
    expect(resolvePermissionKey(P.EXPORT_MESSAGES)).toBe("school.messages.export");
    expect(resolvePermissionKey(P.SEND_FAMILY_MESSAGES)).toBe("school.family_messages.send");
    expect(resolvePermissionKey(P.BE_SCHOOL_OFFICE)).toBe("school.family_messages.office");
    expect(resolvePermissionKey(P.CREATE_MESSAGE_GROUP)).toBe("school.message_groups.create");
    expect(resolvePermissionKey(P.SEND_BROADCAST)).toBe("school.message_broadcasts.send");
    expect(resolvePermissionKey(P.INSPECT_MESSAGE_GROUPS)).toBe("school.message_groups.inspect");
    expect(resolvePermissionKey(P.INSPECT_BROADCASTS)).toBe("school.message_broadcasts.inspect");
    expect(resolvePermissionKey(P.INSPECT_PUPIL_CONVERSATIONS)).toBe("school.message_welfare.inspect");
  });

  it("gives each key a code of its own", () => {
    const codes = [
      P.VIEW_MESSAGES,
      P.SEND_MESSAGES,
      P.EXPORT_MESSAGES,
      P.SEND_FAMILY_MESSAGES,
      P.BE_SCHOOL_OFFICE,
      P.CREATE_MESSAGE_GROUP,
      P.SEND_BROADCAST,
      P.INSPECT_MESSAGE_GROUPS,
      P.INSPECT_BROADCASTS,
      P.INSPECT_PUPIL_CONVERSATIONS,
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });
});
