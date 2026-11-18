-- Surgical case numbers: SC-MMDDYY-#### (legacy rows may still store YYYYMMDD or YYMMDD).
CREATE OR REPLACE FUNCTION public.surgical_sales_set_case_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.case_number IS NULL OR btrim(NEW.case_number) = '' THEN
    NEW.case_number :=
      'SC-'
      || to_char(timezone('UTC', now()), 'MMDDYY')
      || '-'
      || lpad(nextval('public.surgical_sales_case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
