export function canFocusWalkthroughCoach(card: HTMLElement): boolean {
  return ![...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
    .some((dialog) => dialog !== card);
}
