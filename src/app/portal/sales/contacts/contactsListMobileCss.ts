/** Contacts directory shell: header, filter bar, and phone-friendly result cards. */

export const contactsListMobileCss = `
.contacts-directory-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}

.contacts-directory-back:hover {
  text-decoration: underline;
}

.contacts-directory-header-text {
  min-width: 0;
}

.contacts-directory-filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 8px;
  min-width: 0;
}

.contacts-directory-table-wrap {
  overflow-x: auto;
}

.contacts-directory-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  min-width: 0;
}

@media (max-width: 700px) {
  /* Header actions get their own row so they never crowd the page title. */
  .contacts-directory-root .sc-mobile-list-header-top {
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: 8px;
  }

  .contacts-directory-root .sc-mobile-list-header-actions {
    grid-column: 1 / -1;
    flex-wrap: wrap;
  }

  .contacts-directory-root .sc-mobile-list-header-actions > * {
    flex: 1 1 132px;
    justify-content: center;
    text-align: center;
  }

  .contacts-directory-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .contacts-directory-filters > :first-child,
  .contacts-directory-filters > :last-child {
    grid-column: 1 / -1;
  }
}
`;
