-- Document optional product_id on account_pricing.bulk_rules JSON.
-- Shape:
--   [{ "min_sqcm": 0, "price_per_sqcm": 9, "product_id": null }]           -- all products
--   [{ "min_sqcm": 0, "price_per_sqcm": 12, "product_id": "<product-uuid>" }] -- one product
-- Product-specific rules override all-products rules for that product; otherwise all-products rules apply.

comment on column public.account_pricing.bulk_rules is
  'JSON array of {min_sqcm, price_per_sqcm, product_id?}. Null/omitted product_id = all products; set product_id for product-specific tiers (override).';
