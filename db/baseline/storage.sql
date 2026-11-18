-- Storage buckets and policies from the working portal.
-- Apply this only on Supabase, after the storage schema exists.
-- Bucket rows are configuration. Object files are not included.


INSERT INTO storage.buckets (id, name, public) VALUES ('documents-private', 'documents-private', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ivr-private', 'ivr-private', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('order-private', 'order-private', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-assets', 'product-assets', false) ON CONFLICT (id) DO NOTHING;
