-- ==============================================================================
-- PUBLISHED WEBSITE KE LIYE ADMIN SETUP SQL
-- ==============================================================================
-- 
-- YEH SCRIPT PUBLISHED WEBSITE (https://sg-83bb9141-db4e-49e7-bc62-8148f2d8.vercel.app)
-- KE SUPABASE DATABASE MEIN RUN KAREIN
--
-- IMPORTANT: Is script ko SIRF published site ki Supabase project ki SQL Editor
-- mein run karein. Preview wali database mein mat run karein!
--
-- STEPS:
-- 1. Supabase Dashboard kholen: https://supabase.com/dashboard/project/cxmdveyzcxutlsrrwtei
-- 2. Left sidebar mein "SQL Editor" par click karein
-- 3. "New Query" button dabayein
-- 4. Is poori script ko copy karke SQL editor mein paste karein
-- 5. Neeche apna email address replace karein (line 32 aur 59)
-- 6. "Run" button dabayein
--
-- ==============================================================================

DO $primebet_published_admin$
DECLARE
  -- IMPORTANT: Apna admin email yahan update karein
  v_email TEXT := 'johnnyldaniels506@gmail.com';
  v_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check: Email placeholder replace kiya gaya hai?
  IF v_email LIKE 'your_email%' THEN
    RAISE EXCEPTION 'Pehle apna email address script mein update karein (line 32)';
  END IF;

  -- Step 1: Check karo ke Supabase Auth mein user hai ya nahi
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Email % ke liye Supabase Auth account nahi mila. Pehle published site par register karein.', v_email;
  END IF;

  -- Step 2: Check karo profile table mein entry hai ya nahi
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE NOTICE 'Profile nahi mili, nayi profile create ho rahi hai...';
    INSERT INTO public.profiles (id, email, demo_balance)
    VALUES (v_user_id, v_email, 0);
  END IF;

  -- Step 3: Admin role aur permissions set karein
  UPDATE public.profiles
  SET 
    is_admin = TRUE,
    admin_role = 'super_admin',
    is_suspended = FALSE,
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Admin role successfully set for %', v_email;
  RAISE NOTICE '⚠️  IMPORTANT: Authenticator 2FA setup zaroori hai!';
  RAISE NOTICE '   1. Published site par login karein';
  RAISE NOTICE '   2. Account Settings → Security tab par jayein';
  RAISE NOTICE '   3. Two-factor authentication enable karein';
  RAISE NOTICE '   4. Authenticator app se setup complete karein';
  RAISE NOTICE '   5. Phir admin portal access kar sakte hain';
END
$primebet_published_admin$;

-- Verification query: Admin role check karein
SELECT 
  id,
  email,
  is_admin,
  admin_role,
  two_factor_enabled,
  is_suspended,
  created_at
FROM public.profiles
WHERE lower(email) = lower('johnnyldaniels506@gmail.com');

-- ==============================================================================
-- EXPECTED OUTPUT:
-- - NOTICE messages with "Admin role successfully set"
-- - One row showing your account with:
--   * is_admin = true
--   * admin_role = 'super_admin'
--   * two_factor_enabled = false (abhi)
--   * is_suspended = false
-- ==============================================================================