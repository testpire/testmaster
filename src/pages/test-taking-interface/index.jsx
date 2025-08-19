import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TestHeader from './components/TestHeader';
import QuestionDisplay from './components/QuestionDisplay';
import QuestionPalette from './components/QuestionPalette';
import NavigationControls from './components/NavigationControls';
import SubmitConfirmationModal from './components/SubmitConfirmationModal';
import SecurityAlert from './components/SecurityAlert';
import ReportQuestionModal from './components/ReportQuestionModal';
import TestResults from './components/TestResults';

const TestTakingInterface = () => {
  const navigate = useNavigate();
  
  // Test state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour in seconds
  const [answers, setAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);
  
  // UI state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [securityAlert, setSecurityAlert] = useState({ show: false, type: '' });
  
  // Mock test data
  const testData = {
    id: 'test-001',
    title: 'JEE Main 2024 - Mathematics Mock Test',
    duration: 3600,
    totalQuestions: 30,
    instructions: `This is a practice test for JEE Main Mathematics.\n\nInstructions:\n• Each question carries 4 marks\n• Negative marking: -1 mark for wrong answers\n• No negative marking for unanswered questions\n• Use the question palette to navigate between questions\n• You can mark questions for review\n• Submit the test before time expires`,
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        subject: 'Mathematics',
        chapter: 'Calculus',
        topic: 'Limits and Derivatives',
        difficulty: 'medium',
        marks: 4,
        negativeMarks: 1,
        content: `Find the value of $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$`,
        options: [
          { text: '0', correct: false },
          { text: '1', correct: false },
          { text: '3', correct: true },
          { text: '∞', correct: false }
        ],
        solution: `Using the standard limit $\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$\n\n$\\lim_{x \\to 0} \\frac{\\sin(3x)}{x} = \\lim_{x \\to 0} \\frac{\\sin(3x)}{3x} \\cdot 3 = 1 \\cdot 3 = 3$`,
        correctAnswer: 2
      },
      {
        id: 'q2',
        type: 'integer',
        subject: 'Mathematics',
        chapter: 'Algebra',
        topic: 'Quadratic Equations',
        difficulty: 'easy',
        marks: 4,
        negativeMarks: 0,
        content: `If the roots of the equation $x^2 - 6x + k = 0$ are equal, find the value of k.`,
        solution: `For equal roots, discriminant = 0\n$b^2 - 4ac = 0$\n$(-6)^2 - 4(1)(k) = 0$\n$36 - 4k = 0$\n$k = 9$`,
        correctAnswer: 9
      },
      {
        id: 'q3',
        type: 'mcq',
        subject: 'Mathematics',
        chapter: 'Coordinate Geometry',
        topic: 'Straight Lines',
        difficulty: 'medium',
        marks: 4,
        negativeMarks: 1,
        content: `Find the equation of the line passing through points (2, 3) and (4, 7).`,
        options: [
          { text: 'y = 2x - 1', correct: true },
          { text: 'y = 2x + 1', correct: false },
          { text: 'y = x + 1', correct: false },
          { text: 'y = 3x - 3', correct: false }
        ],
        solution: `Slope = $\\frac{7-3}{4-2} = \\frac{4}{2} = 2$\n\nUsing point-slope form with point (2,3):\n$y - 3 = 2(x - 2)$\n$y - 3 = 2x - 4$\n$y = 2x - 1$`,
        correctAnswer: 0
      },
      {
        id: 'q4',
        type: 'subjective',
        subject: 'Mathematics',
        chapter: 'Calculus',
        topic: 'Integration',
        difficulty: 'hard',
        marks: 4,
        negativeMarks: 0,
        content: `Evaluate the integral: $\\int_0^{\\pi/2} \\sin^2(x) \\cos^2(x) dx$`,
        solution: `Using the identity $\\sin^2(x)\\cos^2(x) = \\frac{1}{4}\\sin^2(2x)$\n\n$\\int_0^{\\pi/2} \\sin^2(x) \\cos^2(x) dx = \\frac{1}{4} \\int_0^{\\pi/2} \\sin^2(2x) dx$\n\nUsing $\\sin^2(u) = \\frac{1-\\cos(2u)}{2}$:\n\n$= \\frac{1}{4} \\int_0^{\\pi/2} \\frac{1-\\cos(4x)}{2} dx$\n\n$= \\frac{1}{8} \\left[x - \\frac{\\sin(4x)}{4}\\right]_0^{\\pi/2}$\n\n$= \\frac{1}{8} \\left[\\frac{\\pi}{2} - 0\\right] = \\frac{\\pi}{16}$`
      },
      {
        id: 'q5',
        type: 'mcq',
        subject: 'Mathematics',
        chapter: 'Trigonometry',
        topic: 'Trigonometric Identities',
        difficulty: 'medium',
        marks: 4,
        negativeMarks: 1,
        content: `If $\\sin(A) + \\sin(B) = \\frac{\\sqrt{3}}{2}$ and $\\cos(A) + \\cos(B) = \\frac{1}{2}$, find $\\cos(A-B)$.`,
        options: [
          { text: '1/2', correct: true },
          { text: '√3/2', correct: false },
          { text: '1', correct: false },
          { text: '0', correct: false }
        ],
        solution: `Squaring both equations:\n$(\\sin A + \\sin B)^2 = \\frac{3}{4}$\n$(\\cos A + \\cos B)^2 = \\frac{1}{4}$\n\nExpanding:\n$\\sin^2 A + \\sin^2 B + 2\\sin A \\sin B = \\frac{3}{4}$\n$\\cos^2 A + \\cos^2 B + 2\\cos A \\cos B = \\frac{1}{4}$\n\nAdding: $2 + 2(\\sin A \\sin B + \\cos A \\cos B) = 1$\n$2 + 2\\cos(A-B) = 1$\n$\\cos(A-B) = -\\frac{1}{2}$`,
        correctAnswer: 0
      }
    ]
  };

  // Add more questions to reach 30
  const allQuestions = [
    ...testData?.questions,
    ...Array.from({ length: 25 }, (_, i) => ({
      id: `q${i + 6}`,
      type: i % 3 === 0 ? 'integer' : i % 3 === 1 ? 'subjective' : 'mcq',
      subject: 'Mathematics',
      chapter: ['Algebra', 'Calculus', 'Geometry', 'Trigonometry']?.[i % 4],
      topic: `Topic ${i + 1}`,
      difficulty: ['easy', 'medium', 'hard']?.[i % 3],
      marks: 4,
      negativeMarks: i % 3 === 0 ? 0 : 1,
      content: `Sample question ${i + 6} content. This is a ${i % 3 === 0 ? 'integer' : i % 3 === 1 ? 'subjective' : 'multiple choice'} question for practice purposes.`,
      ...(i % 3 === 2 && {
        options: [
          { text: `Option A for Q${i + 6}`, correct: i % 4 === 0 },
          { text: `Option B for Q${i + 6}`, correct: i % 4 === 1 },
          { text: `Option C for Q${i + 6}`, correct: i % 4 === 2 },
          { text: `Option D for Q${i + 6}`, correct: i % 4 === 3 }
        ],
        correctAnswer: i % 4
      }),
      ...(i % 3 === 0 && {
        correctAnswer: Math.floor(Math.random() * 100)
      }),
      solution: `Solution for question ${i + 6}. This explains the step-by-step approach to solve this problem.`
    }))
  ];

  // Security monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSecurityAlert({ show: true, type: 'tab-switch' });
      }
    };

    const handleKeyDown = (e) => {
      // Prevent common shortcuts
      if (
        (e?.ctrlKey && (e?.key === 'c' || e?.key === 'v' || e?.key === 'a' || e?.key === 't')) ||
        (e?.altKey && e?.key === 'Tab') ||
        e?.key === 'F12' ||
        (e?.ctrlKey && e?.shiftKey && e?.key === 'I')
      ) {
        e?.preventDefault();
        setSecurityAlert({ show: true, type: 'keyboard-shortcut' });
      }
    };

    const handleContextMenu = (e) => {
      e?.preventDefault();
      setSecurityAlert({ show: true, type: 'right-click' });
    };

    const handleBeforeUnload = (e) => {
      e?.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.';
      return e?.returnValue;
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('resize', handleResize);

    // Initial mobile check
    handleResize();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 && !testCompleted) {
      handleAutoSubmit();
      return;
    }

    if (!testCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, testCompleted]);

  // Auto-save answers
  useEffect(() => {
    if (!testCompleted) {
      const saveInterval = setInterval(() => {
        // Auto-save logic would go here
        console.log('Auto-saving answers...', answers);
      }, 30000); // Save every 30 seconds

      return () => clearInterval(saveInterval);
    }
  }, [answers, testCompleted]);

  const handleAnswerChange = useCallback((answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  }, [currentQuestionIndex]);

  const handleClearResponse = useCallback(() => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers?.[currentQuestionIndex];
      return newAnswers;
    });
  }, [currentQuestionIndex]);

  const handleMarkForReview = useCallback(() => {
    setMarkedQuestions(prev => {
      if (prev?.includes(currentQuestionIndex)) {
        return prev?.filter(q => q !== currentQuestionIndex);
      }
      return [...prev, currentQuestionIndex];
    });
  }, [currentQuestionIndex]);

  const handleQuestionSelect = useCallback((index) => {
    setCurrentQuestionIndex(index);
  }, []);

  const handleNavigation = useCallback((direction) => {
    if (direction === 'next' && currentQuestionIndex < allQuestions?.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'previous' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex, allQuestions?.length]);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen operation failed:', error);
    }
  }, []);

  const handleAutoSubmit = useCallback(() => {
    // Auto-submit when time expires
    handleSubmitTest(true);
  }, []);

  const handleSubmitTest = useCallback((autoSubmit = false) => {
    if (!autoSubmit && !testCompleted) {
      setShowSubmitModal(true);
      return;
    }

    // Process submission
    const submissionInfo = {
      testId: testData?.id,
      answers,
      markedQuestions,
      timeSpent: testData?.duration - timeRemaining,
      submissionTime: new Date()?.toISOString(),
      autoSubmitted: autoSubmit,
      questions: allQuestions // Include questions for results calculation
    };

    console.log('Test submitted:', submissionInfo);
    
    setSubmissionData(submissionInfo);
    setTestCompleted(true);
    
  }, [answers, markedQuestions, timeRemaining, testData, allQuestions, testCompleted]);

  const handleConfirmSubmit = useCallback(() => {
    setShowSubmitModal(false);
    handleSubmitTest(true);
  }, [handleSubmitTest]);

  const handleReportQuestion = useCallback(() => {
    setShowReportModal(true);
  }, []);

  const handleSubmitReport = useCallback(async (reportData) => {
    console.log('Question reported:', reportData);
    // Here you would send the report to your backend
    setShowReportModal(false);
  }, []);

  const handleRetakeTest = useCallback(() => {
    // Reset all test state
    setTestCompleted(false);
    setSubmissionData(null);
    setCurrentQuestionIndex(0);
    setTimeRemaining(testData?.duration);
    setAnswers({});
    setMarkedQuestions([]);
    setShowSubmitModal(false);
  }, [testData?.duration]);

  const getAnsweredQuestions = () => {
    return Object.keys(answers)?.map(Number);
  };

  const getTestStats = () => {
    const answeredQuestions = getAnsweredQuestions();
    return {
      totalQuestions: allQuestions?.length,
      answeredQuestions: answeredQuestions?.length,
      markedQuestions: markedQuestions?.length,
      unansweredQuestions: allQuestions?.length - answeredQuestions?.length
    };
  };

  const currentQuestion = allQuestions?.[currentQuestionIndex];

  // Show results screen if test is completed
  if (testCompleted && submissionData) {
    return (
      <TestResults
        testData={testData}
        submissionData={submissionData}
        onRetakeTest={handleRetakeTest}
        onBackToDashboard={() => navigate('/student-dashboard')}
        onViewDetailedAnalysis={() => console.log('View detailed analysis')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Test Header */}
      <TestHeader
        testTitle={testData?.title}
        timeRemaining={timeRemaining}
        onSubmitTest={() => setShowSubmitModal(true)}
        onReportQuestion={handleReportQuestion}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={allQuestions?.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />
      {/* Main Content */}
      <div className="pt-16 pb-20 flex">
        {/* Question Display */}
        <div className={`flex-1 p-4 ${!isMobile ? 'mr-80' : ''}`}>
          <QuestionDisplay
            question={currentQuestion}
            selectedAnswer={answers?.[currentQuestionIndex]}
            onAnswerChange={handleAnswerChange}
            onClearResponse={handleClearResponse}
            onMarkForReview={handleMarkForReview}
            isMarkedForReview={markedQuestions?.includes(currentQuestionIndex)}
            questionNumber={currentQuestionIndex + 1}
          />
        </div>

        {/* Question Palette */}
        <QuestionPalette
          questions={allQuestions}
          currentQuestionIndex={currentQuestionIndex}
          answeredQuestions={getAnsweredQuestions()}
          markedQuestions={markedQuestions}
          onQuestionSelect={handleQuestionSelect}
          isMobile={isMobile}
          isOpen={showPalette}
          onToggle={() => setShowPalette(!showPalette)}
        />
      </div>
      {/* Navigation Controls */}
      <NavigationControls
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={allQuestions?.length}
        onPrevious={() => handleNavigation('previous')}
        onNext={() => handleNavigation('next')}
        onTogglePalette={() => setShowPalette(!showPalette)}
        isMobile={isMobile}
        showPaletteToggle={isMobile}
      />
      {/* Submit Confirmation Modal */}
      <SubmitConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleConfirmSubmit}
        testStats={getTestStats()}
        timeRemaining={timeRemaining}
      />
      {/* Report Question Modal */}
      <ReportQuestionModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
        questionNumber={currentQuestionIndex + 1}
        questionContent={currentQuestion?.content || ''}
      />
      {/* Security Alert */}
      <SecurityAlert
        isVisible={securityAlert?.show}
        alertType={securityAlert?.type}
        onDismiss={() => setSecurityAlert({ show: false, type: '' })}
        autoHide={true}
        autoHideDelay={5000}
      />
    </div>
  );
};

export default TestTakingInterface;