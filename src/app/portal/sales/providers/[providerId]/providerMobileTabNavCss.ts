/**
 * Provider profile — mobile section navigation (scroll strip + More menu).
 */
export const providerMobileTabNavCss = `
.provider-mobile-tabs-shell {
  position: relative;
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  isolation: isolate;
}

.provider-mobile-tabs-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.provider-mobile-tabs-fade--visible {
  opacity: 1;
}

.provider-mobile-tabs-fade--left {
  left: 0;
  background: linear-gradient(
    90deg,
    #fff 0%,
    color-mix(in srgb, #fff 88%, transparent) 55%,
    transparent 100%
  );
}

.provider-mobile-tabs-fade--right {
  right: 72px;
  background: linear-gradient(
    270deg,
    #fff 0%,
    color-mix(in srgb, #fff 88%, transparent) 55%,
    transparent 100%
  );
}

.provider-mobile-tabs-row {
  display: flex;
  align-items: stretch;
  min-width: 0;
  max-width: 100%;
}

.provider-mobile-tabs-scroll {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 6px;
  min-width: 0;
  padding: 6px 4px 5px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 12px;
  scrollbar-width: none;
}

.provider-mobile-tabs-scroll::-webkit-scrollbar {
  display: none;
  height: 0;
}

.provider-mobile-tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}

.provider-mobile-tab::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: transparent;
  transition: background 0.15s ease;
}

.provider-mobile-tab--active {
  color: var(--brand-800, var(--brand-700, var(--brand-600)));
  font-weight: 900;
}

.provider-mobile-tab--active::after {
  background: var(--brand-600);
}

.provider-mobile-tab-more-wrap {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  padding: 6px 10px 5px 6px;
  border-left: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
  z-index: 3;
}

.provider-mobile-tab--more {
  gap: 4px;
  padding-right: 8px;
}

.provider-mobile-tab-more-chevron {
  font-size: 9px;
  font-weight: 900;
  opacity: 0.72;
  line-height: 1;
}

.provider-mobile-tab-more-backdrop {
  position: fixed;
  inset: 0;
  z-index: 199;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: default;
  -webkit-tap-highlight-color: transparent;
}

.provider-mobile-tab-more-menu {
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--foreground) 14%, transparent);
}

.provider-mobile-tab-more-menu--floating {
  z-index: 200;
  max-width: calc(100vw - 16px);
  box-sizing: border-box;
}

.provider-mobile-tab-more-item {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
}

.provider-mobile-tab-more-item:hover,
.provider-mobile-tab-more-item:focus-visible {
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
}

.provider-mobile-tab-more-item--active {
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.provider-profile-root--mobile:not(.provider-profile-root--command-center) .provider-mobile-tabs-shell {
  position: sticky;
  top: 0;
  z-index: 32;
}

.provider-profile-root--mobile.provider-profile-root--command-center .provider-mobile-tabs-shell {
  position: static;
  top: auto;
  z-index: auto;
}

@media (max-width: 420px) {
  .provider-mobile-tabs-fade--right {
    right: 64px;
  }

  .provider-mobile-tabs-scroll {
    gap: 4px;
    padding: 6px 2px 5px 10px;
    scroll-padding-inline: 10px;
  }

  .provider-mobile-tab-more-wrap {
    padding: 6px 8px 5px 4px;
  }

  .provider-mobile-tab {
    min-height: 44px;
    padding-inline: 10px;
    font-size: 11px;
  }
}
`;
