-- Migration: Add External Question Bank and Question Bank Import Features
-- This migration adds tables and functionality for importing questions from external sources like Google or online question banks

-- Create external_question_banks table to store information about different question banks
CREATE TABLE IF NOT EXISTS public.external_question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('google', 'online', 'pdf', 'excel', 'custom')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}', -- Store source-specific metadata
  total_questions INTEGER DEFAULT 0,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Create question_bank_imports table to track import jobs
CREATE TABLE IF NOT EXISTS public.question_bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_bank_id UUID REFERENCES public.external_question_banks(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('full', 'incremental', 'selective')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  total_questions_found INTEGER DEFAULT 0,
  questions_imported INTEGER DEFAULT 0,
  questions_failed INTEGER DEFAULT 0,
  import_filters JSONB DEFAULT '{}', -- Store filters used during import
  error_log JSONB DEFAULT '[]', -- Store any errors during import
  imported_by UUID REFERENCES public.user_profiles(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create question_sources table to track which questions came from which sources
CREATE TABLE IF NOT EXISTS public.question_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  external_bank_id UUID REFERENCES public.external_question_banks(id) ON DELETE SET NULL,
  import_id UUID REFERENCES public.question_bank_imports(id) ON DELETE SET NULL,
  external_question_id TEXT, -- ID in the external system
  source_metadata JSONB DEFAULT '{}', -- Additional metadata from source
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to questions table to support unlimited questions and external sources
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'external', 'imported')),
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS import_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.00 CHECK (quality_score >= 0.00 AND quality_score <= 10.00),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_external_question_banks_source_type ON public.external_question_banks(source_type);
CREATE INDEX IF NOT EXISTS idx_external_question_banks_is_active ON public.external_question_banks(is_active);
CREATE INDEX IF NOT EXISTS idx_question_bank_imports_status ON public.question_bank_imports(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_imports_external_bank_id ON public.question_bank_imports(external_bank_id);
CREATE INDEX IF NOT EXISTS idx_question_sources_question_id ON public.question_sources(question_id);
CREATE INDEX IF NOT EXISTS idx_question_sources_external_bank_id ON public.question_sources(external_bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_source_type ON public.questions(source_type);
CREATE INDEX IF NOT EXISTS idx_questions_external_id ON public.questions(external_id);
CREATE INDEX IF NOT EXISTS idx_questions_verification_status ON public.questions(verification_status);

-- Create function to update question bank statistics
CREATE OR REPLACE FUNCTION update_external_bank_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total questions count for the external bank
  UPDATE public.external_question_banks 
  SET total_questions = (
    SELECT COUNT(*)
    FROM public.question_sources qs
    JOIN public.questions q ON qs.question_id = q.id
    WHERE qs.external_bank_id = COALESCE(NEW.external_bank_id, OLD.external_bank_id)
    AND q.is_active = true
  )
  WHERE id = COALESCE(NEW.external_bank_id, OLD.external_bank_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats
DROP TRIGGER IF EXISTS trigger_update_external_bank_stats ON public.question_sources;
CREATE TRIGGER trigger_update_external_bank_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.question_sources
  FOR EACH ROW EXECUTE FUNCTION update_external_bank_stats();

-- Create function to handle question import validation
CREATE OR REPLACE FUNCTION validate_question_import(
  p_question_data JSONB,
  p_external_bank_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  validation_result JSONB := '{"valid": true, "errors": []}';
  errors TEXT[] := '{}';
BEGIN
  -- Validate required fields
  IF NOT (p_question_data ? 'question_text') OR (p_question_data->>'question_text') = '' THEN
    errors := array_append(errors, 'Question text is required');
  END IF;
  
  IF NOT (p_question_data ? 'question_type') OR (p_question_data->>'question_type') = '' THEN
    errors := array_append(errors, 'Question type is required');
  END IF;
  
  IF NOT (p_question_data ? 'subject') OR (p_question_data->>'subject') = '' THEN
    errors := array_append(errors, 'Subject is required');
  END IF;
  
  IF NOT (p_question_data ? 'difficulty_level') OR (p_question_data->>'difficulty_level') = '' THEN
    errors := array_append(errors, 'Difficulty level is required');
  END IF;
  
  -- Validate question type specific requirements
  IF (p_question_data->>'question_type') = 'mcq' THEN
    IF NOT (p_question_data ? 'options') OR jsonb_array_length(p_question_data->'options') < 2 THEN
      errors := array_append(errors, 'MCQ questions must have at least 2 options');
    END IF;
  END IF;
  
  -- Check for duplicate external_id if provided
  IF p_question_data ? 'external_id' AND (p_question_data->>'external_id') != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.questions 
      WHERE external_id = (p_question_data->>'external_id') 
      AND source_type = 'external'
    ) THEN
      errors := array_append(errors, 'Question with this external_id already exists');
    END IF;
  END IF;
  
  -- Set validation result
  IF array_length(errors, 1) > 0 THEN
    validation_result := jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(errors)
    );
  END IF;
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- Insert sample external question banks for demonstration
INSERT INTO public.external_question_banks (name, description, source_type, source_url, is_active, created_by, metadata) VALUES 
('Google AI Question Bank', 'Questions generated and curated by Google AI systems', 'google', 'https://ai.google.com/education/questions', true, NULL, '{"api_version": "v1", "categories": ["science", "math", "physics", "chemistry"]}'),
('Khan Academy Question Pool', 'Open educational questions from Khan Academy', 'online', 'https://www.khanacademy.org/api/questions', true, NULL, '{"format": "json", "subjects": ["mathematics", "physics", "chemistry", "biology"]}'),
('JEE Main Previous Years', 'Previous year JEE Main questions digitized', 'custom', NULL, true, NULL, '{"exam_type": "jee", "years": "2010-2024", "digitized": true}'),
('NEET Question Archive', 'Comprehensive NEET question collection', 'custom', NULL, true, NULL, '{"exam_type": "neet", "years": "2013-2024", "verified": true}')
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.external_question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_question_banks
CREATE POLICY "Admin and teachers can manage external question banks"
  ON public.external_question_banks
  FOR ALL
  TO authenticated
  USING (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for question_bank_imports
CREATE POLICY "Admin and teachers can manage imports"
  ON public.question_bank_imports
  FOR ALL
  TO authenticated
  USING (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for question_sources
CREATE POLICY "Admin and teachers can view question sources"
  ON public.question_sources
  FOR SELECT
  TO authenticated
  USING (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'student')
    )
  );

CREATE POLICY "Admin and teachers can manage question sources"
  ON public.question_sources
  FOR ALL
  TO authenticated
  USING (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    is_admin_from_auth() OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Create function to get question bank statistics
CREATE OR REPLACE FUNCTION get_question_bank_statistics(bank_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  bank_stats RECORD;
BEGIN
  IF bank_id IS NULL THEN
    -- Return overall statistics
    SELECT 
      COUNT(*) as total_banks,
      SUM(total_questions) as total_questions,
      COUNT(*) FILTER (WHERE is_active = true) as active_banks
    INTO bank_stats
    FROM public.external_question_banks;
    
    result := jsonb_build_object(
      'total_banks', COALESCE(bank_stats.total_banks, 0),
      'total_questions', COALESCE(bank_stats.total_questions, 0),
      'active_banks', COALESCE(bank_stats.active_banks, 0)
    );
  ELSE
    -- Return statistics for specific bank
    SELECT 
      eqb.name,
      eqb.source_type,
      eqb.total_questions,
      COUNT(qbi.id) as total_imports,
      COUNT(qbi.id) FILTER (WHERE qbi.status = 'completed') as successful_imports,
      COALESCE(SUM(qbi.questions_imported), 0) as total_imported
    INTO bank_stats
    FROM public.external_question_banks eqb
    LEFT JOIN public.question_bank_imports qbi ON eqb.id = qbi.external_bank_id
    WHERE eqb.id = bank_id
    GROUP BY eqb.id, eqb.name, eqb.source_type, eqb.total_questions;
    
    result := jsonb_build_object(
      'name', bank_stats.name,
      'source_type', bank_stats.source_type,
      'total_questions', COALESCE(bank_stats.total_questions, 0),
      'total_imports', COALESCE(bank_stats.total_imports, 0),
      'successful_imports', COALESCE(bank_stats.successful_imports, 0),
      'total_imported', COALESCE(bank_stats.total_imported, 0)
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_question_banks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_sources TO authenticated;
GRANT EXECUTE ON FUNCTION validate_question_import(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_question_bank_statistics(UUID) TO authenticated;

-- Add comment for migration tracking
COMMENT ON TABLE public.external_question_banks IS 'Stores information about external question banks and their sources';
COMMENT ON TABLE public.question_bank_imports IS 'Tracks question import jobs and their status';
COMMENT ON TABLE public.question_sources IS 'Links questions to their original external sources';
COMMENT ON FUNCTION validate_question_import(JSONB, UUID) IS 'Validates question data before import';
COMMENT ON FUNCTION get_question_bank_statistics(UUID) IS 'Returns statistics for question banks and imports';