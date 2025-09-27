import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import QuestionCard from './components/QuestionCard';
import ManualQuestionModal from './components/ManualQuestionModal';
import BulkImportModal from './components/BulkImportModal';
import { questionService } from '../../services/questionService';

const TestCreationScreen = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;
  
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isManualQuestionModalOpen, setIsManualQuestionModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    hasMore: false,
    size: 20
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    difficulty: '',
    subject: '',
    chapter: '',
    topic: ''
  });

  // Filter dropdown data
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // State for questions - starts empty, loads from API
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Load questions from backend with filters (fresh load)
  const loadQuestions = async (resetPagination = true) => {
    if (!currentUser || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const searchParams = {
        page: resetPagination ? 0 : pagination.currentPage,
        size: 20
      };
      // instituteId is now extracted from JWT token on backend
      
      // Add filters to search params if they exist
      if (filters.difficulty) searchParams.difficulty = filters.difficulty;
      if (filters.subject) searchParams.subjectId = filters.subject;
      if (filters.chapter) searchParams.chapterId = filters.chapter;
      if (filters.topic) searchParams.topicId = filters.topic;
      
      const result = await questionService.searchQuestions(searchParams);
      const { data, pagination: paginationData } = result;
      
      if (resetPagination) {
        // Fresh load - replace questions
        setSelectedQuestions(data && Array.isArray(data) ? data : []);
        setPagination(paginationData || {
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        });
      }
    } catch (err) {
      // On error, show empty state
      if (resetPagination) {
        setSelectedQuestions([]);
        setPagination({
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: 20
        });
      }
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Load more questions for infinite scroll
  const loadMoreQuestions = async () => {
    if (!currentUser || loadingMore || !pagination.hasMore) return;
    
    try {
      setLoadingMore(true);
      setError(null);
      
      const searchParams = {
        page: pagination.currentPage + 1,
        size: 20
      };
      // instituteId is now extracted from JWT token on backend
      
      // Add filters to search params if they exist
      if (filters.difficulty) searchParams.difficulty = filters.difficulty;
      if (filters.subject) searchParams.subjectId = filters.subject;
      if (filters.chapter) searchParams.chapterId = filters.chapter;
      if (filters.topic) searchParams.topicId = filters.topic;
      
      const result = await questionService.searchQuestions(searchParams);
      const { data, pagination: paginationData } = result;
      
      // Append new questions to existing list
      if (data && Array.isArray(data) && data.length > 0) {
        setSelectedQuestions(prevQuestions => [...prevQuestions, ...data]);
        setPagination(paginationData || pagination);
      }
    } catch (err) {
      setError(null);
    } finally {
      setLoadingMore(false);
    }
  };

  // Load filter data
  const loadSubjects = async () => {
    try {
      const { data } = await questionService.getSubjects();
      setSubjects(data || []);
    } catch (error) {
      console.warn('Failed to load subjects:', error);
    }
  };

  const loadChapters = async (subjectId) => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    
    try {
      setLoadingFilters(true);
      const { data } = await questionService.getChaptersBySubject(subjectId);
      setChapters(data || []);
    } catch (error) {
      console.warn('Failed to load chapters:', error);
      setChapters([]);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadTopics = async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }
    
    try {
      setLoadingFilters(true);
      const { data } = await questionService.getTopicsByChapter(chapterId);
      setTopics(data || []);
    } catch (error) {
      console.warn('Failed to load topics:', error);
      setTopics([]);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Load questions when component mounts or filters change
  useEffect(() => {
    if (currentUser) {
      loadQuestions(true); // Reset pagination when filters change
    }
  }, [currentUser, filters]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      // Check if we're near the bottom of the page
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      // Load more when user is 200px from bottom
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMoreQuestions();
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pagination.hasMore, loadingMore, currentUser, filters]);

  // Load subjects on mount
  useEffect(() => {
    if (currentUser) {
      loadSubjects();
    }
  }, [currentUser]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFilterDropdownOpen && !event.target.closest('.filter-dropdown')) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Enhanced handlers with API integration
  const handleQuestionCreated = () => {
    setIsManualQuestionModalOpen(false);
    setEditingQuestion(null); // Clear editing state
    // Refresh questions from API with fresh pagination after creating a new question
    if (currentUser && !loading) {
      loadQuestions(true);
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
    const newFilters = { ...filters, [filterType]: value };
    
    // Reset dependent filters when parent filter changes
    if (filterType === 'subject') {
      newFilters.chapter = '';
      newFilters.topic = '';
      setChapters([]);
      setTopics([]);
      if (value) loadChapters(value);
    } else if (filterType === 'chapter') {
      newFilters.topic = '';
      setTopics([]);
      if (value) loadTopics(value);
    }
    
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      difficulty: '',
      subject: '',
      chapter: '',
      topic: ''
    });
    setChapters([]);
    setTopics([]);
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

  // FilterDropdownContent component
  const FilterDropdownContent = ({ filters, onFilterChange, onClearFilters }) => (
    <div className="space-y-4">
      {/* Difficulty Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Difficulty Level
        </label>
        <select
          value={filters.difficulty}
          onChange={(e) => onFilterChange('difficulty', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">All Difficulty Levels</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {/* Subject Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Subject
        </label>
        <select
          value={filters.subject}
          onChange={(e) => onFilterChange('subject', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">All Subjects</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chapter Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Chapter
        </label>
        <select
          value={filters.chapter}
          onChange={(e) => onFilterChange('chapter', e.target.value)}
          disabled={!filters.subject || loadingFilters}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">All Chapters</option>
          {chapters.map(chapter => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.name}
            </option>
          ))}
        </select>
        {loadingFilters && filters.subject && (
          <p className="text-xs text-muted-foreground mt-1">Loading chapters...</p>
        )}
      </div>

      {/* Topic Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Topic
        </label>
        <select
          value={filters.topic}
          onChange={(e) => onFilterChange('topic', e.target.value)}
          disabled={!filters.chapter || loadingFilters}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">All Topics</option>
          {topics.map(topic => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        {loadingFilters && filters.chapter && (
          <p className="text-xs text-muted-foreground mt-1">Loading topics...</p>
        )}
      </div>

      {/* Clear Filters Button */}
      <div className="pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="w-full text-sm"
          iconName="X"
          iconPosition="left"
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );

  return (
    <PageLayout title="Question Management" activeRoute="/test-management">
      <div className="h-full flex flex-col">
        {/* Header Section with Actions and Filters */}
        <div className="bg-background border-b border-border px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Title and Question Count */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Question Management</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1 lg:mt-0">
                <span>
                  {loading && selectedQuestions.length === 0 ? (
                    'Loading questions...'
                  ) : pagination.totalElements > 0 ? (
                    <>
                      Showing {selectedQuestions.length} of {pagination.totalElements} questions
                      {pagination.hasMore && (
                        <span className="text-blue-600 ml-1">(scroll for more)</span>
                      )}
                    </>
                  ) : (
                    '0 Questions'
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons and Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Filter Dropdown */}
              <div className="relative filter-dropdown">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  iconName="Filter"
                  iconPosition="left"
                  className="text-sm"
                >
                  Filters
                </Button>
                
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">Filters</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsFilterDropdownOpen(false)}
                          className="w-6 h-6"
                        >
                          <Icon name="X" size={16} />
                        </Button>
                      </div>
                      
                      {/* Filter Content */}
                      <FilterDropdownContent
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                      />
                    </div>
                  </div>
                )}
              </div>

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
            <>
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
              
              {/* Loading more indicator */}
              {loadingMore && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground text-sm">Loading more questions...</p>
                </div>
              )}
              
              {/* End of list indicator */}
              {!pagination.hasMore && selectedQuestions.length > 0 && (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">You've reached the end of the list</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}

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
          onQuestionsImported={() => {
            setIsBulkImportModalOpen(false);
            // Refresh questions from API with fresh pagination after bulk import
            if (currentUser && !loading) {
              loadQuestions(true);
            }
          }}
        />
      )}
    </PageLayout>
  );
};

export default TestCreationScreen;