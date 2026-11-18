/** Provider operations workspace — field execution shell (deep-linked from directory queue). */

export const providerOperationsWorkspaceCss = `
.provider-profile-root--operations .provider-profile-body {
  padding-top: 8px;
}

.provider-ops-workspace {
  display: grid;
  gap: 14px;
  max-width: 920px;
}

.provider-ops-workspace__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-ops-workspace__quick-link {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
  transition: background 100ms ease, border-color 100ms ease, color 100ms ease;
}

.provider-ops-workspace__quick-link:hover {
  background: color-mix(in srgb, #22d3ee 8%, #fff);
  border-color: color-mix(in srgb, #22d3ee 28%, var(--border));
  color: #0e7490;
}

.provider-ops-workspace__intel {
  display: grid;
  gap: 10px;
}

.provider-ops-workspace__intel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.provider-ops-workspace__intel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.provider-ops-workspace__intel-link {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}

.provider-ops-workspace__intel-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 768px) {
  .provider-ops-workspace {
    gap: 12px;
    max-width: 100%;
    min-width: 0;
  }

  .provider-ops-workspace__quick {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .provider-ops-workspace__quick-link {
    width: 100%;
    min-height: 44px;
    justify-content: center;
    padding: 0 10px;
    font-size: 11px;
    letter-spacing: 0.02em;
    text-transform: none;
    border-radius: 10px;
    box-sizing: border-box;
  }

  .provider-ops-workspace__intel-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .provider-ops-workspace__intel-link {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
  }
}

@media (max-width: 420px) {
  .provider-ops-workspace__quick {
    grid-template-columns: 1fr;
  }
}
`;
