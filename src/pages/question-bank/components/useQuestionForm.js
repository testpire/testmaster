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

// The cascade <Select>s use string option values (id.toString()) and compare
// with strict ===, while the API returns numeric ids. Normalize every id we put
// into the form to a string so the dropdowns actually show the saved selection.
const asId = (v) => (v === null || v === undefined || v === '' ? '' : String(v));

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
  // Free-form labels (array of strings); serialized to a comma-separated string on
  // submit to match CreateQuestionRequestDto.tags.
  tags: [],
  // Ordered self-study hints (array of strings) — CreateQuestionRequestDto.hints.
  // Shown progressively to students in Daily Practice Problems.
  hints: [],
  options: makeBlankOptions(),
  correctIntegerAnswer: '',
  // Numeric-answer questions: the ± margin (blank → 0). And the exact backend type
  // string (INTEGER/NUMERIC/NUMERICAL) preserved when editing so a save never
  // silently downgrades a NUMERIC question to INTEGER. null → new question.
  answerTolerance: '',
  apiQuestionType: null
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

  // Splice an arbitrary snippet into the targeted field at the saved caret
  // (functional update so it reads the freshest text). Shared by the equation
  // and table inserters.
  const spliceIntoActiveField = (snippet) => {
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

  // A matrix / multi-line environment renders correctly only as *display* math
  // ($$…$$): the inline delimiter ($…$) forbids newlines (MathText's MATH_PATTERN)
  // and renders the matrix cramped. So content with a \begin{…} environment or a
  // \\ row break goes in as block; a simple expression (x^2, \frac{…}) stays inline.
  const isBlockLatex = (latex) => /\\begin\{/.test(latex) || /\\\\/.test(latex);
  const insertLatexAtCursor = (latex) =>
    spliceIntoActiveField(isBlockLatex(latex) ? `$$${latex}$$` : `$${latex}$`);

  // Match-list / two-column markdown table scaffold. Blank lines around it keep
  // remark-gfm from gluing the header row onto adjacent prose, and the trailing
  // "Choose the correct answer" line is the standard closer for match questions.
  const MATCH_TABLE_TEMPLATE =
    '\n\n| List-I | List-II |\n' +
    '| --- | --- |\n' +
    '| (A)  | (I)  |\n' +
    '| (B)  | (II)  |\n' +
    '| (C)  | (III)  |\n' +
    '| (D)  | (IV)  |\n\n' +
    'Choose the correct answer from the options given below:\n';

  // A table is block content, so it only belongs in the question text or the
  // explanation (never an option). The caller names the target field; we keep the
  // live caret only when it's already in that field, otherwise append at the end.
  const insertTableAtCursor = (targetField = 'questionText') => {
    const field = targetField === 'explanation' ? 'explanation' : 'questionText';
    if (activeFieldRef.current?.field !== field) {
      activeFieldRef.current = { field, caret: null };
    }
    spliceIntoActiveField(MATCH_TABLE_TEMPLATE);
  };

  // Populate form when editing; reset to blank when opening for a new question.
  useEffect(() => {
    if (editingQuestion && active) {
      const loadedOptions = editingQuestion?.options?.map(opt => opt?.text || opt?.option_text) || [];
      // A stored 'PLAIN' is ambiguous: the list/service normalizes a missing
      // textFormat to 'PLAIN' (QuestionCard does the same), so we can't tell a
      // deliberate plain choice from a default. Trust an explicit 'LATEX'; for
      // anything else, detect from the actual content so a latex question never
      // opens as plain just because its flag wasn't persisted.
      const savedFormat = String(editingQuestion?.textFormat || '').toUpperCase();
      const loadedFormat =
        savedFormat === 'LATEX'
          ? 'LATEX'
          : detectTextFormat(
              editingQuestion?.text || editingQuestion?.question_text || '',
              editingQuestion?.explanation || '',
              ...loadedOptions
            );
      // Pin the format (skip auto re-detect) only for an explicit LATEX save — a
      // pinned PLAIN would stop the content from auto-correcting if it has latex.
      setFormatManual(savedFormat === 'LATEX');
      // Map the backend question type to the form's internal toggle value. The API
      // uses MCQ / INTEGER / NUMERIC / NUMERICAL (camelCase `questionType`); the form
      // models "mcq" vs "integer_type". Reading the wrong (snake_case) key here was
      // why editing a numeric question showed the MCQ options editor.
      const rawType = editingQuestion?.questionType || editingQuestion?.question_type || 'mcq';
      const isNumericType = /integer|numeric/i.test(String(rawType));
      setQuestionData({
        questionText: editingQuestion?.text || editingQuestion?.question_text || '',
        textFormat: loadedFormat,
        questionImagePath: editingQuestion?.questionImagePath || '',
        // Backend already returns a full public URL, so it doubles as the preview.
        questionImagePreview: editingQuestion?.questionImagePath || '',
        questionType: isNumericType ? 'integer_type' : 'mcq',
        subject: asId(editingQuestion?.subjectId ?? editingQuestion?.subject),
        chapter: asId(editingQuestion?.chapterId ?? editingQuestion?.chapter),
        topic: asId(editingQuestion?.topicId ?? editingQuestion?.topic),
        difficultyLevel: editingQuestion?.difficultyLevel || editingQuestion?.difficulty_level || 'EASY',
        marks: editingQuestion?.marks || 4,
        negativeMarks: editingQuestion?.negativeMarks || editingQuestion?.negative_marks || 1,
        explanation: editingQuestion?.explanation || '',
        // tags is a comma-separated string on the API; split into chips. hints is
        // already a string[] — keep its entries (no trim so a deliberate space stays).
        tags: typeof editingQuestion?.tags === 'string'
          ? editingQuestion.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : (Array.isArray(editingQuestion?.tags) ? editingQuestion.tags : []),
        hints: Array.isArray(editingQuestion?.hints)
          ? editingQuestion.hints.filter((h) => h != null)
          : [],
        options: editingQuestion?.options?.length > 0
          ? editingQuestion?.options?.map((opt, i) => ({
              // The API options carry no A/B/C/D label — derive it from position so the
              // badge isn't blank on edit.
              label: opt?.option_label || opt?.label || String.fromCharCode(65 + i),
              text: opt?.text || opt?.option_text || '',
              optionImagePath: opt?.optionImagePath || '',
              optionImagePreview: opt?.optionImagePath || '',
              isCorrect: opt?.isCorrect ?? opt?.is_correct ?? false
            }))
          : makeBlankOptions(),
        // Numeric answer + tolerance from the API fields (correctAnswer/answerTolerance).
        // Kept as strings for the controlled inputs; buildPayload converts to numbers.
        correctIntegerAnswer:
          editingQuestion?.correctAnswer != null
            ? String(editingQuestion.correctAnswer)
            : (editingQuestion?.correct_integer_answer ?? ''),
        answerTolerance:
          editingQuestion?.answerTolerance != null ? String(editingQuestion.answerTolerance) : '',
        // Preserve the exact backend subtype so an edit re-sends INTEGER/NUMERIC as-is.
        apiQuestionType: isNumericType ? rawType : null
      });

      // A question response only carries topicId — not subjectId/chapterId — so
      // the prefill above leaves Subject/Chapter blank, which in turn leaves
      // Topic's options unloaded (it looks blank too). Resolve the path upward
      // from the topic (topic -> chapterId, chapter -> subjectId) and patch it
      // in; the cascade effects below then load the dropdown options.
      const editSubjectId = editingQuestion?.subjectId ?? editingQuestion?.subject;
      const editChapterId = editingQuestion?.chapterId ?? editingQuestion?.chapter;
      const editTopicId = editingQuestion?.topicId ?? editingQuestion?.topic;
      if (editTopicId && (!editSubjectId || !editChapterId)) {
        let cancelled = false;
        (async () => {
          let chapterId = editChapterId;
          let subjectId = editSubjectId;
          if (!chapterId) {
            const { data: topic } = await questionService.getTopicById(editTopicId);
            chapterId = topic?.chapterId ?? '';
          }
          if (!subjectId && chapterId) {
            const { data: chapter } = await questionService.getChapterById(chapterId);
            subjectId = chapter?.subjectId ?? '';
          }
          if (cancelled) return;
          setQuestionData((prev) => ({
            ...prev,
            subject: asId(subjectId) || prev.subject,
            chapter: asId(chapterId) || prev.chapter
          }));
        })();
        return () => {
          cancelled = true;
        };
      }
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
  }, [questionData.subject, active]);

  // Load topics when chapter changes
  useEffect(() => {
    if (questionData.chapter && active) {
      loadTopics(questionData.chapter);
    } else {
      setTopics([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionData.chapter, active]);

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
      // Fetch chapters for the selected subject (flat list, parent-id filtered).
      const { data, error: loadError } = await questionService.getChaptersBySubject(subjectId);
      if (loadError) {
        console.error('❌ Error loading chapters:', loadError);
        setChapters([]);
        return;
      }
      setChapters(data || []);
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
      // Fetch topics for the selected chapter (flat list, parent-id filtered).
      const { data, error: loadError } = await questionService.getTopicsByChapter(chapterId);
      if (loadError) {
        console.error('❌ Error loading topics:', loadError);
        setTopics([]);
        return;
      }
      setTopics(data || []);
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

    if (questionData?.questionType === 'integer_type' && !String(questionData?.correctIntegerAnswer ?? '').trim()) {
      return 'Correct answer is required';
    }

    return null;
  };

  // Build the `/questions` request body from the current form state.
  // `draftMode` (when a boolean) is sent through so the create flow can default a
  // new question to draft, and the edit flow can preserve the question's current
  // publish state instead of accidentally flipping it.
  const buildPayload = ({ instituteId, draftMode } = {}) => {
    const internalType = questionData?.questionType;
    const isNumeric = internalType === 'integer_type';
    // Map the form's internal toggle to the backend enum. For numeric, preserve the
    // exact loaded subtype (INTEGER/NUMERIC/NUMERICAL); default a new one to INTEGER.
    // 'mcq' → 'MCQ'; anything else (e.g. 'subjective') passes through unchanged.
    const apiQuestionType = isNumeric
      ? (questionData?.apiQuestionType || 'INTEGER')
      : internalType === 'mcq'
        ? 'MCQ'
        : internalType;
    const rawAnswer = questionData?.correctIntegerAnswer;
    const rawTolerance = questionData?.answerTolerance;
    return {
      text: questionData?.questionText,
      questionImagePath: questionData?.questionImagePath || '',
      difficultyLevel: questionData?.difficultyLevel?.toUpperCase() || 'EASY',
      topicId: questionData?.topic ? parseInt(questionData?.topic) : null,
      instituteId,
      questionType: apiQuestionType,
      marks: parseInt(questionData?.marks) || 4,
      negativeMarks: parseFloat(questionData?.negativeMarks) || 0,
      textFormat: questionData?.textFormat || 'PLAIN',
      explanation: questionData?.explanation || '',
      // Tags → comma-separated string (API contract); hints → trimmed, empty-dropped
      // string[]. Both always sent so an edit that clears them persists the clear.
      tags: (questionData?.tags || [])
        .map((t) => String(t).trim())
        .filter(Boolean)
        .join(', '),
      hints: (questionData?.hints || [])
        .map((h) => String(h).trim())
        .filter(Boolean),
      ...(typeof draftMode === 'boolean' && { draftMode }),
      // Numeric-answer questions send correctAnswer (+ tolerance); the backend
      // rejects them otherwise ("requires a correctAnswer").
      ...(isNumeric && {
        correctAnswer:
          rawAnswer != null && String(rawAnswer).trim() !== '' ? Number(rawAnswer) : null,
        answerTolerance:
          rawTolerance != null && String(rawTolerance).trim() !== '' ? Number(rawTolerance) : 0
      }),
      ...(questionData?.questionType === 'mcq' && {
        options: questionData?.options?.map((opt, index) => ({
          text: opt?.text || '',
          optionImagePath: opt?.optionImagePath || '',
          isCorrect: opt?.isCorrect || false,
          optionOrder: index + 1
        }))
      })
    };
  };

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
      negativeMarks: prev.negativeMarks,
      // Tags usually carry across a run of related questions (e.g. a DPP set), so
      // keep them; hints are per-question, so they reset with the rest of the content.
      tags: prev.tags
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
    recordCaret, openEquationEditor, insertLatexAtCursor, insertTableAtCursor,
    handleInputChange, handleOptionChange, handleCorrectAnswerChange,
    handleQuestionImageUpload, handleClearQuestionImage,
    handleOptionImageUpload, handleClearOptionImage,
    // logic
    validateForm, buildPayload, resetForm, resetForNextQuestion
  };
}
