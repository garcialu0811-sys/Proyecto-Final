DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN SELECT id FROM "Sale" ORDER BY "createdAt" LOOP
    UPDATE "Sale" SET folio = 'VTA-' || LPAD(CAST(counter AS TEXT), 5, '0') WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;