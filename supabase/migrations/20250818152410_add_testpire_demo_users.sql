-- Location: supabase/migrations/20250818152410_add_testpire_demo_users.sql
-- Schema Analysis: user_profiles table exists with correct structure
-- Integration Type: addition - adding missing demo users
-- Dependencies: user_profiles table (existing)

-- Add TestPire-branded demo users to match LoginForm credentials
DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    teacher_uuid UUID := gen_random_uuid();
    student_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with TestPire email addresses
    -- Include all required fields for auth.users to enable proper signin
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@testpire.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "TestPire Super Admin", "role": "super_admin"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (teacher_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'teacher1@testpire.com', crypt('teacher123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "TestPire Teacher", "role": "teacher"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (student_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'student1@testpire.com', crypt('student123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "TestPire Student", "role": "student"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Create corresponding user_profiles (will be handled by handle_new_user trigger if exists, otherwise manual insert)
    INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
    VALUES 
        (admin_uuid, 'admin@testpire.com', 'TestPire Super Admin', 'super_admin'::user_role, true),
        (teacher_uuid, 'teacher1@testpire.com', 'TestPire Teacher', 'teacher'::user_role, true),
        (student_uuid, 'student1@testpire.com', 'TestPire Student', 'student'::user_role, true)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;

    RAISE NOTICE 'TestPire demo users created successfully';

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Some users already exist - skipping duplicates';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating demo users: %', SQLERRM;
END $$;