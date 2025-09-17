-- Seed demo data for KomplekKita
-- Safe to run multiple times (uses upserts and existence checks)

-- Ensure pgcrypto available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure base complexes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.complexes WHERE name = 'Komplek Anggrek Asri') THEN
    INSERT INTO public.complexes (id, name, address, lat, lng, ketua_rt, bendahara)
    VALUES (gen_random_uuid(), 'Komplek Anggrek Asri', 'Jl. Anggrek Mas Blok A, Tangerang', -6.1701, 106.6403, 'Ahmad Rahman', 'Dewi Sartika');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.complexes WHERE name = 'Komplek Melati Indah') THEN
    INSERT INTO public.complexes (id, name, address, lat, lng, ketua_rt, bendahara)
    VALUES (gen_random_uuid(), 'Komplek Melati Indah', 'Jl. Melati Raya No. 123, Jakarta Selatan', -6.2088, 106.8456, 'Budi Santoso', 'Siti Nurhaliza');
  END IF;
END $$;

-- 2) Ensure blocks for the first complex
DO $$ DECLARE v_c UUID; BEGIN
  SELECT id INTO v_c FROM public.complexes WHERE name = 'Komplek Anggrek Asri' LIMIT 1;
  IF v_c IS NOT NULL THEN
    INSERT INTO public.blocks (id, complex_id, name)
    VALUES (gen_random_uuid(), v_c, 'A'), (gen_random_uuid(), v_c, 'B'), (gen_random_uuid(), v_c, 'C'), (gen_random_uuid(), v_c, 'D')
    ON CONFLICT (complex_id, name) DO NOTHING;
  END IF;
END $$;

-- 3) Houses for blocks A and B in the first complex
DO $$ DECLARE v_c UUID; BEGIN
  SELECT id INTO v_c FROM public.complexes WHERE name = 'Komplek Anggrek Asri' LIMIT 1;
  IF v_c IS NOT NULL THEN
    -- A block
    INSERT INTO public.houses (id, complex_id, house_number, address, block, rt, rw, is_occupied, primary_contact, phone_number)
    VALUES
      (gen_random_uuid(), v_c, 'A-01', 'Blok A No. 1', 'A', '01', '01', true, 'Ahmad Rahman', '081234567890'),
      (gen_random_uuid(), v_c, 'A-02', 'Blok A No. 2', 'A', '01', '01', true, 'Dewi Sartika', '081234567891'),
      (gen_random_uuid(), v_c, 'A-03', 'Blok A No. 3', 'A', '01', '01', false, NULL, NULL),
      (gen_random_uuid(), v_c, 'A-04', 'Blok A No. 4', 'A', '01', '01', true, 'Rina Marlina', '081234567892'),
      (gen_random_uuid(), v_c, 'A-05', 'Blok A No. 5', 'A', '01', '01', true, 'Budi Santoso', '081234567893'),
      (gen_random_uuid(), v_c, 'A-06', 'Blok A No. 6', 'A', '01', '01', false, NULL, NULL)
    ON CONFLICT (house_number) DO NOTHING;

    -- B block
    INSERT INTO public.houses (id, complex_id, house_number, address, block, rt, rw, is_occupied)
    VALUES
      (gen_random_uuid(), v_c, 'B-01', 'Blok B No. 1', 'B', '01', '01', true),
      (gen_random_uuid(), v_c, 'B-02', 'Blok B No. 2', 'B', '01', '01', true),
      (gen_random_uuid(), v_c, 'B-03', 'Blok B No. 3', 'B', '01', '01', false),
      (gen_random_uuid(), v_c, 'B-04', 'Blok B No. 4', 'B', '01', '01', true),
      (gen_random_uuid(), v_c, 'B-05', 'Blok B No. 5', 'B', '01', '01', true),
      (gen_random_uuid(), v_c, 'B-06', 'Blok B No. 6', 'B', '01', '01', false)
    ON CONFLICT (house_number) DO NOTHING;
  END IF;
END $$;

-- 4) Payment categories (ensure common categories exist)
INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Iuran', 'Iuran bulanan warga', 250000, 'income', true
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Iuran');

INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Keamanan', 'Gaji/sarana keamanan', 0, 'expense', false
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Keamanan');

INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Kebersihan', 'Sampah & kebersihan', 0, 'expense', false
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Kebersihan');

INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Donasi', 'Pemasukan donasi', 0, 'income', false
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Donasi');

INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Fasilitas', 'Pemeliharaan fasilitas', 0, 'expense', false
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Fasilitas');

INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Administrasi', 'ATK & administrasi', 0, 'expense', false
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Administrasi');

INSERT INTO public.payment_categories (id, name, description, amount, type, is_recurring)
SELECT gen_random_uuid(), 'Lingkungan', 'Perawatan lingkungan', 0, 'expense', false
WHERE NOT EXISTS (SELECT 1 FROM public.payment_categories WHERE name = 'Lingkungan');

-- 5) Sample announcement (published)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.announcements WHERE title = 'Pengumuman Uji Coba') THEN
    INSERT INTO public.announcements (id, title, content, is_published, publish_date)
    VALUES (gen_random_uuid(), 'Pengumuman Uji Coba', 'Halo warga, ini adalah pengumuman uji coba dari sistem.', true, NOW());
  END IF;
END $$;

-- 6) Letter templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.letter_templates WHERE name = 'Surat Pengantar RT') THEN
    INSERT INTO public.letter_templates (id, name, category, type, description, file_url, is_active)
    VALUES (gen_random_uuid(), 'Surat Pengantar RT', 'umum', 'pengantar', 'Template pengantar RT', NULL, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.letter_templates WHERE name = 'Surat Keterangan Domisili') THEN
    INSERT INTO public.letter_templates (id, name, category, type, description, file_url, is_active)
    VALUES (gen_random_uuid(), 'Surat Keterangan Domisili', 'administrasi', 'keterangan', 'Template SKD', NULL, true);
  END IF;
END $$;

-- 7) Iuran periods: current month and previous 2 months for the first complex
DO $$ DECLARE v_c UUID; v_per1 UUID; v_per2 UUID; v_per3 UUID; v_month1 TEXT; v_month2 TEXT; v_month3 TEXT; BEGIN
  SELECT id INTO v_c FROM public.complexes WHERE name = 'Komplek Anggrek Asri' LIMIT 1;
  IF v_c IS NULL THEN RETURN; END IF;
  v_month1 := to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM');
  v_month2 := to_char((date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'), 'YYYY-MM');
  v_month3 := to_char((date_trunc('month', CURRENT_DATE) - INTERVAL '2 month'), 'YYYY-MM');

  INSERT INTO public.iuran_periods (id, complex_id, period, nominal, is_closed)
  VALUES (gen_random_uuid(), v_c, v_month1, 250000, false)
  ON CONFLICT (complex_id, period) DO UPDATE SET nominal = EXCLUDED.nominal, is_closed = public.iuran_periods.is_closed
  RETURNING id INTO v_per1;

  INSERT INTO public.iuran_periods (id, complex_id, period, nominal, is_closed)
  VALUES (gen_random_uuid(), v_c, v_month2, 250000, true)
  ON CONFLICT (complex_id, period) DO UPDATE SET nominal = EXCLUDED.nominal
  RETURNING id INTO v_per2;

  INSERT INTO public.iuran_periods (id, complex_id, period, nominal, is_closed)
  VALUES (gen_random_uuid(), v_c, v_month3, 250000, true)
  ON CONFLICT (complex_id, period) DO UPDATE SET nominal = EXCLUDED.nominal
  RETURNING id INTO v_per3;

  -- Create iuran_payments for all houses in first complex for the three periods
  INSERT INTO public.iuran_payments (id, period_id, house_id, amount, status, payment_date)
  SELECT gen_random_uuid(), v_per1, h.id, 250000,
         CASE WHEN h.house_number IN ('A-01','A-02','B-01','B-02') THEN 'paid' ELSE 'unpaid' END,
         CASE WHEN h.house_number IN ('A-01','A-02','B-01','B-02') THEN NOW() ELSE NULL END
  FROM public.houses h WHERE h.complex_id = v_c
  ON CONFLICT (period_id, house_id) DO NOTHING;

  INSERT INTO public.iuran_payments (id, period_id, house_id, amount, status, payment_date)
  SELECT gen_random_uuid(), v_per2, h.id, 250000, 'paid', NOW() - INTERVAL '15 days'
  FROM public.houses h WHERE h.complex_id = v_c
  ON CONFLICT (period_id, house_id) DO NOTHING;

  INSERT INTO public.iuran_payments (id, period_id, house_id, amount, status, payment_date)
  SELECT gen_random_uuid(), v_per3, h.id, 250000, 'paid', NOW() - INTERVAL '45 days'
  FROM public.houses h WHERE h.complex_id = v_c
  ON CONFLICT (period_id, house_id) DO NOTHING;
END $$;
