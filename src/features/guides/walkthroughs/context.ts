import { createContext, useContext } from "react";

import { requestWalkthroughStart } from "./engine";

export type WalkthroughRuntimeValue = {
  start: (walkthroughId: string) => void;
  active: boolean;
};

export const WalkthroughRuntimeContext = createContext<WalkthroughRuntimeValue>({
  start: requestWalkthroughStart,
  active: false,
});

export function useWalkthrough() {
  return useContext(WalkthroughRuntimeContext);
}

export function modalDuringWalkthrough(active: boolean): boolean {
  return !active;
}
