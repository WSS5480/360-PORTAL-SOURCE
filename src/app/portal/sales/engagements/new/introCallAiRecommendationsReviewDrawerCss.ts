export const introCallAiRecommendationsReviewDrawerCss = `
.ew-prep-ai-recs-review-overlay {
  position: fixed;
  inset: 0;
  z-index: 56;
  background: color-mix(in srgb, var(--foreground) 32%, transparent);
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.ew-prep-ai-recs-review-drawer {
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: min(480px, 100vw);
  max-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  box-shadow: -8px 0 28px color-mix(in srgb, var(--foreground) 10%, transparent);
  animation: ew-prep-ai-recs-review-slide-in 0.2s ease-out;
}

@keyframes ew-prep-ai-recs-review-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0.65;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.ew-prep-ai-recs-review-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  background: var(--surface);
}

.ew-prep-ai-recs-review-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
}

.ew-prep-ai-recs-review-sub {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.ew-prep-ai-recs-review-hint {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--muted);
}

.ew-prep-ai-recs-review-close {
  flex-shrink: 0;
  min-width: 40px;
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 16px;
  cursor: pointer;
  color: var(--text);
}

.ew-prep-ai-recs-review-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ew-prep-ai-recs-review-body {
  overflow: auto;
  padding: 10px 14px 12px;
  -webkit-overflow-scrolling: touch;
}

.ew-prep-ai-recs-sections {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-ai-recs-sections-notice {
  margin: 0;
  padding: 5px 8px;
  border-radius: 7px;
  font-size: 10px;
  line-height: 1.35;
  color: #64748b;
  background: #f8fafc;
  border: none;
}

.ew-prep-ai-recs-sections-notice--edits {
  border-color: color-mix(in srgb, #f59e0b 30%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, #fff);
  color: var(--foreground);
}

.ew-prep-ai-recs-sections-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-ai-recs-section-card {
  border: 1px solid color-mix(in srgb, #0f2744 7%, #e2e8f0);
  border-radius: 9px;
  background: #fff;
  padding: 7px 9px;
  border-left: 3px solid color-mix(in srgb, #0d9488 35%, transparent);
}

.ew-prep-ai-recs-section-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.ew-prep-ai-recs-section-card-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0f2744;
}

.ew-prep-ai-recs-section-card-action {
  flex-shrink: 0;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, #0f2744 10%, #e2e8f0);
  background: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  color: #475569;
  white-space: nowrap;
}

.ew-prep-ai-recs-section-card-action--primary {
  border-color: #0f766e;
  background: #0d9488;
  color: #fff;
}

.ew-prep-ai-recs-section-card-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ew-prep-ai-recs-section-card-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 6.5em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.ew-prep-ai-recs-review-foot {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 10px 14px max(12px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ew-prep-ai-recs-review-foot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ew-prep-ai-recs-review-action {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  color: var(--text);
}

.ew-prep-ai-recs-review-action--primary {
  border-color: #0f766e;
  background: #0d9488;
  color: #fff;
}

.ew-prep-ai-recs-review-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .ew-prep-ai-recs-review-overlay {
    align-items: flex-end;
    justify-content: stretch;
  }

  .ew-prep-ai-recs-review-drawer {
    width: 100%;
    max-height: min(94dvh, 100%);
    border-left: none;
    border-radius: 12px 12px 0 0;
    animation: ew-prep-ai-recs-review-slide-up 0.22s ease-out;
  }

  @keyframes ew-prep-ai-recs-review-slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}

@media (min-width: 769px) {
  .ew-prep-ai-recs-review-overlay--modal {
    justify-content: center;
    align-items: center;
    padding: 24px;
  }

  .ew-prep-ai-recs-review-overlay--modal .ew-prep-ai-recs-review-drawer {
    width: min(560px, 100%);
    max-height: min(88dvh, 720px);
    border-left: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 16px 48px color-mix(in srgb, var(--foreground) 18%, transparent);
    animation: ew-prep-ai-recs-review-fade-in 0.18s ease-out;
  }

  @keyframes ew-prep-ai-recs-review-fade-in {
    from {
      transform: translateY(8px);
      opacity: 0.7;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}
`;
