// Registry of the CSV bulk-upload formats the Question Bank supports.
//
// This is the single source of truth for "what kinds of question CSV can I
// upload?". Each entry drives the Bulk Import modal end-to-end: the type
// picker, the column list shown to the user, the downloadable sample template,
// and the backend endpoint the file is posted to.
//
// Adding a new question type in the future = add one object to UPLOAD_TYPES.
// Nothing else in the modal needs to change.

// Minimal CSV serializer. Quotes any cell containing a comma, quote or newline
// and doubles embedded quotes, per RFC 4180. Uses CRLF line endings so the file
// opens cleanly in Excel as well as any CSV parser.
const escapeCell = (value) => {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');

// Fallback for the Topic ID column when we couldn't fetch a real topic code from
// the user's institute (e.g. the institute has no topics yet). The backend
// resolves this column as a topic *code* (not a numeric id), so an unknown value
// fails loudly ("Topic code ... does not exist") rather than importing anywhere.
export const TOPIC_CODE_FALLBACK = 'REPLACE_WITH_YOUR_TOPIC_CODE';

// Columns every row must be checked/edited for before upload, whatever the type.
const COMMON_EDIT_COLUMNS = [
  {
    name: 'Question Id',
    note: 'Your own reference id for each row. Must be unique for each question',
  },
  {
    name: 'Topic ID',
    note: 'A Topic code that exists for your institute',
  },
];

// ---- Multiple Choice (MCQ) -------------------------------------------------

const MCQ_HEADERS = [
  'Question Id', 'Question Text', 'Question Image URL', 'Difficulty Level',
  'Question Type', 'Marks', 'Negative Marks', 'Explanation', 'Topic ID',
  'Text Format', 'Tags', 'Hints',
  'Option1 Text', 'Option1 Image URL', 'Option1 IsCorrect',
  'Option2 Text', 'Option2 Image URL', 'Option2 IsCorrect',
  'Option3 Text', 'Option3 Image URL', 'Option3 IsCorrect',
  'Option4 Text', 'Option4 Image URL', 'Option4 IsCorrect',
];

// Rows are built around a topic code so the sample can be pre-filled with a real,
// existing topic from the user's institute (otherwise the un-edited sample fails
// on upload with "Topic code ... does not exist").
const buildMcqRows = (topic) => [
  [
    'Q1', 'What is the SI unit of force?', '', 'EASY', 'MCQ', '1', '0',
    'Force is measured in newtons (N).', topic, 'PLAIN',
    'WBJEE 2021', "Recall Newton's second law F=ma",
    'Newton', '', 'true', 'Joule', '', 'false', 'Pascal', '', 'false', 'Watt', '', 'false',
  ],
  [
    'Q2', 'If mass $m = 2$ kg and velocity $v = 3$ m/s, the kinetic energy $KE = (1/2)mv^2$ equals:',
    '', 'MEDIUM', 'MCQ', '2', '0', 'KE = (1/2)(2)(3^2) = 9 J', topic, 'LATEX',
    'IIT-JEE 2022, WBJEE 2023', 'Substitute m and v into the formula',
    '$9$ J', '', 'true', '$6$ J', '', 'false', '$12$ J', '', 'false', '$3$ J', '', 'false',
  ],
  [
    'Q3', 'Which law governs the electrostatic force between two point charges?',
    '', 'HARD', 'MCQ', '4', '1', "Coulomb's law: F = k q1 q2 / r^2.", topic, 'PLAIN',
    'IIT-JEE 2020', '',
    "Coulomb's Law", '', 'true', "Ohm's Law", '', 'false', "Lenz's Law", '', 'false', "Faraday's Law", '', 'false',
  ],
  // Matrix example — a LaTeX matrix written on a single line ($$…$$ block math,
  // & between columns, \\ between rows). Text Format must be LATEX for it to render.
  [
    'Q4', 'Find the determinant of the matrix $$\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$$',
    '', 'MEDIUM', 'MCQ', '4', '1', 'det = (1)(4) - (2)(3) = -2', topic, 'LATEX',
    'WBJEE 2022', 'Determinant of a 2x2 matrix is ad - bc',
    '$-2$', '', 'true', '$2$', '', 'false', '$10$', '', 'false', '$-10$', '', 'false',
  ],
];

// ---- Numeric / Integer -----------------------------------------------------

const NUMERIC_HEADERS = [
  'Question Id', 'Question Text', 'Question Image URL', 'Difficulty Level',
  'Question Type', 'Marks', 'Negative Marks', 'Explanation', 'Topic ID',
  'Text Format', 'Tags', 'Hints',
  'Correct Answer', 'Answer Tolerance',
];

const buildNumericRows = (topic) => [
  [
    'N1', 'How many moles are present in 12 g of carbon-12?', '', 'EASY', 'INTEGER',
    '4', '1', '12 g of carbon-12 is by definition exactly 1 mole.', topic, 'PLAIN',
    'WBJEE 2022', 'Use n = mass / molar mass', '1', '0',
  ],
  [
    'N2', 'A particle starts from rest and accelerates at 2 m/s^2. What distance (in metres) does it cover in 3 s?',
    '', 'EASY', 'INTEGER', '4', '1', 's = ut + (1/2)at^2 = 9 m.', topic, 'PLAIN',
    'JEE Main 2021', 'Use s = ut + (1/2)at^2|Initial velocity u = 0', '9', '0',
  ],
  [
    'N3', 'The pH of a $10^{-3}$ M HCl solution is:', '', 'MEDIUM', 'NUMERIC',
    '4', '1', 'pH = -log(10^-3) = 3.', topic, 'LATEX',
    'IIT-JEE 2023', 'pH = -log[H+]', '3', '0.05',
  ],
  // Matrix example — a LaTeX matrix written on a single line ($$…$$ block math,
  // & between columns, \\ between rows). Text Format must be LATEX for it to render.
  [
    'N4', 'Find the determinant of the matrix $$\\begin{bmatrix} 2 & 0 \\\\ 0 & 3 \\end{bmatrix}$$',
    '', 'MEDIUM', 'NUMERIC', '4', '1',
    'For a diagonal matrix the determinant is the product of the diagonal entries: 2 x 3 = 6.',
    topic, 'LATEX', 'IIT-JEE 2022, WBJEE 2023', 'Determinant of a diagonal matrix is the product of its diagonal entries',
    '6', '0',
  ],
];

export const UPLOAD_TYPES = [
  {
    key: 'mcq',
    label: 'Multiple Choice',
    shortLabel: 'MCQ',
    icon: 'ListChecks',
    // Kept as the default so callers that don't specify a type behave exactly as before.
    endpoint: '/questions/bulk-upload',
    tagline: 'Options with one correct answer',
    description:
      'Standard questions with up to four options (Option1–Option4), each marked IsCorrect true/false.',
    sampleFileName: 'sample-mcq-questions.csv',
    headers: MCQ_HEADERS,
    editColumns: COMMON_EDIT_COLUMNS,
    // Extra guidance specific to this format.
    notes: [
      'Question Type should be MCQ.',
      'Mark exactly the correct option(s) with IsCorrect = true; the rest false.',
      "Leave option columns blank for options you don't need (2–4 options supported).",
      'Tags mark previous-year exams the question appeared in — comma-separated, e.g. IIT-JEE 2022, WBJEE 2023. Leave blank if it has not appeared before.',
      'Matrices are supported: write them on one line as $$\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$$ — use & between columns and \\\\ between rows — and set Text Format to LATEX.',
    ],
    buildRows: buildMcqRows,
  },
  {
    key: 'numeric',
    label: 'Numeric / Integer',
    shortLabel: 'Numeric',
    icon: 'Hash',
    endpoint: '/questions/bulk-upload/numeric',
    tagline: 'Answer is a number',
    description:
      'The student types a number, graded against Correct Answer ± Answer Tolerance. No options — the row ends with Correct Answer and Answer Tolerance.',
    sampleFileName: 'sample-numeric-questions.csv',
    headers: NUMERIC_HEADERS,
    editColumns: COMMON_EDIT_COLUMNS,
    notes: [
      'Question Type must be one of INTEGER, NUMERIC, or NUMERICAL.',
      'Correct Answer is the accepted numeric value.',
      'Answer Tolerance is the ± margin (use 0 for an exact match).',
      'Tags mark previous-year exams the question appeared in — comma-separated, e.g. IIT-JEE 2022, WBJEE 2023. Leave blank if it has not appeared before.',
      'Matrices are supported: write them on one line as $$\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$$ — use & between columns and \\\\ between rows — and set Text Format to LATEX.',
    ],
    buildRows: buildNumericRows,
  },
];

export const DEFAULT_UPLOAD_TYPE_KEY = 'mcq';

export const getUploadType = (key) =>
  UPLOAD_TYPES.find((t) => t.key === key) || UPLOAD_TYPES[0];

// Build a sample CSV string for a type, filling the Topic ID column with a real
// topic code from the user's institute (so it uploads as-is) or the fallback
// placeholder when none is available.
export const buildSampleCsv = (uploadType, topicCode) => {
  const topic = topicCode || TOPIC_CODE_FALLBACK;
  return toCsv(uploadType.headers, uploadType.buildRows(topic));
};

// Trigger a browser download of a type's sample CSV template.
export const downloadSampleCsv = (uploadType, topicCode) => {
  const blob = new Blob([buildSampleCsv(uploadType, topicCode)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = uploadType.sampleFileName;
  a.click();
  URL.revokeObjectURL(url);
};
