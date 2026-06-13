import { useState, useEffect, useRef } from 'react';
import { questionService } from '../../../services/questionService';
import { detectTextFormat } from '../../../components/MathText';

// Mirror the backend allowlist / size cap (app.images.max-size-bytes default = 2 MB).
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const validateImageFile = (file) => {
  if (!file) return 'No file selected';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, WEBP, or GIF images are allowed';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 2 MB or smaller';
  }
  return null;
};

const makeBlankOptions = () => [
  { label: 'A', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
  { label: 'B', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
  { label: 'C', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false },
  { label: 'D', text: '', optionImagePath: '', optionImagePreview: '', isCorrect: false }
];

const makeBlankQuestion = () => ({
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
  options: makeBlankOptions(),
  correctIntegerAnswer: ''
});

/**
 * Shared question-form logic for both the single-question modal and the
 * multi-question add page. Owns all field state, the Subject→Chapter→Topic
 * cascade, image upload, LaTeX auto-detection, the equation editor wiring,
 * validation, and payload building. Consumers own their own submit lifecycle
 * (the modal closes on success; the page appends + resets for the next entry).
 *
 * @param {object}  params
 * @param {object}  params.currentUser     resolved user (profile || user)
 * @param {object}  [params.editingQuestion] when set, hydrates the form for editing
 * @param {boolean} params.active           gates data loads (modal: isOpen; page: true)
 */
export function useQuestionForm({ currentUser, editingQuestion = null, active }) {
  const [error, setError] = useState('');
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

  // Equation editor state. `activeField` records the last-focused text field and
  // caret position so an inserted equation lands where the author was typing.
  // field is 'questionText' | 'explanation' | <option index>.
  const [editorOpen, setEditorOpen] = useState(false);
  const activeFieldRef = useRef({ field: 'questionText', caret: null });

  const [questionData, setQuestionData] = useState(makeBlankQuestion);

  const recordCaret = (field) => (e) => {
    activeFieldRef.current = { field, caret: e?.target?.selectionStart ?? null };
  };

  const openEquationEditor = (field) => {
    // Keep the recorded caret only if it belongs to the field being targeted;
    // otherwise insert at the end of that field's current text.
    if (activeFieldRef.current?.field !== field) {
      activeFieldRef.current = { field, caret: null };
    }
    setEditorOpen(true);
  };

  // Splice `$latex$` into the targeted field at the saved caret (functional
  // update so it reads the freshest text).
  const insertLatexAtCursor = (latex) => {
    const snippet = `$${latex}$`;
    const { field, caret } = activeFieldRef.current || { field: 'questionText', caret: null };
    const splice = (text) => {
      const current = text || '';
      const pos = caret == null ? current.length : Math.min(caret, current.length);
      return current.slice(0, pos) + snippet + current.slice(pos);
    };
    setQuestionData((prev) => {
      if (field === 'questionText' || field === 'explanation') {
        return { ...prev, [field]: splice(prev[field]) };
      }
      if (typeof field === 'number') {
        return {
          ...prev,
          options: prev.options.map((opt, i) => (i === field ? { ...opt, text: splice(opt.text) } : opt)),
        };
      }
      return prev;
    });
  };

  // Populate form when editing; reset to blank when opening for a new question.
  useEffect(() => {
    if (editingQuestion && active) {
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
          : makeBlankOptions(),
        correctIntegerAnswer: editingQuestion?.correct_integer_answer || ''
      });
    } else if (active && !editingQuestion) {
      // Reset form for new question
      setFormatManual(false);
      setQuestionData(makeBlankQuestion());
    }
  }, [editingQuestion, active]);

  // Load subjects from backend
  useEffect(() => {
    if (active) {
      loadSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Load chapters when subject changes
  useEffect(() => {
    if (questionData.subject && active) {
      loadChapters(questionData.subject);
    } else {
      setChapters([]);
      setTopics([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionData.subject, active, subjects]);

  // Load topics when chapter changes
  useEffect(() => {
    if (questionData.chapter && active) {
      loadTopics(questionData.chapter);
    } else {
      setTopics([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionData.chapter, active, chapters]);

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
      const { data, error: loadError } = await questionService.getSubjects();

      if (loadError) {
        console.error('❌ Error loading subjects:', loadError);
        setSubjects([]);
        return;
      }

      // Extract subjects from nested structure - data is already the subjects array
      setSubjects(data || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
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
      setChapters(selectedSubject?.chapters || []);
    } catch (err) {
      console.error('Error loading chapters:', err);
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
      setTopics(selectedChapter?.topics || []);
    } catch (err) {
      console.error('Error loading topics:', err);
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

  // Build the `/questions` request body from the current form state.
  const buildPayload = ({ instituteId } = {}) => ({
    text: questionData?.questionText,
    questionImagePath: questionData?.questionImagePath || '',
    difficultyLevel: questionData?.difficultyLevel?.toUpperCase() || 'EASY',
    topicId: questionData?.topic ? parseInt(questionData?.topic) : null,
    instituteId,
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
  });

  // Full reset (used when starting fresh).
  const resetForm = () => {
    setFormatManual(false);
    setError('');
    setQuestionData(makeBlankQuestion());
  };

  // Reset for the next entry while keeping the classification context (Subject/
  // Chapter/Topic/type/difficulty/marks) — even with mixed topics, consecutive
  // questions often share these, and they're a click away to change.
  const resetForNextQuestion = () => {
    setFormatManual(false);
    setError('');
    setQuestionData(prev => ({
      ...makeBlankQuestion(),
      subject: prev.subject,
      chapter: prev.chapter,
      topic: prev.topic,
      questionType: prev.questionType,
      difficultyLevel: prev.difficultyLevel,
      marks: prev.marks,
      negativeMarks: prev.negativeMarks
    }));
  };

  return {
    // state
    error, setError,
    subjects, chapters, topics,
    loadingChapters, loadingTopics,
    uploadingQuestionImage, uploadingOptionIndex,
    formatManual, setFormatManual,
    editorOpen, setEditorOpen,
    questionData, setQuestionData,
    // handlers
    recordCaret, openEquationEditor, insertLatexAtCursor,
    handleInputChange, handleOptionChange, handleCorrectAnswerChange,
    handleQuestionImageUpload, handleClearQuestionImage,
    handleOptionImageUpload, handleClearOptionImage,
    // logic
    validateForm, buildPayload, resetForm, resetForNextQuestion
  };
}
