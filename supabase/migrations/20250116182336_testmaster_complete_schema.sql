-- Location: supabase/migrations/20250116182336_testmaster_complete_schema.sql
-- Schema Analysis: Fresh project with no existing schema
-- Integration Type: Complete new schema creation
-- Dependencies: None (fresh start)

-- 1. CREATE CUSTOM TYPES
CREATE TYPE public.user_role AS ENUM ('super_admin', 'teacher', 'student');
CREATE TYPE public.question_type AS ENUM ('mcq', 'integer_type', 'subjective');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'moderate', 'difficult');
CREATE TYPE public.test_status AS ENUM ('draft', 'published', 'active', 'completed', 'archived');
CREATE TYPE public.submission_status AS ENUM ('not_started', 'in_progress', 'submitted', 'evaluated');
CREATE TYPE public.subject_name AS ENUM ('physics', 'chemistry', 'mathematics', 'biology');
CREATE TYPE public.exam_type AS ENUM ('jee', 'neet', 'cbse', 'upsc', 'ssc', 'custom');

-- 2. CREATE CORE TABLES

-- User profiles table (intermediary for auth relationships)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role,
    phone_number TEXT,
    parent_phone TEXT,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    exam_type public.exam_type NOT NULL,
    subjects public.subject_name[] NOT NULL,
    duration_months INTEGER,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Batches table
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    max_students INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Student-Batch junction table
CREATE TABLE public.student_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, batch_id)
);

-- Chapters table
CREATE TABLE public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject public.subject_name NOT NULL,
    class_level INTEGER CHECK (class_level IN (11, 12)),
    chapter_number INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Topics table
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    topic_number INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Question bank table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type public.question_type NOT NULL,
    subject public.subject_name NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    difficulty_level public.difficulty_level NOT NULL,
    exam_type public.exam_type NOT NULL,
    class_level INTEGER CHECK (class_level IN (11, 12)),
    is_conceptual BOOLEAN DEFAULT false,
    is_theoretical BOOLEAN DEFAULT false,
    is_pyq BOOLEAN DEFAULT false,
    marks INTEGER DEFAULT 1,
    negative_marks DECIMAL(3,2) DEFAULT 0,
    explanation TEXT,
    solution_image_url TEXT,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Question options table (for MCQ questions)
CREATE TABLE public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_label TEXT NOT NULL, -- A, B, C, D
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    exam_type public.exam_type NOT NULL,
    subjects public.subject_name[] NOT NULL,
    total_questions INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    duration_minutes INTEGER NOT NULL,
    negative_marking BOOLEAN DEFAULT true,
    status public.test_status DEFAULT 'draft'::public.test_status,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    instructions TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_randomized BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test questions junction table
CREATE TABLE public.test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    marks INTEGER DEFAULT 1,
    UNIQUE(test_id, question_id),
    UNIQUE(test_id, question_number)
);

-- Test assignments table
CREATE TABLE public.test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMPTZ,
    UNIQUE(test_id, batch_id)
);

-- Student test submissions table
CREATE TABLE public.test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    status public.submission_status DEFAULT 'not_started'::public.submission_status,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    total_marks_obtained DECIMAL(6,2) DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    rank_in_batch INTEGER,
    time_spent_minutes INTEGER DEFAULT 0,
    tab_switches INTEGER DEFAULT 0,
    UNIQUE(test_id, student_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Student answers table
CREATE TABLE public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.test_submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    integer_answer INTEGER,
    text_answer TEXT,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(4,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    is_flagged BOOLEAN DEFAULT false,
    answered_at TIMESTAMPTZ,
    UNIQUE(submission_id, question_id)
);

-- Question reports table (for wrong question reporting)
CREATE TABLE public.question_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    test_submission_id UUID REFERENCES public.test_submissions(id) ON DELETE SET NULL,
    report_text TEXT NOT NULL,
    report_type TEXT DEFAULT 'wrong_question',
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Study materials table
CREATE TABLE public.study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    subject public.subject_name NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    material_type TEXT NOT NULL, -- 'notes', 'formula', 'video', 'document'
    file_url TEXT,
    youtube_url TEXT,
    content TEXT,
    class_level INTEGER CHECK (class_level IN (11, 12)),
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Student performance analytics table
CREATE TABLE public.student_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject public.subject_name NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    total_questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    accuracy_percentage DECIMAL(5,2) DEFAULT 0,
    average_time_per_question INTEGER DEFAULT 0,
    weak_areas TEXT[],
    strong_areas TEXT[],
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject, chapter_id, topic_id)
);

-- 3. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_courses_exam_type ON public.courses(exam_type);
CREATE INDEX idx_batches_course_id ON public.batches(course_id);
CREATE INDEX idx_batches_teacher_id ON public.batches(teacher_id);
CREATE INDEX idx_student_batches_student_id ON public.student_batches(student_id);
CREATE INDEX idx_student_batches_batch_id ON public.student_batches(batch_id);
CREATE INDEX idx_chapters_subject ON public.chapters(subject);
CREATE INDEX idx_topics_chapter_id ON public.topics(chapter_id);
CREATE INDEX idx_questions_subject ON public.questions(subject);
CREATE INDEX idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX idx_questions_difficulty_level ON public.questions(difficulty_level);
CREATE INDEX idx_questions_exam_type ON public.questions(exam_type);
CREATE INDEX idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX idx_tests_created_by ON public.tests(created_by);
CREATE INDEX idx_tests_status ON public.tests(status);
CREATE INDEX idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX idx_test_assignments_test_id ON public.test_assignments(test_id);
CREATE INDEX idx_test_assignments_batch_id ON public.test_assignments(batch_id);
CREATE INDEX idx_test_submissions_test_id ON public.test_submissions(test_id);
CREATE INDEX idx_test_submissions_student_id ON public.test_submissions(student_id);
CREATE INDEX idx_student_answers_submission_id ON public.student_answers(submission_id);
CREATE INDEX idx_question_reports_question_id ON public.question_reports(question_id);
CREATE INDEX idx_study_materials_subject ON public.study_materials(subject);
CREATE INDEX idx_study_materials_chapter_id ON public.study_materials(chapter_id);
CREATE INDEX idx_student_analytics_student_id ON public.student_analytics(student_id);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;

-- 5. CREATE HELPER FUNCTIONS FOR RLS POLICIES

-- Function to check if user has admin role from auth metadata
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'super_admin' 
         OR au.raw_app_meta_data->>'role' = 'super_admin')
)
$$;

-- Function to check if user is teacher of a batch
CREATE OR REPLACE FUNCTION public.is_teacher_of_batch(batch_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.id = batch_uuid AND b.teacher_id = auth.uid()
)
$$;

-- Function to check if user is student in a batch
CREATE OR REPLACE FUNCTION public.is_student_in_batch(batch_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.student_batches sb
    WHERE sb.batch_id = batch_uuid AND sb.student_id = auth.uid()
)
$$;

-- Function to check if user can access test
CREATE OR REPLACE FUNCTION public.can_access_test(test_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.test_assignments ta
    JOIN public.student_batches sb ON ta.batch_id = sb.batch_id
    WHERE ta.test_id = test_uuid AND sb.student_id = auth.uid()
)
OR EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_uuid AND t.created_by = auth.uid()
)
$$;

-- 6. CREATE RLS POLICIES

-- User profiles policies (Pattern 1: Core user table)
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin can view all profiles
CREATE POLICY "admin_view_all_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin_from_auth());

-- Courses policies
CREATE POLICY "admin_manage_courses"
ON public.courses
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "users_view_active_courses"
ON public.courses
FOR SELECT
TO authenticated
USING (is_active = true);

-- Batches policies
CREATE POLICY "admin_manage_batches"
ON public.batches
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "teachers_view_own_batches"
ON public.batches
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "students_view_enrolled_batches"
ON public.batches
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_batches sb
        WHERE sb.batch_id = id AND sb.student_id = auth.uid()
    )
);

-- Student batches policies
CREATE POLICY "admin_manage_student_batches"
ON public.student_batches
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "students_view_own_batch_enrollment"
ON public.student_batches
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Chapters policies (public read for content)
CREATE POLICY "public_read_chapters"
ON public.chapters
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "admin_manage_chapters"
ON public.chapters
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Topics policies
CREATE POLICY "public_read_topics"
ON public.topics
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "admin_manage_topics"
ON public.topics
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Questions policies
CREATE POLICY "teachers_admin_manage_questions"
ON public.questions
FOR ALL
TO authenticated
USING (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
)
WITH CHECK (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
);

-- Question options policies
CREATE POLICY "teachers_admin_manage_question_options"
ON public.question_options
FOR ALL
TO authenticated
USING (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
)
WITH CHECK (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
);

-- Tests policies
CREATE POLICY "teachers_manage_own_tests"
ON public.tests
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "students_view_assigned_tests"
ON public.tests
FOR SELECT
TO authenticated
USING (public.can_access_test(id));

-- Test questions policies
CREATE POLICY "teachers_manage_test_questions"
ON public.test_questions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tests t
        WHERE t.id = test_id AND t.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tests t
        WHERE t.id = test_id AND t.created_by = auth.uid()
    )
);

-- Test assignments policies
CREATE POLICY "teachers_manage_test_assignments"
ON public.test_assignments
FOR ALL
TO authenticated
USING (assigned_by = auth.uid())
WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "students_view_own_test_assignments"
ON public.test_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_batches sb
        WHERE sb.batch_id = batch_id AND sb.student_id = auth.uid()
    )
);

-- Test submissions policies
CREATE POLICY "students_manage_own_submissions"
ON public.test_submissions
FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "teachers_view_batch_submissions"
ON public.test_submissions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.test_assignments ta
        JOIN public.batches b ON ta.batch_id = b.id
        WHERE ta.test_id = test_id AND b.teacher_id = auth.uid()
    )
);

-- Student answers policies
CREATE POLICY "students_manage_own_answers"
ON public.student_answers
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.test_submissions ts
        WHERE ts.id = submission_id AND ts.student_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.test_submissions ts
        WHERE ts.id = submission_id AND ts.student_id = auth.uid()
    )
);

-- Question reports policies
CREATE POLICY "students_manage_own_reports"
ON public.question_reports
FOR ALL
TO authenticated
USING (reported_by = auth.uid())
WITH CHECK (reported_by = auth.uid());

CREATE POLICY "teachers_admin_view_reports"
ON public.question_reports
FOR SELECT
TO authenticated
USING (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
);

-- Study materials policies
CREATE POLICY "public_view_study_materials"
ON public.study_materials
FOR SELECT
TO authenticated
USING (is_public = true);

CREATE POLICY "teachers_admin_manage_study_materials"
ON public.study_materials
FOR ALL
TO authenticated
USING (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
)
WITH CHECK (
    public.is_admin_from_auth() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'teacher'
    )
);

-- Student analytics policies
CREATE POLICY "students_view_own_analytics"
ON public.student_analytics
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "teachers_view_batch_student_analytics"
ON public.student_analytics
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_batches sb
        JOIN public.batches b ON sb.batch_id = b.id
        WHERE sb.student_id = student_id AND b.teacher_id = auth.uid()
    )
);

-- 7. CREATE TRIGGERS AND FUNCTIONS

-- Function for automatic user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::public.user_role
  );  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update test statistics
CREATE OR REPLACE FUNCTION public.update_test_stats()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update total questions and marks when test questions are added/removed
    UPDATE public.tests 
    SET 
        total_questions = (
            SELECT COUNT(*) 
            FROM public.test_questions tq 
            WHERE tq.test_id = NEW.test_id
        ),
        total_marks = (
            SELECT COALESCE(SUM(tq.marks), 0) 
            FROM public.test_questions tq 
            WHERE tq.test_id = NEW.test_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.test_id;
    
    RETURN NEW;
END;
$$;

-- Trigger for test statistics update
CREATE TRIGGER update_test_stats_trigger
    AFTER INSERT OR DELETE ON public.test_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_test_stats();

-- 8. CREATE STORAGE BUCKETS AND POLICIES

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
    ('study-materials', 'study-materials', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'video/mp4']),
    ('question-images', 'question-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for profile photos (public read, private upload)
CREATE POLICY "public_view_profile_photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "users_upload_own_profile_photos" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_update_own_profile_photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'profile-photos' AND owner = auth.uid());

CREATE POLICY "users_delete_own_profile_photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND owner = auth.uid());

-- Storage policies for study materials (private access)
CREATE POLICY "teachers_admin_manage_study_materials_files"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'study-materials' AND (
        public.is_admin_from_auth() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'teacher'
        )
    )
)
WITH CHECK (
    bucket_id = 'study-materials' AND (
        public.is_admin_from_auth() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'teacher'
        )
    )
);

CREATE POLICY "students_view_study_materials_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'study-materials');

-- Storage policies for question images (teacher and admin access)
CREATE POLICY "teachers_admin_manage_question_images"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'question-images' AND (
        public.is_admin_from_auth() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'teacher'
        )
    )
)
WITH CHECK (
    bucket_id = 'question-images' AND (
        public.is_admin_from_auth() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'teacher'
        )
    )
);

-- 9. MOCK DATA FOR TESTING

DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    teacher1_uuid UUID := gen_random_uuid();
    teacher2_uuid UUID := gen_random_uuid();
    student1_uuid UUID := gen_random_uuid();
    student2_uuid UUID := gen_random_uuid();
    student3_uuid UUID := gen_random_uuid();
    
    course1_uuid UUID := gen_random_uuid();
    course2_uuid UUID := gen_random_uuid();
    
    batch1_uuid UUID := gen_random_uuid();
    batch2_uuid UUID := gen_random_uuid();
    
    chapter1_uuid UUID := gen_random_uuid();
    chapter2_uuid UUID := gen_random_uuid();
    chapter3_uuid UUID := gen_random_uuid();
    
    topic1_uuid UUID := gen_random_uuid();
    topic2_uuid UUID := gen_random_uuid();
    topic3_uuid UUID := gen_random_uuid();
    
    question1_uuid UUID := gen_random_uuid();
    question2_uuid UUID := gen_random_uuid();
    question3_uuid UUID := gen_random_uuid();
    
    test1_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with complete required fields
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
         'admin@testmaster.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Super Admin", "role": "super_admin"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (teacher1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'teacher1@testmaster.com', crypt('teacher123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Physics Teacher", "role": "teacher"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (teacher2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'teacher2@testmaster.com', crypt('teacher123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Chemistry Teacher", "role": "teacher"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (student1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'student1@testmaster.com', crypt('student123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "John Doe", "role": "student"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (student2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'student2@testmaster.com', crypt('student123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Jane Smith", "role": "student"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (student3_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'student3@testmaster.com', crypt('student123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Mike Johnson", "role": "student"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Create courses
    INSERT INTO public.courses (id, name, description, exam_type, subjects, duration_months, created_by) VALUES
        (course1_uuid, 'JEE Main Preparation', 'Comprehensive JEE Main preparation course', 'jee'::public.exam_type, 
         ARRAY['physics', 'chemistry', 'mathematics']::public.subject_name[], 12, admin_uuid),
        (course2_uuid, 'NEET Preparation', 'Complete NEET preparation with Biology focus', 'neet'::public.exam_type,
         ARRAY['physics', 'chemistry', 'biology']::public.subject_name[], 12, admin_uuid);

    -- Create batches
    INSERT INTO public.batches (id, name, course_id, teacher_id, start_date, end_date, created_by) VALUES
        (batch1_uuid, 'JEE 2025 Morning Batch', course1_uuid, teacher1_uuid, '2024-06-01', '2025-05-31', admin_uuid),
        (batch2_uuid, 'NEET 2025 Evening Batch', course2_uuid, teacher2_uuid, '2024-06-01', '2025-05-31', admin_uuid);

    -- Enroll students in batches
    INSERT INTO public.student_batches (student_id, batch_id) VALUES
        (student1_uuid, batch1_uuid),
        (student2_uuid, batch2_uuid),
        (student3_uuid, batch1_uuid);

    -- Create chapters
    INSERT INTO public.chapters (id, name, subject, class_level, chapter_number) VALUES
        (chapter1_uuid, 'Mechanics', 'physics'::public.subject_name, 11, 1),
        (chapter2_uuid, 'Thermodynamics', 'physics'::public.subject_name, 11, 2),
        (chapter3_uuid, 'Organic Chemistry Basics', 'chemistry'::public.subject_name, 11, 1);

    -- Create topics
    INSERT INTO public.topics (id, name, chapter_id, topic_number) VALUES
        (topic1_uuid, 'Laws of Motion', chapter1_uuid, 1),
        (topic2_uuid, 'Work Energy Power', chapter1_uuid, 2),
        (topic3_uuid, 'Heat and Temperature', chapter2_uuid, 1);

    -- Create sample questions
    INSERT INTO public.questions (id, question_text, question_type, subject, chapter_id, topic_id, difficulty_level, exam_type, class_level, marks, created_by) VALUES
        (question1_uuid, 'A body of mass 2 kg is moving with velocity 10 m/s. What is its kinetic energy?', 'mcq'::public.question_type, 
         'physics'::public.subject_name, chapter1_uuid, topic2_uuid, 'easy'::public.difficulty_level, 'jee'::public.exam_type, 11, 4, teacher1_uuid),
        (question2_uuid, 'State Newton''s first law of motion.', 'subjective'::public.question_type,
         'physics'::public.subject_name, chapter1_uuid, topic1_uuid, 'easy'::public.difficulty_level, 'cbse'::public.exam_type, 11, 2, teacher1_uuid),
        (question3_uuid, 'If acceleration due to gravity is 10 m/s², find the weight of 5 kg mass.', 'integer_type'::public.question_type,
         'physics'::public.subject_name, chapter1_uuid, topic1_uuid, 'moderate'::public.difficulty_level, 'jee'::public.exam_type, 11, 4, teacher1_uuid);

    -- Create question options for MCQ
    INSERT INTO public.question_options (question_id, option_text, option_label, is_correct) VALUES
        (question1_uuid, '50 J', 'A', false),
        (question1_uuid, '100 J', 'B', true),
        (question1_uuid, '150 J', 'C', false),
        (question1_uuid, '200 J', 'D', false);

    -- Create a test
    INSERT INTO public.tests (id, title, description, exam_type, subjects, duration_minutes, created_by, instructions) VALUES
        (test1_uuid, 'Physics Mock Test 1', 'Basic mechanics and thermodynamics test', 'jee'::public.exam_type,
         ARRAY['physics']::public.subject_name[], 180, teacher1_uuid, 'Read all instructions carefully. Negative marking applies.');

    -- Add questions to test
    INSERT INTO public.test_questions (test_id, question_id, question_number, marks) VALUES
        (test1_uuid, question1_uuid, 1, 4),
        (test1_uuid, question2_uuid, 2, 2),
        (test1_uuid, question3_uuid, 3, 4);

    -- Assign test to batch
    INSERT INTO public.test_assignments (test_id, batch_id, assigned_by, due_date) VALUES
        (test1_uuid, batch1_uuid, teacher1_uuid, now() + interval '7 days');

    -- Create study materials
    INSERT INTO public.study_materials (title, description, subject, chapter_id, material_type, content, uploaded_by) VALUES
        ('Newton''s Laws Formula Sheet', 'Important formulas for laws of motion', 'physics'::public.subject_name, 
         chapter1_uuid, 'formula', 'F = ma, v = u + at, s = ut + 0.5at²', teacher1_uuid),
        ('Mechanics Notes', 'Detailed notes on mechanics concepts', 'physics'::public.subject_name,
         chapter1_uuid, 'notes', 'Detailed explanation of mechanics principles and applications', teacher1_uuid);

    RAISE NOTICE 'TestMaster database initialized successfully with mock data';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error initializing mock data: %', SQLERRM;
END $$;