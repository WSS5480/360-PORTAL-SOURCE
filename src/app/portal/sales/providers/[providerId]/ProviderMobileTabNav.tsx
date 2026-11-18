"use client";

import React from "react";
import { providerMobilePrimaryTabs, type ProviderTabId } from "./providerProfileTypes";

export function ProviderMobileTabNav({
  activeTab,
  onSelect,
}: {
  activeTab: ProviderTabId;
  onSelect: (tab: ProviderTabId) => void;
}) {
  const primaryTabs = React.useMemo(() => providerMobilePrimaryTabs(), []);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = React.useState(false);
  const [fadeRight, setFadeRight] = React.useState(false);

  const updateFades = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setFadeLeft(el.scrollLeft > 6);
    setFadeRight(maxScroll > 6 && el.scrollLeft < maxScroll - 6);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFades);
      ro.disconnect();
    };
  }, [updateFades, primaryTabs.length]);

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const selected =
      root.querySelector<HTMLElement>('[aria-selected="true"]') ??
      root.querySelector<HTMLElement>(".provider-mobile-tab--active");
    selected?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeTab]);

  return (
    <nav className="provider-mobile-tabs-shell" aria-label="Provider sections">
      <div
        className={`provider-mobile-tabs-fade provider-mobile-tabs-fade--left${fadeLeft ? " provider-mobile-tabs-fade--visible" : ""}`}
        aria-hidden
      />
      <div
        className={`provider-mobile-tabs-fade provider-mobile-tabs-fade--right${fadeRight ? " provider-mobile-tabs-fade--visible" : ""}`}
        aria-hidden
      />

      <div className="provider-mobile-tabs-row">
        <div ref={scrollRef} className="provider-mobile-tabs-scroll" role="tablist">
          {primaryTabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`provider-mobile-tab${active ? " provider-mobile-tab--active" : ""}`}
                onClick={() => onSelect(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
