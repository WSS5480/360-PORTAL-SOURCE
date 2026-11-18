/** Find a mission card button by its visible title. */
export function missionCardByName(name: string): HTMLElement {
  const nameEl = Array.from(document.querySelectorAll(".create-engagement-mission-card__name")).find(
    (el) => el.textContent?.trim() === name,
  );
  expect(nameEl).toBeDefined();
  const card = nameEl!.closest(".create-engagement-mission-card");
  expect(card).not.toBeNull();
  return card as HTMLElement;
}
