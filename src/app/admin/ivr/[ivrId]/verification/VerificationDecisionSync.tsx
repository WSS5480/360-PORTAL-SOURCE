"use client";

import { useEffect } from "react";

/**
 * When the Decision (ivr_status) dropdown changes, autopopulate the Primary Insurance Results (p_results) field.
 */
export default function VerificationDecisionSync() {
  useEffect(() => {
    const form = document.querySelector('form[action*="/verification/submit"]');
    if (!form) return;

    const statusSelect = form.querySelector('[name="ivr_status"]') as HTMLSelectElement | null;
    const pResultsInput = form.querySelector('[name="p_results"]') as HTMLInputElement | null;
    if (!statusSelect || !pResultsInput) return;

    function sync() {
      if (!statusSelect || !pResultsInput) return;
      const val = statusSelect.value;
      if (val === "COMPLETED") {
        pResultsInput.value = "Covered";
      } else if (val === "DENIED") {
        pResultsInput.value = "Not Covered";
      }
    }

    sync(); // run on mount to set initial
    statusSelect.addEventListener("change", sync);
    return () => statusSelect.removeEventListener("change", sync);
  }, []);

  return null;
}
