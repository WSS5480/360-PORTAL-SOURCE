"use client";

export function ProviderOverviewPathwayBlocker({
  blocker,
  nextMove,
  sectionLabel = "Discovery Targets",
}: {
  blocker: string | null;
  nextMove: string | null;
  sectionLabel?: string;
}) {
  if (!blocker && !nextMove) return null;

  const nextMoveLine = nextMove
    ? /^next move:/i.test(nextMove)
      ? nextMove
      : `Next move: ${nextMove}`
    : null;

  return (
    <section className="pov-pathway-blocker" aria-label={sectionLabel} data-testid="pov-blocker-band">
      <h2 className="pov-section-kicker">{sectionLabel}</h2>
      {blocker ? (
        <p className="pov-pathway-blocker__gap" data-testid="pov-primary-gap">
          {blocker}
        </p>
      ) : null}
      {nextMoveLine ? (
        <p className="pov-pathway-blocker__move" data-testid="pov-next-move">
          {nextMoveLine}
        </p>
      ) : null}
    </section>
  );
}
