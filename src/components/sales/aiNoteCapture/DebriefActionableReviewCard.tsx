"use client";

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type {
  DebriefActionableReviewCard,
  DebriefReviewCardAction,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import {
  isClinicalFocusReviewCard,
  isContactCandidateReviewCard,
  isFollowUpTaskReviewCard,
  isObservationAccessReviewCard,
  isOrganizationIntelligenceReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import { ClinicalFocusReviewCardView } from "./typedReviewCards/ClinicalFocusReviewCard";
import { ContactCandidateReviewCardView } from "./typedReviewCards/ContactCandidateReviewCard";
import { FollowUpTaskReviewCardView } from "./typedReviewCards/FollowUpTaskReviewCard";
import { ObservationAccessReviewCardView } from "./typedReviewCards/ObservationAccessReviewCard";
import { OrganizationIntelligenceReviewCardView } from "./typedReviewCards/OrganizationIntelligenceReviewCard";

export function DebriefActionableReviewCardView({
  card,
  disposition,
  readOnly,
  contact,
  organizationId,
  proposedContacts,
  onAction,
  onContactsChange,
}: {
  card: DebriefActionableReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  contact: DebriefProposedContactItem | null;
  organizationId: string | null;
  proposedContacts: DebriefProposedContactItem[];
  onAction: (action: DebriefReviewCardAction) => void;
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
}) {
  if (isContactCandidateReviewCard(card)) {
    return (
      <ContactCandidateReviewCardView
        card={card}
        disposition={disposition}
        readOnly={readOnly}
        contact={contact}
        organizationId={organizationId}
        proposedContacts={proposedContacts}
        onAction={onAction}
        onContactsChange={onContactsChange}
      />
    );
  }

  if (isObservationAccessReviewCard(card)) {
    return (
      <ObservationAccessReviewCardView
        card={card}
        disposition={disposition}
        readOnly={readOnly}
        onAction={onAction}
      />
    );
  }

  if (isClinicalFocusReviewCard(card)) {
    return (
      <ClinicalFocusReviewCardView
        card={card}
        disposition={disposition}
        readOnly={readOnly}
        onAction={onAction}
      />
    );
  }

  if (isFollowUpTaskReviewCard(card)) {
    return (
      <FollowUpTaskReviewCardView
        card={card}
        disposition={disposition}
        readOnly={readOnly}
        onAction={onAction}
      />
    );
  }

  if (isOrganizationIntelligenceReviewCard(card)) {
    return (
      <OrganizationIntelligenceReviewCardView
        card={card}
        disposition={disposition}
        readOnly={readOnly}
        onAction={onAction}
      />
    );
  }

  return null;
}
