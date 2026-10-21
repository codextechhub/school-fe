import { describe, expect, it } from "vitest";

import {
  childLine,
  displayNameFor,
  mergeThread,
  openedId,
  participantNames,
} from "./messages-copy";

describe("childLine", () => {
  it("names the pupil and the class", () => {
    expect(childLine({ id: 1, name: "Tunde Bello", class_name: "JSS1 A" })).toBe(
      "About Tunde Bello, JSS1 A",
    );
  });

  it("drops the class when there is none and the line when the pupil is unnamed", () => {
    expect(childLine({ id: 1, name: "Tunde Bello" })).toBe("About Tunde Bello");
    expect(childLine({ id: 1 })).toBe("");
    expect(childLine(null)).toBe("");
  });
});

describe("displayNameFor", () => {
  const all = () => true;
  const none = () => false;

  it("uses the name where the viewer may read it", () => {
    expect(displayNameFor("GROUP", "JSS1 form teachers", all)).toBe("JSS1 form teachers");
  });

  it("falls back to a plain label for each kind when the name is closed", () => {
    expect(displayNameFor("GROUP", "JSS1 form teachers", none)).toBe("Group");
    expect(displayNameFor("BROADCAST", "Staff meeting", none)).toBe("Broadcast");
    expect(displayNameFor("FAMILY", "Mrs Funke Bello", none)).toBe("Parent");
    expect(displayNameFor("STAFF_DIRECT", undefined, all)).toBe("Colleague");
  });

  it("asks the group's name switch for a group and the people switch for a person", () => {
    const asked: string[] = [];
    displayNameFor("GROUP", "G", (field) => (asked.push(field), true));
    displayNameFor("PUPIL", "P", (field) => (asked.push(field), true));
    expect(asked).toEqual(["title", "participants"]);
  });
});

describe("mergeThread", () => {
  it("returns one message per id, oldest first", () => {
    const merged = mergeThread(
      [{ id: 5 }, { id: 3 }],
      [{ id: 5, body: "newer copy" }, { id: 9 }, { id: 4 }],
    );
    expect(merged.map((m) => m.id)).toEqual([3, 4, 5, 9]);
    expect(merged.find((m) => m.id === 5)?.body).toBe("newer copy");
  });
});

describe("participantNames", () => {
  it("reads names whether the server sends strings or objects", () => {
    expect(participantNames(["Ada", { name: "Kemi" }, {}])).toEqual(["Ada", "Kemi"]);
    expect(participantNames(undefined)).toEqual([]);
  });
});

describe("openedId", () => {
  it("finds the id however the answer nests the conversation", () => {
    expect(openedId({ id: 41 })).toBe(41);
    expect(openedId({ conversation: { id: 8 } })).toBe(8);
    expect(openedId(undefined)).toBeNull();
  });
});
