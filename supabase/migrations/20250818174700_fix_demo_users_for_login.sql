-- Fix demo users for TestPire login functionality
-- Add demo users that match the login form credentials

DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    teacher_uuid UUID := gen_random_uuid();
    student_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with TestPire email addresses that match LoginForm
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
         '{"full_name": "TestPire Admin", "role": "super_admin"}'::jsonb, 
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (teacher_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'teacher1@testpire.com', crypt('teacher123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "TestPire Teacher", "role": "teacher"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (student_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'student1@testpire.com', crypt('student123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "TestPire Student", "role": "student"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Update existing user_profiles or insert if trigger doesn't handle it
    INSERT INTO public.user_profiles (id, email, full_name, role) VALUES
        (admin_uuid, 'admin@testpire.com', 'TestPire Admin', 'super_admin'::user_role),
        (teacher_uuid, 'teacher1@testpire.com', 'TestPire Teacher', 'teacher'::user_role),
        (student_uuid, 'student1@testpire.com', 'TestPire Student', 'student'::user_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    RAISE NOTICE 'Demo users created successfully with TestPire email addresses';

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Some demo users already exist with these email addresses';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating demo users: %', SQLERRM;
END $$;