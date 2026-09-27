type InteractOutsideEvent = {
  target: EventTarget | null;
  preventDefault: () => void;
};

export function preventWalkthroughDismiss(event: InteractOutsideEvent): void {
  const target = event.target;
  if (target instanceof Element && target.closest("[data-walkthrough-active]")) {
    event.preventDefault();
  }
}
