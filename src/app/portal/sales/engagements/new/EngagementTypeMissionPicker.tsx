"use client";



import React from "react";

import {

  ENGAGEMENT_MISSION_BROWSE_CATEGORIES,

  engagementMissionCardForType,

  type EngagementMissionBrowseCategoryId,

  type EngagementMissionCard,

} from "@/lib/surgical-sales/engagements/engagementTypeMissionPicker";

import type { RecommendedEngagementMission } from "@/lib/surgical-sales/engagements/buildRecommendedEngagementMission";

import type { EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";



export function EngagementTypeMissionPicker({

  selectedType,

  recommendedMission,

  showRecommendedMission = true,

  onSelect,

}: {

  selectedType: EngagementType | "";

  recommendedMission: RecommendedEngagementMission;

  /** Hidden when the launching workflow already chose the mission type. */

  showRecommendedMission?: boolean;

  onSelect: (type: EngagementType) => void;

}) {

  const initialCategory =

    (selectedType ? engagementMissionCardForType(selectedType)?.browseCategory : null) ??

    engagementMissionCardForType(recommendedMission.type)?.browseCategory ??

    "discover";

  const [activeCategory, setActiveCategory] =

    React.useState<EngagementMissionBrowseCategoryId>(initialCategory);



  React.useEffect(() => {

    const selectedCategory = selectedType

      ? engagementMissionCardForType(selectedType)?.browseCategory

      : null;

    if (selectedCategory) {

      setActiveCategory(selectedCategory);

    }

  }, [selectedType]);



  const activeGroup = ENGAGEMENT_MISSION_BROWSE_CATEGORIES.find((group) => group.id === activeCategory);



  return (

    <div className="create-engagement-mission-picker">

      {showRecommendedMission ? (

      <section className="create-engagement-recommended-mission" aria-labelledby="recommended-mission-title">

        <h2 id="recommended-mission-title" className="create-engagement-recommended-mission__title">

          Recommended Next Mission

        </h2>

        <button

          type="button"

          className={`create-engagement-recommended-mission__card${

            selectedType === recommendedMission.type

              ? " create-engagement-recommended-mission__card--selected"

              : ""

          }`}

          aria-pressed={selectedType === recommendedMission.type}

          aria-label={`Select recommended mission: ${recommendedMission.name}`}

          onClick={() => onSelect(recommendedMission.type)}

        >

          <span className="create-engagement-recommended-mission__main">

            <span className="create-engagement-recommended-mission__name">{recommendedMission.name}</span>

            <span className="create-engagement-recommended-mission__reason">{recommendedMission.reason}</span>

          </span>

          {selectedType === recommendedMission.type ? (

            <span className="create-engagement-recommended-mission__check" aria-hidden>

              ✓

            </span>

          ) : null}

        </button>

      </section>

      ) : null}



      <section className="create-engagement-mission-browse" aria-labelledby="mission-browse-title">

        <header className="create-engagement-mission-picker__intro">

          <h2 id="mission-browse-title" className="create-engagement-mission-picker__title">

            What are you trying to accomplish?

          </h2>

          <p className="create-engagement-mission-picker__lead">Browse mission types by field intent.</p>

        </header>



        <div className="create-engagement-mission-category-tabs" role="tablist" aria-label="Mission categories">

          {ENGAGEMENT_MISSION_BROWSE_CATEGORIES.map((group) => (

            <button

              key={group.id}

              type="button"

              role="tab"

              aria-selected={activeCategory === group.id}

              className={`create-engagement-mission-category-tab${

                activeCategory === group.id ? " create-engagement-mission-category-tab--active" : ""

              }`}

              onClick={() => setActiveCategory(group.id)}

            >

              {group.label}

            </button>

          ))}

        </div>



        {activeGroup ? (

          <div

            className="create-engagement-mission-grid"

            role="tabpanel"

            aria-label={`${activeGroup.label} missions`}

          >

            {activeGroup.cards.map((card) => (

              <MissionCardButton

                key={card.type}

                card={card}

                selected={selectedType === card.type}

                onSelect={() => onSelect(card.type)}

              />

            ))}

          </div>

        ) : null}

      </section>

    </div>

  );

}



function MissionCardButton({

  card,

  selected,

  onSelect,

}: {

  card: EngagementMissionCard;

  selected: boolean;

  onSelect: () => void;

}) {

  return (

    <button

      type="button"

      className={`create-engagement-mission-card${selected ? " create-engagement-mission-card--selected" : ""}`}

      aria-pressed={selected}

      onClick={onSelect}

    >

      <span className="create-engagement-mission-card__icon" aria-hidden>

        {card.icon}

      </span>

      <span className="create-engagement-mission-card__content">

        <span className="create-engagement-mission-card__name">{card.name}</span>

        <span className="create-engagement-mission-card__desc">{card.description}</span>

      </span>

      {selected ? (

        <span className="create-engagement-mission-card__check" aria-hidden>

          ✓

        </span>

      ) : null}

    </button>

  );

}

