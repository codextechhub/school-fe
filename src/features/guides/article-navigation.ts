export function resetGuideArticleScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function scrollToGuideSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return false;

  const hash = `#${encodeURIComponent(sectionId)}`;
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}${hash}`,
  );
  section.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });

  return true;
}
