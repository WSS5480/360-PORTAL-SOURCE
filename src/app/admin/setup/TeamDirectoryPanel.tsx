"use client";

import Link from "next/link";
import React from "react";
import type { AdminSetupSnapshot } from "@/lib/admin/adminSetupTypes";
import styles from "./teamDirectory.module.css";

type TeamRoleFilter = "all" | "admin" | "sales_rep" | "territory_manager";

const TEAM_ROLE_FILTERS: { key: TeamRoleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admins" },
  { key: "sales_rep", label: "Sales reps" },
  { key: "territory_manager", label: "Territory managers" },
];

function teamMemberMatchesFilter(roles: string[], filter: TeamRoleFilter): boolean {
  if (filter === "all") return true;
  if (filter === "admin") return roles.includes("Admin");
  if (filter === "sales_rep") return roles.includes("Sales rep");
  if (filter === "territory_manager") return roles.includes("Territory manager");
  return true;
}

function teamMemberSearchHaystack(name: string | null, email: string | null): string {
  return `${name ?? ""} ${email ?? ""}`.trim().toLowerCase();
}

function memberInitials(name: string | null, email: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function teamMemberLabel(member: { name: string | null; email: string | null }): string {
  return member.name || member.email || "Unknown";
}

function isTerritoryManagerMember(roles: string[]): boolean {
  return roles.includes("Territory manager");
}

function isFieldSalesRepMember(roles: string[]): boolean {
  return roles.includes("Sales rep") && !roles.includes("Territory manager");
}

function roleBadgeTone(role: string): "brand" | "ready" | "warn" | "neutral" {
  if (role === "Admin") return "brand";
  if (role === "Territory manager") return "warn";
  if (role === "Sales rep") return "ready";
  return "neutral";
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ready" | "warn" | "brand" }) {
  const map = {
    neutral: styles.pillNeutral,
    ready: styles.pillReady,
    warn: styles.pillWarn,
    brand: styles.pillBrand,
  }[tone];
  return <span className={`${styles.pill} ${map}`}>{children}</span>;
}

function RoleMenu({
  roles,
  disabled,
  open,
  onToggleOpen,
  onSetRole,
}: {
  roles: { is_admin: boolean; is_internal_sales_rep: boolean; is_territory_manager: boolean };
  disabled: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onSetRole: (roles: { is_admin: boolean; is_internal_sales_rep: boolean; is_territory_manager: boolean }) => void;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) onToggleOpen();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onToggleOpen();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onToggleOpen]);

  function toggleRole(key: "is_admin" | "is_internal_sales_rep" | "is_territory_manager") {
    const next = { ...roles, [key]: !roles[key] };
    if (key === "is_internal_sales_rep" && !next.is_internal_sales_rep) next.is_territory_manager = false;
    onSetRole(next);
  }

  return (
    <div className={styles.menuWrap} ref={menuRef}>
      <button
        type="button"
        className={styles.menuButton}
        aria-label="Manage roles"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggleOpen}
      >
        ⋮
      </button>
      {open ? (
        <div className={styles.menuPanel} role="menu">
          <div className={styles.menuTitle}>Access roles</div>
          {(
            [
              ["Admin", "is_admin"],
              ["Sales rep", "is_internal_sales_rep"],
              ["Territory manager", "is_territory_manager"],
            ] as const
          ).map(([label, key]) => {
            const tmDisabled = key === "is_territory_manager" && !roles.is_internal_sales_rep;
            return (
              <label
                key={key}
                className={`${styles.menuItem} ${tmDisabled ? styles.menuItemDisabled : ""}`}
                role="menuitemcheckbox"
                aria-checked={roles[key]}
              >
                <input
                  type="checkbox"
                  className={styles.menuCheckbox}
                  checked={roles[key]}
                  disabled={disabled || tmDisabled}
                  onChange={() => toggleRole(key)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function TeamDirectoryPanel({
  team,
  busyUser,
  rosterBusy,
  onSetRole,
  onAssignRepManager,
}: {
  team: AdminSetupSnapshot["users"]["team"];
  busyUser: string | null;
  rosterBusy: string | null;
  onSetRole: (
    userId: string,
    roles: { is_admin: boolean; is_internal_sales_rep: boolean; is_territory_manager: boolean },
  ) => void;
  onAssignRepManager: (repUserId: string, managerUserId: string | null) => void;
}) {
  const [teamFilter, setTeamFilter] = React.useState<TeamRoleFilter>("all");
  const [teamSearch, setTeamSearch] = React.useState("");
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const teamSearchNeedle = teamSearch.trim().toLowerCase();
  const filteredTeam = team.filter((member) => {
    if (!teamMemberMatchesFilter(member.roles, teamFilter)) return false;
    if (!teamSearchNeedle) return true;
    return teamMemberSearchHaystack(member.name, member.email).includes(teamSearchNeedle);
  });

  const filterCounts = React.useMemo(
    () => ({
      all: team.length,
      admin: team.filter((m) => teamMemberMatchesFilter(m.roles, "admin")).length,
      sales_rep: team.filter((m) => teamMemberMatchesFilter(m.roles, "sales_rep")).length,
      territory_manager: team.filter((m) => teamMemberMatchesFilter(m.roles, "territory_manager")).length,
    }),
    [team],
  );

  const activeFilterCount = (teamFilter !== "all" ? 1 : 0) + (teamSearchNeedle ? 1 : 0);

  const teamById = React.useMemo(() => new Map(team.map((member) => [member.id, member])), [team]);

  const territoryManagers = React.useMemo(
    () => team.filter((member) => isTerritoryManagerMember(member.roles)),
    [team],
  );

  const fieldSalesReps = React.useMemo(
    () => team.filter((member) => isFieldSalesRepMember(member.roles)),
    [team],
  );

  function rolesFrom(member: AdminSetupSnapshot["users"]["team"][number]) {
    return {
      is_admin: member.roles.includes("Admin"),
      is_internal_sales_rep: member.roles.includes("Sales rep"),
      is_territory_manager: member.roles.includes("Territory manager"),
    };
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <p className={styles.toolbarHint}>
            {filteredTeam.length} of {team.length} members
          </p>
          {activeFilterCount ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setTeamFilter("all");
                setTeamSearch("");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <input
          className={styles.searchInput}
          value={teamSearch}
          placeholder="Search name or email"
          onChange={(e) => setTeamSearch(e.target.value)}
        />

        <div className={styles.chipRow}>
          {TEAM_ROLE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.chip} ${teamFilter === key ? styles.chipActive : ""}`}
              onClick={() => setTeamFilter(key)}
            >
              {label}
              <span className={styles.chipCount}>{filterCounts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {!team.length ? (
        <span className={styles.muted}>No internal team members yet.</span>
      ) : filteredTeam.length ? (
        <div className={styles.tableWrap}>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Member</span>
              <span>Roles</span>
              <span>Reporting</span>
              <span>Last active</span>
              <span aria-hidden />
            </div>

            {filteredTeam.map((member) => {
              const roles = rolesFrom(member);
              const disabled = busyUser === member.id;
              const rosterDisabled = rosterBusy != null;
              const isManager = isTerritoryManagerMember(member.roles);
              const isFieldRep = isFieldSalesRepMember(member.roles);
              const managedRepIds = member.managedRepIds ?? [];
              const managedReps = managedRepIds
                .map((repId) => teamById.get(repId))
                .filter((row): row is AdminSetupSnapshot["users"]["team"][number] => row != null);
              const availableRepsForManager = fieldSalesReps.filter(
                (rep) => rep.id !== member.id && !managedRepIds.includes(rep.id),
              );

              return (
                <div key={member.id} className={`${styles.row} ${disabled ? styles.rowBusy : ""}`}>
                  <Link href={`/admin/users/${member.id}`} className={styles.memberLink}>
                    <span className={styles.avatar}>{memberInitials(member.name, member.email)}</span>
                    <div className={styles.memberText}>
                      <div className={styles.memberName}>{member.name || "Unnamed"}</div>
                      <div className={styles.memberEmail}>{member.email || "No email"}</div>
                    </div>
                  </Link>

                  <div className={styles.rolesCell}>
                    {member.roles.length ? (
                      member.roles.map((role) => (
                        <Pill key={role} tone={roleBadgeTone(role)}>
                          {role}
                        </Pill>
                      ))
                    ) : (
                      <Pill>No roles</Pill>
                    )}
                  </div>

                  <div className={styles.reportingCell}>
                    {isManager ? (
                      <div className={styles.reportingStack}>
                        {managedReps.length ? (
                          <div className={styles.repChipRow}>
                            {managedReps.map((rep) => (
                              <button
                                key={rep.id}
                                type="button"
                                className={styles.repChip}
                                disabled={rosterDisabled}
                                title="Remove from roster"
                                onClick={() => onAssignRepManager(rep.id, null)}
                              >
                                {teamMemberLabel(rep)} ×
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.muted}>No direct reports</span>
                        )}
                        {availableRepsForManager.length ? (
                          <select
                            className={styles.inlineSelect}
                            disabled={rosterDisabled}
                            defaultValue=""
                            onChange={(e) => {
                              const repId = e.target.value;
                              if (!repId) return;
                              e.target.value = "";
                              onAssignRepManager(repId, member.id);
                            }}
                          >
                            <option value="">+ Add rep</option>
                            {availableRepsForManager.map((rep) => (
                              <option key={rep.id} value={rep.id}>
                                {teamMemberLabel(rep)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    ) : isFieldRep ? (
                      <select
                        className={styles.inlineSelect}
                        disabled={rosterDisabled}
                        value={member.managerUserId ?? ""}
                        onChange={(e) => onAssignRepManager(member.id, e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {territoryManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {teamMemberLabel(manager)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </div>

                  <div className={styles.activeCell}>{formatLastActive(member.lastSignInAt)}</div>

                  <RoleMenu
                    roles={roles}
                    disabled={disabled}
                    open={openMenuId === member.id}
                    onToggleOpen={() => setOpenMenuId((prev) => (prev === member.id ? null : member.id))}
                    onSetRole={(next) => onSetRole(member.id, next)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No matches</div>
          <div className={styles.emptyBody}>Try a different role filter or search term.</div>
        </div>
      )}
    </>
  );
}
