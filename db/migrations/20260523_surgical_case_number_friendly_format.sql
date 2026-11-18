-- Shorter surgical case numbers: SC-MMDDYY-#### (superseded by 20260524 for MMDDYY; legacy rows keep older date layouts).
CREATE OR REPLACE FUNCTION public.surgical_sales_set_case_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.case_number IS NULL OR btrim(NEW.case_number) = '' THEN
    NEW.case_number :=
      'SC-'
      || to_char(timezone('UTC', now()), 'YYMMDD')
      || '-'
      || lpad(nextval('public.surgical_sales_case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
