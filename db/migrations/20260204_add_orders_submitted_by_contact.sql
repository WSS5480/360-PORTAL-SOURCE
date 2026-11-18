alter table if exists orders
add column if not exists submitted_by_contact_id uuid references account_contacts(id) on delete set null;

create index if not exists orders_submitted_by_contact_id_idx
  on orders(submitted_by_contact_id);
