import React, { useState, useEffect } from 'react';
import { questionService } from '../../../services/questionService';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ManualQuestionModal = ({ isOpen, onClose, onQuestionAdded, editingQuestion = null }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  const [questionData, setQuestionData] = useState({
    questionText: '',
    questionType: 'mcq',
    subject: 'physics',
    chapterId: '',
    topicId: '',
    difficultyLevel: 'moderate',
    examType: 'jee',
    classLevel: 11,
    marks: 4,
    negativeMarks: 1,
    explanation: '',
    options: [
      { label: 'A', text: '', isCorrect: false },
      { label: 'B', text: '', isCorrect: false },
      { label: 'C', text: '', isCorrect: false },
      { label: 'D', text: '', isCorrect: false }
    ],
    correctIntegerAnswer: '',
    isConceptual: false,
    isTheoretical: false,
    isPyq: false
  });

  // Load chapters when subject changes
  useEffect(() => {
    if (questionData?.subject) {
      loadChapters(questionData?.subject, questionData?.classLevel);
    }
  }, [questionData?.subject, questionData?.classLevel]);

  // Load topics when chapter changes
  useEffect(() => {
    if (questionData?.chapterId) {
      loadTopics(questionData?.chapterId);
    }
  }, [questionData?.chapterId]);

  // Populate form when editing
  useEffect(() => {
    if (editingQuestion && isOpen) {
      setQuestionData({
        questionText: editingQuestion?.question_text || '',
        questionType: editingQuestion?.question_type || 'mcq',
        subject: editingQuestion?.subject || 'physics',
        chapterId: editingQuestion?.chapter_id || '',
        topicId: editingQuestion?.topic_id || '',
        difficultyLevel: editingQuestion?.difficulty_level || 'moderate',
        examType: editingQuestion?.exam_type || 'jee',
        classLevel: editingQuestion?.class_level || 11,
        marks: editingQuestion?.marks || 4,
        negativeMarks: editingQuestion?.negative_marks || 1,
        explanation: editingQuestion?.explanation || '',
        options: editingQuestion?.options?.length > 0 
          ? editingQuestion?.options?.map(opt => ({
              label: opt?.option_label,
              text: opt?.option_text,
              isCorrect: opt?.is_correct
            }))
          : [
              { label: 'A', text: '', isCorrect: false },
              { label: 'B', text: '', isCorrect: false },
              { label: 'C', text: '', isCorrect: false },
              { label: 'D', text: '', isCorrect: false }
            ],
        correctIntegerAnswer: editingQuestion?.correct_integer_answer || '',
        isConceptual: editingQuestion?.is_conceptual || false,
        isTheoretical: editingQuestion?.is_theoretical || false,
        isPyq: editingQuestion?.is_pyq || false
      });
    } else if (isOpen && !editingQuestion) {
      // Reset form for new question
      setQuestionData({
        questionText: '',
        questionType: 'mcq',
        subject: 'physics',
        chapterId: '',
        topicId: '',
        difficultyLevel: 'moderate',
        examType: 'jee',
        classLevel: 11,
        marks: 4,
        negativeMarks: 1,
        explanation: '',
        options: [
          { label: 'A', text: '', isCorrect: false },
          { label: 'B', text: '', isCorrect: false },
          { label: 'C', text: '', isCorrect: false },
          { label: 'D', text: '', isCorrect: false }
        ],
        correctIntegerAnswer: '',
        isConceptual: false,
        isTheoretical: false,
        isPyq: false
      });
    }
  }, [editingQuestion, isOpen]);

  const loadChapters = async (subject, classLevel) => {
    try {
      const { data, error } = await questionService?.getChaptersBySubject(subject, classLevel);
      if (error) {
        console.error('Error loading chapters:', error);
        setChapters([]);
        return;
      }
      setChapters(data || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
      setChapters([]);
    }
  };

  const loadTopics = async (chapterId) => {
    try {
      const { data, error } = await questionService?.getTopicsByChapter(chapterId);
      if (error) {
        console.error('Error loading topics:', error);
        setTopics([]);
        return;
      }
      setTopics(data || []);
    } catch (error) {
      console.error('Error loading topics:', error);
      setTopics([]);
    }
  };

  const handleInputChange = (field, value) => {
    setQuestionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index, field, value) => {
    setQuestionData(prev => ({
      ...prev,
      options: prev?.options?.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const handleCorrectAnswerChange = (index) => {
    setQuestionData(prev => ({
      ...prev,
      options: prev?.options?.map((opt, i) => ({
        ...opt,
        isCorrect: i === index
      }))
    }));
  };

  const validateForm = () => {
    if (!questionData?.questionText?.trim()) {
      return 'Question text is required';
    }

    if (questionData?.questionType === 'mcq') {
      const hasCorrectAnswer = questionData?.options?.some(opt => opt?.isCorrect);
      if (!hasCorrectAnswer) {
        return 'Please mark the correct answer for MCQ questions';
      }
      
      const emptyOptions = questionData?.options?.filter(opt => !opt?.text?.trim());
      if (emptyOptions?.length > 0) {
        return 'All option texts are required for MCQ questions';
      }
    }

    if (questionData?.questionType === 'integer_type' && !questionData?.correctIntegerAnswer?.trim()) {
      return 'Correct integer answer is required';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const questionPayload = {
        questionText: questionData?.questionText,
        questionType: questionData?.questionType,
        subject: questionData?.subject,
        chapterId: questionData?.chapterId || null,
        topicId: questionData?.topicId || null,
        difficultyLevel: questionData?.difficultyLevel,
        examType: questionData?.examType,
        classLevel: questionData?.classLevel,
        marks: parseInt(questionData?.marks),
        negativeMarks: parseFloat(questionData?.negativeMarks),
        explanation: questionData?.explanation,
        isConceptual: questionData?.isConceptual,
        isTheoretical: questionData?.isTheoretical,
        isPyq: questionData?.isPyq,
        createdBy: userProfile?.id,
        ...(questionData?.questionType === 'mcq' && {
          options: questionData?.options?.map((opt, index) => ({
            text: opt?.text,
            label: opt?.label,
            isCorrect: opt?.isCorrect
          }))
        }),
        ...(questionData?.questionType === 'integer_type' && {
          correctIntegerAnswer: parseInt(questionData?.correctIntegerAnswer)
        })
      };

      let result;
      if (editingQuestion) {
        result = await questionService?.updateQuestion(editingQuestion?.id, questionPayload);
      } else {
        result = await questionService?.createQuestion(questionPayload);
      }

      if (result?.error) {
        setError(`Failed to ${editingQuestion ? 'update' : 'create'} question: ${result?.error?.message}`);
        return;
      }

      setSuccess(`Question ${editingQuestion ? 'updated' : 'created'} successfully!`);
      
      // Notify parent component
      if (onQuestionAdded) {
        onQuestionAdded(result?.data);
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);

    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch') 
        ? 'Cannot connect to database. Please check your Supabase connection.'
        : `Error ${editingQuestion ? 'updating' : 'creating'} question: ${error?.message}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card rounded-xl shadow-lg max-w-4xl w-full max-h-[95vh] overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {editingQuestion ? 'Edit Question' : 'Add Manual Question'}
            </h2>
            <p className="text-muted-foreground">
              {editingQuestion ? 'Update the question details' : 'Create a new question manually'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Icon name="X" size={24} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
          <div className="p-6 space-y-6">
            {/* Status Messages */}
            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertCircle" size={16} className="text-error" />
                  <p className="text-error text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <p className="text-success text-sm">{success}</p>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Subject *"
                value={questionData?.subject}
                onChange={(value) => handleInputChange('subject', value)}
                options={[
                  { value: 'physics', label: 'Physics' },
                  { value: 'chemistry', label: 'Chemistry' },
                  { value: 'mathematics', label: 'Mathematics' },
                  { value: 'biology', label: 'Biology' }
                ]}
              />

              <Select
                label="Question Type *"
                value={questionData?.questionType}
                onChange={(value) => handleInputChange('questionType', value)}
                options={[
                  { value: 'mcq', label: 'Multiple Choice' },
                  { value: 'integer_type', label: 'Integer Type' },
                  { value: 'subjective', label: 'Subjective' }
                ]}
              />

              <Select
                label="Difficulty Level *"
                value={questionData?.difficultyLevel}
                onChange={(value) => handleInputChange('difficultyLevel', value)}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'moderate', label: 'Moderate' },
                  { value: 'difficult', label: 'Difficult' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Exam Type *"
                value={questionData?.examType}
                onChange={(value) => handleInputChange('examType', value)}
                options={[
                  { value: 'jee', label: 'JEE' },
                  { value: 'neet', label: 'NEET' },
                  { value: 'cbse', label: 'CBSE' },
                  { value: 'upsc', label: 'UPSC' },
                  { value: 'ssc', label: 'SSC' },
                  { value: 'custom', label: 'Custom' }
                ]}
              />

              <Select
                label="Class Level"
                value={questionData?.classLevel?.toString()}
                onChange={(value) => handleInputChange('classLevel', parseInt(value))}
                options={[
                  { value: '11', label: 'Class 11' },
                  { value: '12', label: 'Class 12' },
                  { value: '13', label: 'Undergraduate' }
                ]}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Marks"
                  type="number"
                  value={questionData?.marks}
                  onChange={(e) => handleInputChange('marks', e?.target?.value)}
                  min="1"
                  max="10"
                />
                <Input
                  label="Negative Marks"
                  type="number"
                  step="0.25"
                  value={questionData?.negativeMarks}
                  onChange={(e) => handleInputChange('negativeMarks', e?.target?.value)}
                  min="0"
                  max="5"
                />
              </div>
            </div>

            {/* Chapter and Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Chapter"
                value={questionData?.chapterId}
                onChange={(value) => handleInputChange('chapterId', value)}
                options={[
                  { value: '', label: 'Select Chapter' },
                  ...chapters?.map(chapter => ({
                    value: chapter?.id,
                    label: chapter?.name
                  }))
                ]}
              />

              <Select
                label="Topic"
                value={questionData?.topicId}
                onChange={(value) => handleInputChange('topicId', value)}
                options={[
                  { value: '', label: 'Select Topic' },
                  ...topics?.map(topic => ({
                    value: topic?.id,
                    label: topic?.name
                  }))
                ]}
              />
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Question Text *
              </label>
              <textarea
                value={questionData?.questionText}
                onChange={(e) => handleInputChange('questionText', e?.target?.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                placeholder="Enter the question text here..."
                required
              />
            </div>

            {/* MCQ Options */}
            {questionData?.questionType === 'mcq' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Answer Options *
                </label>
                <div className="space-y-3">
                  {questionData?.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={option?.isCorrect}
                        onChange={() => handleCorrectAnswerChange(index)}
                        className="w-4 h-4 text-primary focus:ring-primary border-border"
                      />
                      <span className="text-sm font-medium text-foreground min-w-[20px]">
                        {option?.label})
                      </span>
                      <Input
                        value={option?.text}
                        onChange={(e) => handleOptionChange(index, 'text', e?.target?.value)}
                        placeholder={`Option ${option?.label}`}
                        className="flex-1"
                        required
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select the radio button to mark the correct answer
                </p>
              </div>
            )}

            {/* Integer Answer */}
            {questionData?.questionType === 'integer_type' && (
              <div>
                <Input
                  label="Correct Integer Answer *"
                  type="number"
                  value={questionData?.correctIntegerAnswer}
                  onChange={(e) => handleInputChange('correctIntegerAnswer', e?.target?.value)}
                  placeholder="Enter the correct integer answer"
                  required
                />
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={questionData?.explanation}
                onChange={(e) => handleInputChange('explanation', e?.target?.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                placeholder="Provide a detailed explanation of the solution..."
              />
            </div>

            {/* Question Properties */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Question Properties
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={questionData?.isConceptual}
                    onChange={(e) => handleInputChange('isConceptual', e?.target?.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <span className="text-sm text-foreground">Conceptual</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={questionData?.isTheoretical}
                    onChange={(e) => handleInputChange('isTheoretical', e?.target?.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <span className="text-sm text-foreground">Theoretical</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={questionData?.isPyq}
                    onChange={(e) => handleInputChange('isPyq', e?.target?.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <span className="text-sm text-foreground">Previous Year Question</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              * indicates required fields
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    <span>{editingQuestion ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  editingQuestion ? 'Update Question' : 'Add Question'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualQuestionModal;