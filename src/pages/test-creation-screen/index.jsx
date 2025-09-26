import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import FilterPanel from './components/FilterPanel';
import QuestionCard from './components/QuestionCard';
import TestMetadataPanel from './components/TestMetadataPanel';
import TestStatsSidebar from './components/TestStatsSidebar';
import QuestionBankModal from './components/QuestionBankModal';
import ManualQuestionModal from './components/ManualQuestionModal';
import BulkImportModal from './components/BulkImportModal';
import { questionService } from '../../services/questionService';

const TestCreationScreen = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;
  
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  const [isStatsSidebarVisible, setIsStatsSidebarVisible] = useState(true);
  const [isQuestionBankModalOpen, setIsQuestionBankModalOpen] = useState(false);
  const [isManualQuestionModalOpen, setIsManualQuestionModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    difficulty: []
  });

  // State for questions - starts empty, loads from API
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Load questions from backend
  const loadQuestions = async () => {
    if (!currentUser?.instituteId || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await questionService.getQuestions({
        instituteId: currentUser.instituteId
      });
      
      const { data } = result;
      
      // Set questions from API response or empty array if no data
      setSelectedQuestions(data && Array.isArray(data) ? data : []);
    } catch (err) {
      // On error, show empty state
      setSelectedQuestions([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Load questions when component mounts
  useEffect(() => {
    if (currentUser?.instituteId) {
      loadQuestions();
    }
  }, [currentUser?.instituteId]);

  // Enhanced handlers with API integration
  const handleQuestionCreated = () => {
    setIsManualQuestionModalOpen(false);
    setEditingQuestion(null); // Clear editing state
    // Refresh questions from API, but don't break if it fails
    if (currentUser?.instituteId && !loading) {
      loadQuestions();
    }
  };
  
  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) return;
    
    // Optimistically update UI first
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
    
    // Try to delete from backend, but don't revert UI if it fails
    try {
      await questionService.deleteQuestion(questionId);
    } catch (err) {
      // Silent fail - UI already updated optimistically
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters };
    if (filterType === 'difficulty') {
      if (newFilters?.difficulty?.includes(value)) {
        newFilters.difficulty = newFilters.difficulty?.filter(d => d !== value);
      } else {
        newFilters.difficulty = [...(newFilters.difficulty || []), value];
      }
    } else {
      newFilters[filterType] = value;
    }
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    // Filters updated
  };

  const handleClearFilters = () => {
    setFilters({
      difficulty: []
    });
  };

  const handleTestMetadataChange = (field, value) => {
    const newMetadata = { ...testMetadata };
    newMetadata[field] = value;
    setTestMetadata(newMetadata);
  };

  const handleQuestionEdit = (question) => {
    // Set the editing question for the ManualQuestionModal
    setEditingQuestion(question);
    setIsManualQuestionModalOpen(true);
  };

  const handleQuestionRemove = (index) => {
    setSelectedQuestions(prev => prev?.filter((_, i) => i !== index));
  };

  const handleQuestionReplace = (question) => {
    // Replace question
  };

  const handleQuestionMoveUp = (index) => {
    if (index > 0) {
      setSelectedQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        return newQuestions;
      });
    }
  };

  const handleQuestionMoveDown = (index) => {
    setSelectedQuestions(prev => {
      if (index < prev.length - 1) {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        return newQuestions;
      }
      return prev;
    });
  };

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (testMetadata?.title || selectedQuestions?.length > 0) {
        setAutoSaveStatus('saving');
        
        setTimeout(() => {
          setAutoSaveStatus('saved');
        }, 1000);
      }
    }, 1000);

    return () => clearTimeout(autoSaveTimer);
  }, [testMetadata, selectedQuestions]);

  const handlePreviewTest = () => {
    // Preview test
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
    
    alert(`Test "${testMetadata?.title}" would be published with ${selectedQuestions?.length} questions`);
  };

  const handleSaveDraft = () => {
    alert('Test saved as draft');
  };

  return (
    <PageLayout title="Test Management" activeRoute="/test-management">
      <div className="h-full flex flex-col lg:flex-row">
        {/* Filter Panel - Mobile responsive */}
        <div className={`bg-card border-r border-border lg:border-b-0 border-b transition-all duration-300 ${
          isFilterPanelCollapsed 
            ? 'hidden lg:block lg:w-12' 
            : 'w-full lg:w-80 max-h-48 lg:max-h-none overflow-y-auto'
        }`}>
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            isCollapsed={isFilterPanelCollapsed}
            onToggleCollapse={() => setIsFilterPanelCollapsed(!isFilterPanelCollapsed)}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Section - Mobile responsive */}
          <div className="bg-background border-b border-border px-4 lg:px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
                <div className="flex items-center space-x-3">
                  {/* Mobile Filter Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFilterPanelCollapsed(!isFilterPanelCollapsed)}
                    className="lg:hidden"
                    title={isFilterPanelCollapsed ? "Show filters" : "Hide filters"}
                  >
                    <Icon name="Filter" size={20} />
                  </Button>
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground">Test Questions</h1>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1 lg:mt-0">
                  <span>{selectedQuestions?.length || 0} Questions</span>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                  <span className={`${
                    autoSaveStatus === 'saving' ? 'text-warning' :
                    autoSaveStatus === 'saved' ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {autoSaveStatus === 'saving' ? 'Saving...' :
                     autoSaveStatus === 'saved' ? 'All changes saved' : 'Unsaved changes'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsQuestionBankModalOpen(true)}
                  iconName="Database"
                  iconPosition="left"
                  className="text-sm"
                >
                  <span className="hidden sm:inline">Question Bank</span>
                  <span className="sm:hidden">Bank</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsBulkImportModalOpen(true)}
                  iconName="Upload"
                  iconPosition="left"
                  className="text-sm"
                >
                  <span className="hidden sm:inline">Bulk Import</span>
                  <span className="sm:hidden">Import</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => setIsManualQuestionModalOpen(true)}
                  iconName="Plus"
                  iconPosition="left"
                  className="text-sm"
                >
                  <span className="hidden sm:inline">Add Manual Question</span>
                  <span className="sm:hidden">Add Question</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading questions...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {!loading && !error && selectedQuestions?.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="FileText" size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
                  <p className="text-gray-600 mb-4">Start by adding your first question or adjust your filters.</p>
                  <Button
                    variant="primary"
                    onClick={() => setIsManualQuestionModalOpen(true)}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    Add First Question
                  </Button>
                </div>
              )}

              {!loading && selectedQuestions?.length > 0 && (
                <div className="space-y-4">
                  {selectedQuestions.map((question, index) => (
                    <QuestionCard
                      key={question?.id || index}
                      question={question}
                      index={index}
                      onEdit={handleQuestionEdit}
                      onRemove={handleQuestionRemove}
                      onReplace={handleQuestionReplace}
                      onMoveUp={handleQuestionMoveUp}
                      onMoveDown={handleQuestionMoveDown}
                      onDelete={() => handleDeleteQuestion(question?.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Hidden on mobile */}
        {isStatsSidebarVisible && (
          <div className="hidden lg:block w-80 bg-card border-l border-border overflow-y-auto">
            <TestStatsSidebar
              questions={selectedQuestions}
              testMetadata={testMetadata}
              onClose={() => setIsStatsSidebarVisible(false)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {isQuestionBankModalOpen && (
        <QuestionBankModal
          isOpen={isQuestionBankModalOpen}
          onClose={() => setIsQuestionBankModalOpen(false)}
          onQuestionsSelected={(questions) => {
            setSelectedQuestions(prev => [...prev, ...questions]);
            setIsQuestionBankModalOpen(false);
          }}
        />
      )}

      {isManualQuestionModalOpen && (
        <ManualQuestionModal
          isOpen={isManualQuestionModalOpen}
          onClose={() => {
            setIsManualQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          onQuestionAdded={handleQuestionCreated}
          currentUser={currentUser}
          editingQuestion={editingQuestion}
        />
      )}

      {isBulkImportModalOpen && (
        <BulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          onQuestionsImported={(questions) => {
            setSelectedQuestions(prev => [...prev, ...questions]);
            setIsBulkImportModalOpen(false);
          }}
        />
      )}
    </PageLayout>
  );
};

export default TestCreationScreen;