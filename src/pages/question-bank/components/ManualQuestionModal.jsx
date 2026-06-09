import React, { useState, useEffect } from 'react';
import { questionService } from '../../../services/questionService';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import MathText, { detectTextFormat } from '../../../components/MathText';

// Mirror the backend allowlist / size cap (app.images.max-size-bytes default = 2 MB).
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const validateImageFile = (file) => {
  if (!file) return 'No file selected';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, WEBP, or GIF images are allowed';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 2 MB or smaller';
  }
  return null;
};

// Reusable image upload control: upload-first flow (file -> S3 -> key + preview url).
const ImageUploadField = ({ previewUrl, uploading, disabled, disabledHint, onFileSelect, onClear }) => {
  const inputRef = React.useRef(null);

  const handleChange = (e) => {
    const file = e?.target?.files?.[0];
    if (file) onFileSelect(file);
    // Reset so selecting the same file again still fires onChange
    if (e?.target) e.target.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef?.current?.click()}
        >
          {uploading ? (
            <span className="flex items-center space-x-1">
              <Icon name="Loader2" size={14} className="animate-spin" />
              <span>Uploading...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <Icon name="Upload" size={14} />
              <span>{previewUrl ? 'Replace image' : 'Upload image'}</span>
            </span>
          )}
        </Button>
        {previewUrl && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={onClear}
          >
            <span className="flex items-center space-x-1">
              <Icon name="Trash2" size={14} />
              <span>Remove</span>
            </span>
          </Button>
        )}
      </div>
      {disabled && disabledHint && (
        <p className="text-xs text-amber-600 mt-1">{disabledHint}</p>
      )}
      {previewUrl && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-40 w-auto rounded-lg border border-border shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
};

const ManualQuestionModal = ({ isOpen, onClose, onQuestionAdded, editingQuestion = null, currentUser = null }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState(null);
  // Tracks whether the teacher manually picked the text format. While false, the
  // format auto-detects from the typed content; a manual toggle pins it.
  const [formatManual, setFormatManual] = useState(false);

  const [questionData, setQuestionData] = useState({
    questionText: '',
    questionImagePath: '',
    questionImagePreview: '',
    questionType: 'mcq',
    subject: '',
    chapter: '',
    topic: '',
    difficultyLevel: 'EASY',
    marks: 4,
    negativeMarks: 1,
    textFormat: 'PLAIN',
    explanation: '',
    options: [
      { label: 'A', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
      { label: 'B', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
      { label: 'C', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
      { label: 'D', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false }
    ],
    correctIntegerAnswer: ''
  });


  // Populate form when editing
  useEffect(() => {
    if (editingQuestion && isOpen) {
      const loadedOptions = editingQuestion?.options?.map(opt => opt?.text || opt?.option_text) || [];
      // Honor an explicitly saved format; otherwise infer from the loaded content.
      const loadedFormat =
        editingQuestion?.textFormat ||
        detectTextFormat(
          editingQuestion?.text || editingQuestion?.question_text || '',
          editingQuestion?.explanation || '',
          ...loadedOptions
        );
      // Pin the format (no auto re-detect) when the question already had one saved.
      setFormatManual(!!editingQuestion?.textFormat);
      setQuestionData({
        questionText: editingQuestion?.text || editingQuestion?.question_text || '',
        textFormat: loadedFormat,
        questionImagePath: editingQuestion?.questionImagePath || '',
        // Backend already returns a full public URL, so it doubles as the preview.
        questionImagePreview: editingQuestion?.questionImagePath || '',
        questionType: editingQuestion?.question_type || 'mcq',
        subject: editingQuestion?.subjectId || editingQuestion?.subject || '',
        chapter: editingQuestion?.chapterId || editingQuestion?.chapter || '',
        topic: editingQuestion?.topicId || editingQuestion?.topic || '',
        difficultyLevel: editingQuestion?.difficultyLevel || editingQuestion?.difficulty_level || 'EASY',
        marks: editingQuestion?.marks || 4,
        negativeMarks: editingQuestion?.negativeMarks || editingQuestion?.negative_marks || 1,
        explanation: editingQuestion?.explanation || '',
        options: editingQuestion?.options?.length > 0
          ? editingQuestion?.options?.map(opt => ({
              label: opt?.option_label || opt?.label,
              text: opt?.text || opt?.option_text,
              optionImagePath: opt?.optionImagePath || '',
              optionImagePreview: opt?.optionImagePath || '',
              isCorrect: opt?.isCorrect || opt?.is_correct
            }))
          : [
              { label: 'A', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
              { label: 'B', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
              { label: 'C', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
              { label: 'D', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false }
            ],
        correctIntegerAnswer: editingQuestion?.correct_integer_answer || ''
      });
    } else if (isOpen && !editingQuestion) {
      // Reset form for new question
      setFormatManual(false);
      setQuestionData({
        questionText: '',
        questionImagePath: '',
        questionImagePreview: '',
        questionType: 'mcq',
        subject: '',
        chapter: '',
        topic: '',
        difficultyLevel: 'EASY',
        marks: 4,
        negativeMarks: 1,
        textFormat: 'PLAIN',
        explanation: '',
        options: [
          { label: 'A', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
          { label: 'B', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
          { label: 'C', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
          { label: 'D', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false }
        ],
        correctIntegerAnswer: ''
      });
    }
  }, [editingQuestion, isOpen]);

  // Load subjects from backend
  useEffect(() => {
    if (isOpen) {
      loadSubjects();
    }
  }, [isOpen]);

  // Load chapters when subject changes
  useEffect(() => {
    if (questionData.subject && isOpen) {
      loadChapters(questionData.subject);
    } else {
      setChapters([]);
      setTopics([]);
    }
  }, [questionData.subject, isOpen]);

  // Load topics when chapter changes
  useEffect(() => {
    if (questionData.chapter && isOpen) {
      loadTopics(questionData.chapter);
    } else {
      setTopics([]);
    }
  }, [questionData.chapter, isOpen]);

  // Auto-detect PLAIN vs LATEX from the typed content until the teacher pins it
  // with the manual toggle. The equality guard prevents a setState loop.
  useEffect(() => {
    if (formatManual) return;
    const optionTexts = (questionData.options || []).map(o => o?.text || '');
    const detected = detectTextFormat(
      questionData.questionText,
      questionData.explanation,
      ...optionTexts
    );
    setQuestionData(prev => (prev.textFormat === detected ? prev : { ...prev, textFormat: detected }));
  }, [questionData.questionText, questionData.explanation, questionData.options, formatManual]);

  const loadSubjects = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await questionService.getSubjects();
      
      if (error) {
        console.error('❌ Error loading subjects:', error);
        setSubjects([]);
        return;
      }
      
      // Extract subjects from nested structure - data is already the subjects array
      const subjectsArray = data || [];
      setSubjects(subjectsArray);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setSubjects([]);
    }
  };

  const loadChapters = async (subjectId) => {
    if (!subjectId) {
      setChapters([]);
      return;
    }

    try {
      setLoadingChapters(true);
      
      // Find the selected subject and extract its chapters
      const selectedSubject = subjects.find(subject => subject.id?.toString() === subjectId?.toString());
      if (selectedSubject && selectedSubject.chapters) {
        setChapters(selectedSubject.chapters);
      } else {
        setChapters([]);
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  const loadTopics = async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }

    try {
      setLoadingTopics(true);
      
      // Find the selected chapter and extract its topics
      const selectedChapter = chapters.find(chapter => chapter.id?.toString() === chapterId?.toString());
      if (selectedChapter && selectedChapter.topics) {
        setTopics(selectedChapter.topics);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleInputChange = (field, value) => {
    setQuestionData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset chapter and topic when subject changes
      if (field === 'subject') {
        newData.chapter = '';
        newData.topic = '';
      }
      
      // Reset topic when chapter changes
      if (field === 'chapter') {
        newData.topic = '';
      }
      
      return newData;
    });
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

  const handleQuestionImageUpload = async (file) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const topicId = questionData?.topic ? parseInt(questionData.topic) : null;
    if (!topicId) {
      setError('Please select a topic before uploading an image');
      return;
    }

    setError('');
    setUploadingQuestionImage(true);
    const { data, error: uploadError } = await questionService.uploadImage(file, topicId, false);
    setUploadingQuestionImage(false);

    if (uploadError) {
      setError(uploadError.message || 'Failed to upload image');
      return;
    }
    setQuestionData(prev => ({
      ...prev,
      questionImagePath: data?.key || '',
      questionImagePreview: data?.url || ''
    }));
  };

  const handleClearQuestionImage = () => {
    setQuestionData(prev => ({ ...prev, questionImagePath: '', questionImagePreview: '' }));
  };

  const handleOptionImageUpload = async (index, file) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const topicId = questionData?.topic ? parseInt(questionData.topic) : null;
    if (!topicId) {
      setError('Please select a topic before uploading an image');
      return;
    }

    setError('');
    setUploadingOptionIndex(index);
    const { data, error: uploadError } = await questionService.uploadImage(file, topicId, true);
    setUploadingOptionIndex(null);

    if (uploadError) {
      setError(uploadError.message || 'Failed to upload image');
      return;
    }
    setQuestionData(prev => ({
      ...prev,
      options: prev?.options?.map((opt, i) =>
        i === index
          ? { ...opt, optionImagePath: data?.key || '', optionImagePreview: data?.url || '' }
          : opt
      )
    }));
  };

  const handleClearOptionImage = (index) => {
    setQuestionData(prev => ({
      ...prev,
      options: prev?.options?.map((opt, i) =>
        i === index ? { ...opt, optionImagePath: '', optionImagePreview: '' } : opt
      )
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
          text: questionData?.questionText,
          questionImagePath: questionData?.questionImagePath || '',
          difficultyLevel: questionData?.difficultyLevel?.toUpperCase() || 'EASY',
          topicId: questionData?.topic ? parseInt(questionData?.topic) : null,
          instituteId: currentUser?.instituteId || userProfile?.instituteId,
          questionType: questionData?.questionType,
          marks: parseInt(questionData?.marks) || 4,
          negativeMarks: parseFloat(questionData?.negativeMarks) || 0,
          textFormat: questionData?.textFormat || 'PLAIN',
          explanation: questionData?.explanation || '',
          ...(questionData?.questionType === 'mcq' && {
            options: questionData?.options?.map((opt, index) => ({
              text: opt?.text || '',
              optionImagePath: opt?.optionImagePath || '',
              isCorrect: opt?.isCorrect || false,
              optionOrder: index + 1
            }))
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Subject *"
                value={questionData?.subject}
                onChange={(value) => handleInputChange('subject', value)}
                options={subjects?.map(subject => ({
                  value: subject?.id?.toString(),
                  label: `${subject?.name}${subject?.code ? ` (${subject?.code})` : ''}`
                })) || []}
                placeholder="Select subject"
                searchable
              />

              <Select
                label="Chapter *"
                value={questionData?.chapter}
                onChange={(value) => handleInputChange('chapter', value)}
                options={chapters?.map(chapter => ({
                  value: chapter?.id?.toString(),
                  label: `${chapter?.name}${chapter?.code ? ` (${chapter?.code})` : ''}`
                })) || []}
                placeholder={loadingChapters ? "Loading chapters..." : "Select chapter"}
                disabled={!questionData?.subject || loadingChapters}
                searchable
              />

              <Select
                label="Topic *"
                value={questionData?.topic}
                onChange={(value) => handleInputChange('topic', value)}
                options={topics?.map(topic => ({
                  value: topic?.id?.toString(),
                  label: `${topic?.name}${topic?.code ? ` (${topic?.code})` : ''}`
                })) || []}
                placeholder={loadingTopics ? "Loading topics..." : "Select topic"}
                disabled={!questionData?.chapter || loadingTopics}
                searchable
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Difficulty Level *"
                value={questionData?.difficultyLevel}
                onChange={(value) => handleInputChange('difficultyLevel', value)}
                options={[
                  { value: 'EASY', label: 'EASY' },
                  { value: 'MEDIUM', label: 'MEDIUM' },
                  { value: 'HARD', label: 'HARD' }
                ]}
              />

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



            {/* Question Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Question Text *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Format:</span>
                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                    {['PLAIN', 'LATEX'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => { setFormatManual(true); handleInputChange('textFormat', fmt); }}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          (questionData?.textFormat || 'PLAIN') === fmt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {fmt === 'PLAIN' ? 'Plain' : 'LaTeX'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea
                value={questionData?.questionText}
                onChange={(e) => handleInputChange('questionText', e?.target?.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                placeholder="Enter the question text here..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(questionData?.textFormat || 'PLAIN') === 'LATEX'
                  ? 'LaTeX mode: wrap inline math in $…$ and block math in $$…$$. Applies to the question, options, and explanation.'
                  : formatManual
                  ? 'Plain text mode.'
                  : 'Format auto-detected from your input — switch manually if needed.'}
              </p>
              {(questionData?.textFormat || 'PLAIN') === 'LATEX' && questionData?.questionText?.trim() && (
                <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
                  <MathText
                    as="div"
                    className="text-sm text-foreground"
                    text={questionData?.questionText}
                    textFormat="LATEX"
                  />
                </div>
              )}
            </div>

            {/* Question Image */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Question Image
              </label>
              <ImageUploadField
                previewUrl={questionData?.questionImagePreview}
                uploading={uploadingQuestionImage}
                disabled={!questionData?.topic}
                disabledHint="Select a topic first to enable image upload"
                onFileSelect={handleQuestionImageUpload}
                onClear={handleClearQuestionImage}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: PNG, JPEG, WEBP or GIF, up to 2 MB
              </p>
            </div>

            {/* MCQ Options */}
            {questionData?.questionType === 'mcq' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Answer Options *
                </label>
                <div className="space-y-4">
                  {questionData?.options?.map((option, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        option?.isCorrect 
                          ? 'border-success bg-success/5 shadow-sm' 
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {/* Option Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="relative">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={option?.isCorrect}
                            onChange={() => handleCorrectAnswerChange(index)}
                            className="w-5 h-5 text-success focus:ring-success border-border cursor-pointer"
                          />
                          {option?.isCorrect && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full flex items-center justify-center">
                              <Icon name="Check" size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-foreground min-w-[24px] bg-muted rounded px-2 py-1">
                            {option?.label}
                          </span>
                          {option?.isCorrect && (
                            <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded-full font-medium">
                              ✓ Correct Answer
                            </span>
                          )}
                        </div>
                        
                        <Input
                          value={option?.text}
                          onChange={(e) => handleOptionChange(index, 'text', e?.target?.value)}
                          placeholder={`Enter text for option ${option?.label}`}
                          className={`flex-1 ${option?.isCorrect ? 'border-success' : ''}`}
                          required
                        />
                      </div>
                      
                      {/* Option Image */}
                      <div className="ml-8">
                        {(questionData?.textFormat || 'PLAIN') === 'LATEX' && option?.text?.trim() && (
                          <div className="mb-2 p-2 rounded border border-border bg-muted/30">
                            <span className="text-xs text-muted-foreground mr-1">Preview:</span>
                            <MathText className="text-sm text-foreground" text={option?.text} textFormat="LATEX" />
                          </div>
                        )}
                        <ImageUploadField
                          previewUrl={option?.optionImagePreview}
                          uploading={uploadingOptionIndex === index}
                          disabled={!questionData?.topic}
                          disabledHint="Select a topic first to enable image upload"
                          onFileSelect={(file) => handleOptionImageUpload(index, file)}
                          onClear={() => handleClearOptionImage(index)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Helper Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        How to mark the correct answer:
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Click the radio button (○) next to the option you want to mark as correct. 
                        The selected option will be highlighted in green with a "✓ Correct Answer" badge.
                      </p>
                    </div>
                  </div>
                </div>
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