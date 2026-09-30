import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClockStyle } from "@/lib/dates";
import { Input } from "./input";
import { TimeInput } from "./time-input";
import { fitsRules, readTime, stepTime, timeText } from "./time-input.utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("readTime", () => {
  it.each([
    ["8", "08:00"],
    ["08", "08:00"],
    ["6", "06:00"],
    ["12", "12:00"],
    ["830", "08:30"],
    ["0830", "08:30"],
    ["8:5", "08:05"],
    ["8:", "08:00"],
    ["8.30", "08:30"],
    ["8 30", "08:30"],
    ["08:30:00", "08:30"],
    ["00:00", "00:00"],
    ["0", "00:00"],
    ["23:59", "23:59"],
    ["2359", "23:59"],
    ["14:15", "14:15"],
  ])("reads %s as %s on a 24-hour clock", (text, value) => {
    expect(readTime(text, "H24")?.value).toBe(value);
  });

  it.each([
    ["8:30 pm", "20:30"],
    ["830p", "20:30"],
    ["8:30PM", "20:30"],
    ["8:30 a.m.", "08:30"],
    ["12:00 am", "00:00"],
    ["12:00 pm", "12:00"],
    ["12am", "00:00"],
    ["12 pm", "12:00"],
    ["11:59 pm", "23:59"],
  ])("reads a typed am/pm, %s as %s, on either clock", (text, value) => {
    expect(readTime(text, "H12")?.value).toBe(value);
    expect(readTime(text, "H24")?.value).toBe(value);
  });

  it("takes the toggle's half of the day for a 12-hour hour with no am/pm", () => {
    expect(readTime("8:30", "H12", "am")).toEqual({ value: "08:30", meridiem: "am" });
    expect(readTime("8:30", "H12", "pm")).toEqual({ value: "20:30", meridiem: "pm" });
    expect(readTime("12", "H12", "am")?.value).toBe("00:00");
    expect(readTime("12", "H12", "pm")?.value).toBe("12:00");
  });

  it.each([
    ["6", "18:00", "pm"],
    ["6:30", "18:30", "pm"],
    ["7", "07:00", "am"],
    ["11", "11:00", "am"],
    ["11:59", "11:59", "am"],
    ["12", "12:00", "pm"],
    ["1", "13:00", "pm"],
    ["2", "14:00", "pm"],
  ])("guesses by school hours on a 12-hour school: %s is %s", (text, value, meridiem) => {
    expect(readTime(text, "H12")).toEqual({ value, meridiem });
  });

  it.each([
    ["12am", "00:00"],
    ["6:30a", "06:30"],
    ["7 pm", "19:00"],
    ["11:30p", "23:30"],
  ])("lets a typed am/pm beat the guess: %s is %s", (text, value) => {
    expect(readTime(text, "H12")?.value).toBe(value);
  });

  it("reads an hour that only a 24-hour clock has as 24-hour, on a 12-hour school", () => {
    expect(readTime("14:00", "H12", "am")).toEqual({ value: "14:00", meridiem: "pm" });
    expect(readTime("0:30", "H12", "pm")).toEqual({ value: "00:30", meridiem: "am" });
  });

  it.each([
    "",
    "   ",
    "abc",
    "24:00",
    "25",
    "8:60",
    "8:30:75",
    "12345",
    "13 pm",
    "0 am",
    "8:30 xm",
    "pm",
    "-1",
    "8::30",
  ])("refuses %j", (text) => {
    expect(readTime(text, "H24")).toBeNull();
    expect(readTime(text, "H12")).toBeNull();
  });
});

describe("timeText", () => {
  it("writes a stored time on the school's clock", () => {
    expect(timeText("08:05", "H24")).toBe("08:05");
    expect(timeText("08:05", "H12")).toBe("8:05");
    expect(timeText("00:00", "H12")).toBe("12:00");
    expect(timeText("12:00", "H12")).toBe("12:00");
    expect(timeText("23:59:00", "H24")).toBe("23:59");
    expect(timeText("", "H24")).toBe("");
    expect(timeText("nonsense", "H12")).toBe("");
  });
});

describe("fitsRules and stepTime", () => {
  it("holds a time to min, max and the step grid", () => {
    expect(fitsRules("08:00", { min: "08:00", max: "17:00" })).toBe(true);
    expect(fitsRules("07:59", { min: "08:00" })).toBe(false);
    expect(fitsRules("17:01", { max: "17:00" })).toBe(false);
    expect(fitsRules("08:05", { step: 5 })).toBe(true);
    expect(fitsRules("08:07", { step: 5 })).toBe(false);
  });

  it("moves to the next grid line, and never past the day or the bounds", () => {
    expect(stepTime("08:07", 1, 5)).toBe("08:10");
    expect(stepTime("08:07", -1, 5)).toBe("08:05");
    expect(stepTime("08:10", 1, 5)).toBe("08:15");
    expect(stepTime("23:58", 1, 5)).toBe("23:59");
    expect(stepTime("00:02", -1, 5)).toBe("00:00");
    expect(stepTime("16:50", 1, 60, { max: "17:00" })).toBe("17:00");
  });
});

// ── The box ──────────────────────────────────────────────────────────────────

const storeFor = (clock: ClockStyle) =>
  configureStore({
    reducer: { auth: () => ({ tenant: { display: { clock } } }) },
  });

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** A form holding the value, as a screen would, reporting every change. */
function Host({ initial, spy }: { initial: string; spy: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <TimeInput
      aria-label="Start time"
      value={value}
      onChange={(next) => {
        spy(next);
        setValue(next);
      }}
    />
  );
}

const render = (clock: ClockStyle, initial = "", spy = vi.fn()) => {
  act(() =>
    root.render(
      <Provider store={storeFor(clock)}>
        <Host initial={initial} spy={spy} />
      </Provider>,
    ),
  );
  return spy;
};

const field = () => container.querySelector<HTMLInputElement>('input[type="text"]')!;
const halves = () => [...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")];
const pressed = () => halves().find((b) => b.getAttribute("aria-pressed") === "true")?.textContent;

const typeInto = (text: string) =>
  act(() => {
    const input = field();
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

const leave = () =>
  act(() => {
    field().dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });

describe("TimeInput", () => {
  it("shows a stored time on a 24-hour school's clock, with no am/pm", () => {
    render("H24", "14:30");
    expect(field().value).toBe("14:30");
    expect(halves()).toHaveLength(0);
  });

  it("shows a stored time on a 12-hour school's clock, with the half of the day pressed", () => {
    render("H12", "14:30");
    expect(field().value).toBe("2:30");
    expect(pressed()).toBe("pm");
  });

  it("emits HH:MM as soon as the typing reads as a time, and tidies it on leaving", () => {
    const spy = render("H24");
    typeInto("830");
    expect(spy).toHaveBeenLastCalledWith("08:30");
    leave();
    expect(field().value).toBe("08:30");
  });

  it("reads a typed pm on a 12-hour school and moves it into the toggle", () => {
    const spy = render("H12");
    typeInto("830p");
    expect(spy).toHaveBeenLastCalledWith("20:30");
    leave();
    expect(field().value).toBe("8:30");
    expect(pressed()).toBe("pm");
  });

  it("guesses the half of a bare hour by school hours, and shows the guess on the toggle", () => {
    const spy = render("H12");
    typeInto("2");
    expect(spy).toHaveBeenLastCalledWith("14:00");
    expect(pressed()).toBe("pm");
    typeInto("7");
    expect(spy).toHaveBeenLastCalledWith("07:00");
    expect(pressed()).toBe("am");
  });

  it("never guesses over a half the person tapped", () => {
    const spy = render("H12");
    typeInto("6:30");
    expect(spy).toHaveBeenLastCalledWith("18:30");
    leave();
    act(() => halves().find((b) => b.textContent === "am")!.click());
    expect(spy).toHaveBeenLastCalledWith("06:30");
    typeInto("2");
    expect(spy).toHaveBeenLastCalledWith("02:00");
    expect(pressed()).toBe("am");
  });

  it("lets a typed am/pm beat the guess in the box", () => {
    const spy = render("H12");
    typeInto("6:30a");
    expect(spy).toHaveBeenLastCalledWith("06:30");
    leave();
    expect(field().value).toBe("6:30");
    expect(pressed()).toBe("am");
  });

  it("changes the stored value when the other half of the day is picked", () => {
    const spy = render("H12", "08:30");
    act(() => halves().find((b) => b.textContent === "pm")!.click());
    expect(spy).toHaveBeenLastCalledWith("20:30");
    expect(field().value).toBe("8:30");
  });

  it("emits nothing but an empty value for text that is not a time, and marks it once left", () => {
    const spy = render("H24", "08:00");
    typeInto("25");
    expect(spy).toHaveBeenLastCalledWith("");
    expect(field().getAttribute("aria-invalid")).toBeNull();
    leave();
    expect(field().value).toBe("25");
    expect(field().getAttribute("aria-invalid")).toBe("true");
    expect(spy.mock.calls.every(([value]) => value === "" || /^\d{2}:\d{2}$/.test(value))).toBe(true);
  });

  it("steps with the arrow keys and emits the new time", () => {
    const spy = render("H24", "08:07");
    act(() => {
      field().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(spy).toHaveBeenLastCalledWith("08:10");
    expect(field().value).toBe("08:10");
  });

  it("gives <Input type=\"time\"> the same box, with a change event carrying HH:MM", () => {
    const seen: string[] = [];
    act(() =>
      root.render(
        <Provider store={storeFor("H12")}>
          <Input type="time" value="" onChange={(e) => seen.push(e.target.value)} />
        </Provider>,
      ),
    );
    expect(halves()).toHaveLength(2);
    typeInto("7:45 pm");
    expect(seen).toEqual(["19:45"]);
  });
});
