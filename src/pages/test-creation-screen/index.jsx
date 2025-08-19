import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationHeader from '../../components/ui/NavigationHeader';
import RoleBasedNavigation from '../../components/ui/RoleBasedNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import FilterPanel from './components/FilterPanel';
import QuestionCard from './components/QuestionCard';
import TestMetadataPanel from './components/TestMetadataPanel';
import TestStatsSidebar from './components/TestStatsSidebar';
import QuestionBankModal from './components/QuestionBankModal';
import ManualQuestionModal from './components/ManualQuestionModal';
import BulkImportModal from './components/BulkImportModal';

const TestCreationScreen = () => {
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  const [isStatsSidebarVisible, setIsStatsSidebarVisible] = useState(true);
  const [isQuestionBankModalOpen, setIsQuestionBankModalOpen] = useState(false);
  const [isManualQuestionModalOpen, setIsManualQuestionModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');

  // Test data state
  const [testMetadata, setTestMetadata] = useState({
    title: '',
    description: '',
    duration: 180,
    totalMarks: 300,
    passingMarks: 120,
    negativeMarking: 1,
    examPattern: 'jee-main',
    difficultyDistribution: 'balanced',
    randomizeQuestions: false,
    randomizeOptions: false,
    allowReview: true,
    showResults: true,
    instructions: 'Read all questions carefully before attempting. Manage your time effectively.'
  });

  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    topic: '',
    difficulty: [],
    questionTypes: []
  });

  const [selectedQuestions, setSelectedQuestions] = useState([
    {
      id: 'q_001',
      content: `A particle moves in a straight line with constant acceleration. If it covers 20m in the first 2 seconds and 60m in the next 4 seconds, find the initial velocity and acceleration.`,
      type: 'mcq',
      difficulty: 'moderate',
      subject: 'physics',
      chapter: 'mechanics',
      topic: 'kinematics',
      marks: 4,
      estimatedTime: 3,
      negativeMarks: 1,
      options: [
        { text: 'u = 5 m/s, a = 5 m/s²', isCorrect: true },
        { text: 'u = 10 m/s, a = 2.5 m/s²', isCorrect: false },
        { text: 'u = 2.5 m/s, a = 7.5 m/s²', isCorrect: false },
        { text: 'u = 7.5 m/s, a = 2.5 m/s²', isCorrect: false }
      ]
    },
    {
      id: 'q_002',
      content: `Calculate the pH of a solution formed by mixing 100 mL of 0.1 M HCl with 50 mL of 0.2 M NaOH.`,
      type: 'integer',
      difficulty: 'tough',
      subject: 'chemistry',
      chapter: 'acids-bases',
      topic: 'ph-calculations',
      marks: 4,
      estimatedTime: 4,
      negativeMarks: 1,
      answer: '7'
    },
    {
      id: 'q_003',
      content: `Find the value of k for which the quadratic equation kx² + 4x + 1 = 0 has real and equal roots.`,
      type: 'mcq',
      difficulty: 'easy',
      subject: 'mathematics',
      chapter: 'quadratic-equations',
      topic: 'discriminant',
      marks: 4,
      estimatedTime: 2,
      negativeMarks: 1,
      options: [
        { text: 'k = 4', isCorrect: true },
        { text: 'k = 2', isCorrect: false },
        { text: 'k = 1', isCorrect: false },
        { text: 'k = 8', isCorrect: false }
      ]
    }
  ]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (testMetadata?.title || selectedQuestions?.length > 0) {
        setAutoSaveStatus('saving');
        
        // Simulate auto-save
        setTimeout(() => {
          setAutoSaveStatus('saved');
        }, 1000);
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [testMetadata, selectedQuestions]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    navigate('/login-screen');
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    // In a real app, this would fetch filtered questions from the backend
    console.log('Applying filters:', filters);
  };

  const handleClearFilters = () => {
    setFilters({
      subject: '',
      chapter: '',
      topic: '',
      difficulty: [],
      questionTypes: []
    });
  };

  const handleMetadataChange = (newMetadata) => {
    setTestMetadata(newMetadata);
  };

  const handleQuestionEdit = (question) => {
    // In a real app, this would open a question editor modal
    console.log('Editing question:', question);
  };

  const handleQuestionRemove = (index) => {
    setSelectedQuestions(prev => prev?.filter((_, i) => i !== index));
  };

  const handleQuestionReplace = (question) => {
    // In a real app, this would open a replacement question selector
    console.log('Replacing question:', question);
  };

  const handleQuestionMoveUp = (index) => {
    if (index > 0) {
      setSelectedQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index - 1], newQuestions[index]] = [newQuestions?.[index], newQuestions?.[index - 1]];
        return newQuestions;
      });
    }
  };

  const handleQuestionMoveDown = (index) => {
    if (index < selectedQuestions?.length - 1) {
      setSelectedQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions?.[index + 1], newQuestions?.[index]];
        return newQuestions;
      });
    }
  };

  const handleAddQuestionsFromBank = (questions) => {
    setSelectedQuestions(prev => [...prev, ...questions]);
  };

  const handleManualQuestionAdded = (question) => {
    // Transform the question to match the expected format
    const transformedQuestion = {
      id: question?.id,
      content: question?.question_text,
      type: question?.question_type,
      difficulty: question?.difficulty_level,
      subject: question?.subject,
      chapter: question?.chapter?.name || 'Unknown Chapter',
      topic: question?.topic?.name || 'Unknown Topic',
      marks: question?.marks || 4,
      estimatedTime: Math.ceil(question?.marks / 2) || 2,
      negativeMarks: question?.negative_marks || 0,
      explanation: question?.explanation,
      ...(question?.question_type === 'mcq' && question?.options && {
        options: question?.options?.map((option) => ({
          text: option?.option_text,
          isCorrect: option?.is_correct
        })),
        correctAnswer: question?.options?.findIndex(option => option?.is_correct) || 0
      }),
      ...(question?.question_type === 'integer_type' && {
        correctAnswer: question?.correct_integer_answer || 0
      })
    };

    setSelectedQuestions(prev => [...prev, transformedQuestion]);
  };

  const handleBulkQuestionsImported = (importedQuestions) => {
    // Convert imported questions to the format expected by the test creation screen
    const formattedQuestions = importedQuestions?.map((question) => ({
      id: question?.id,
      content: question?.question_text,
      type: question?.question_type,
      difficulty: question?.difficulty_level,
      subject: question?.subject,
      chapter: question?.chapter?.name || 'Unknown Chapter',
      topic: question?.topic?.name || 'Unknown Topic',
      marks: question?.marks || 4,
      estimatedTime: Math.ceil((question?.marks || 4) / 2),
      negativeMarks: question?.negative_marks || 0,
      explanation: question?.explanation,
      // Add options if they exist
      ...(question?.options && {
        options: question?.options?.map((option) => ({
          text: option?.option_text,
          isCorrect: option?.is_correct
        }))
      })
    }));

    // Add to selected questions
    setSelectedQuestions(prev => [...prev, ...formattedQuestions]);
  };

  const handleSaveDraft = () => {
    setAutoSaveStatus('saving');
    setTimeout(() => {
      setAutoSaveStatus('saved');
      // Show success message
    }, 1000);
  };

  const handlePreviewTest = () => {
    // In a real app, this would open a test preview modal
    console.log('Previewing test with metadata:', testMetadata, 'and questions:', selectedQuestions);
  };

  const handlePublishTest = () => {
    if (!testMetadata?.title) {
      alert('Please enter a test title before publishing');
      return;
    }
    
    if (selectedQuestions?.length === 0) {
      alert('Please add at least one question before publishing');
      return;
    }

    setAutoSaveStatus('saving');
    setTimeout(() => {
      setAutoSaveStatus('saved');
      alert('Test published successfully!');
      // In a real app, navigate to test management or dashboard
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader
        userRole="teacher"
        userName="Dr. Priya Sharma"
        userAvatar="https://randomuser.me/api/portraits/women/32.jpg"
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
        showMenuToggle={true}
        notifications={3}
      />
      {/* Role-based Navigation */}
      <RoleBasedNavigation
        userRole="teacher"
        activeRoute="/test-creation-screen"
        onNavigate={handleNavigation}
        isCollapsed={false}
        isMobile={window.innerWidth < 1024}
        isOpen={isMobileNavOpen}
        onToggle={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />
      {/* Main Content */}
      <div className="lg:ml-64 pt-16">
        {/* Test Metadata Panel */}
        <TestMetadataPanel
          metadata={testMetadata}
          onMetadataChange={handleMetadataChange}
          onSave={handleSaveDraft}
          onPreview={handlePreviewTest}
          onPublish={handlePublishTest}
          autoSaveStatus={autoSaveStatus}
          isPublished={false}
        />

        {/* Main Workspace */}
        <div className="flex h-[calc(100vh-12rem)]">
          {/* Filter Panel */}
          <div className={`${isFilterPanelCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 hidden lg:block`}>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isCollapsed={isFilterPanelCollapsed}
              onToggleCollapse={() => setIsFilterPanelCollapsed(!isFilterPanelCollapsed)}
            />
          </div>

          {/* Mobile Filter Panel */}
          <div className="lg:hidden">
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isCollapsed={true}
              onToggleCollapse={() => setIsFilterPanelCollapsed(!isFilterPanelCollapsed)}
            />
          </div>

          {/* Questions Workspace */}
          <div className={`flex-1 ${isStatsSidebarVisible ? 'mr-80' : ''} transition-all duration-300`}>
            <div className="h-full overflow-y-auto p-6">
              {/* Workspace Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-foreground">Test Questions</h1>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {selectedQuestions?.length} Questions
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuestionBankModalOpen(true)}
                    iconName="Database"
                    iconPosition="left"
                  >
                    Question Bank
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBulkImportModalOpen(true)}
                    iconName="Upload"
                    iconPosition="left"
                  >
                    Bulk Import
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsManualQuestionModalOpen(true)}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Add Manual Question
                  </Button>
                </div>
              </div>

              {/* Questions List */}
              {selectedQuestions?.length === 0 ? (
                <div className="text-center py-16">
                  <Icon name="FileText" size={64} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Questions Added</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Start building your test by adding questions from the question bank, bulk importing from files, or create new ones manually.
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <Button
                      variant="primary"
                      onClick={() => setIsQuestionBankModalOpen(true)}
                      iconName="Database"
                      iconPosition="left"
                    >
                      Browse Question Bank
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsBulkImportModalOpen(true)}
                      iconName="Upload"
                      iconPosition="left"
                    >
                      Bulk Import Questions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsManualQuestionModalOpen(true)}
                      iconName="Plus"
                      iconPosition="left"
                    >
                      Create New Question
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedQuestions?.map((question, index) => (
                    <QuestionCard
                      key={question?.id}
                      question={question}
                      index={index}
                      onEdit={handleQuestionEdit}
                      onRemove={handleQuestionRemove}
                      onReplace={handleQuestionReplace}
                      onMoveUp={handleQuestionMoveUp}
                      onMoveDown={handleQuestionMoveDown}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Test Statistics Sidebar */}
      <TestStatsSidebar
        questions={selectedQuestions}
        metadata={testMetadata}
        isVisible={isStatsSidebarVisible}
        onToggle={() => setIsStatsSidebarVisible(!isStatsSidebarVisible)}
      />
      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={isQuestionBankModalOpen}
        onClose={() => setIsQuestionBankModalOpen(false)}
        onAddQuestions={handleAddQuestionsFromBank}
        filters={filters}
      />
      {/* Manual Question Modal */}
      <ManualQuestionModal
        isOpen={isManualQuestionModalOpen}
        onClose={() => setIsManualQuestionModalOpen(false)}
        onQuestionAdded={handleManualQuestionAdded}
      />
      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onQuestionsImported={handleBulkQuestionsImported}
      />
      {/* Mobile Filter Modal */}
      {!isFilterPanelCollapsed && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1020] lg:hidden">
          <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-r border-border shadow-lg">
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isCollapsed={false}
              onToggleCollapse={() => setIsFilterPanelCollapsed(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCreationScreen;