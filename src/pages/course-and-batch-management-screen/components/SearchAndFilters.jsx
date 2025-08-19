import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';


const SearchAndFilters = ({ 
  onSearch, 
  onFilter, 
  activeTab,
  totalCourses = 0,
  totalBatches = 0 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    curriculum: '',
    difficulty: '',
    status: '',
    subject: '',
    teacher: ''
  });

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      curriculum: '',
      difficulty: '',
      status: '',
      subject: '',
      teacher: ''
    };
    setFilters(clearedFilters);
    onFilter(clearedFilters);
  };

  const activeFiltersCount = Object.values(filters)?.filter(value => value !== '')?.length;

  const curriculumOptions = ['CBSE', 'ICSE', 'State Board', 'JEE', 'NEET', 'UPSC', 'SSC'];
  const difficultyOptions = ['Easy', 'Moderate', 'Tough'];
  const statusOptions = ['Active', 'Inactive', 'Full'];
  const subjectOptions = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Hindi'];

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Icon 
              name="Search" 
              size={20} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
            />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'courses' ? 'courses' : 'batches'}...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e?.target?.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {activeTab === 'courses' ? (
              <span>{totalCourses} course{totalCourses !== 1 ? 's' : ''}</span>
            ) : (
              <span>{totalBatches} batch{totalBatches !== 1 ? 'es' : ''}</span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Icon name="Filter" size={16} />
            <span className="ml-2">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          <Button variant="outline" size="sm">
            <Icon name="Download" size={16} />
            <span className="ml-2 hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {activeTab === 'courses' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Curriculum
                  </label>
                  <select
                    value={filters?.curriculum}
                    onChange={(e) => handleFilterChange('curriculum', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Curriculums</option>
                    {curriculumOptions?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Difficulty
                  </label>
                  <select
                    value={filters?.difficulty}
                    onChange={(e) => handleFilterChange('difficulty', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Levels</option>
                    {difficultyOptions?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Subject
                  </label>
                  <select
                    value={filters?.subject}
                    onChange={(e) => handleFilterChange('subject', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Subjects</option>
                    {subjectOptions?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={filters?.status}
                    onChange={(e) => handleFilterChange('status', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Status</option>
                    {statusOptions?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Teacher
                  </label>
                  <select
                    value={filters?.teacher}
                    onChange={(e) => handleFilterChange('teacher', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Teachers</option>
                    <option value="Dr. Rajesh Kumar">Dr. Rajesh Kumar</option>
                    <option value="Prof. Priya Sharma">Prof. Priya Sharma</option>
                    <option value="Mr. Amit Singh">Mr. Amit Singh</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Icon name="X" size={14} />
                <span className="ml-1">Clear Filters</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilters;