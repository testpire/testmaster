import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const FilterPanel = ({ 
  filters, 
  onFilterChange, 
  onApplyFilters, 
  onClearFilters,
  isCollapsed = false,
  onToggleCollapse = () => {}
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const subjectOptions = [
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'biology', label: 'Biology' },
    { value: 'english', label: 'English' },
    { value: 'general-knowledge', label: 'General Knowledge' }
  ];

  const chapterOptions = {
    physics: [
      { value: 'mechanics', label: 'Mechanics' },
      { value: 'thermodynamics', label: 'Thermodynamics' },
      { value: 'optics', label: 'Optics' },
      { value: 'electricity', label: 'Electricity & Magnetism' },
      { value: 'modern-physics', label: 'Modern Physics' }
    ],
    chemistry: [
      { value: 'organic', label: 'Organic Chemistry' },
      { value: 'inorganic', label: 'Inorganic Chemistry' },
      { value: 'physical', label: 'Physical Chemistry' },
      { value: 'coordination', label: 'Coordination Compounds' }
    ],
    mathematics: [
      { value: 'algebra', label: 'Algebra' },
      { value: 'calculus', label: 'Calculus' },
      { value: 'geometry', label: 'Coordinate Geometry' },
      { value: 'trigonometry', label: 'Trigonometry' },
      { value: 'statistics', label: 'Statistics & Probability' }
    ],
    biology: [
      { value: 'cell-biology', label: 'Cell Biology' },
      { value: 'genetics', label: 'Genetics' },
      { value: 'ecology', label: 'Ecology' },
      { value: 'human-physiology', label: 'Human Physiology' }
    ]
  };

  const topicOptions = {
    mechanics: [
      { value: 'kinematics', label: 'Kinematics' },
      { value: 'dynamics', label: 'Dynamics' },
      { value: 'work-energy', label: 'Work & Energy' },
      { value: 'rotational-motion', label: 'Rotational Motion' }
    ],
    organic: [
      { value: 'hydrocarbons', label: 'Hydrocarbons' },
      { value: 'alcohols', label: 'Alcohols & Phenols' },
      { value: 'aldehydes', label: 'Aldehydes & Ketones' },
      { value: 'carboxylic-acids', label: 'Carboxylic Acids' }
    ],
    algebra: [
      { value: 'quadratic', label: 'Quadratic Equations' },
      { value: 'sequences', label: 'Sequences & Series' },
      { value: 'permutations', label: 'Permutations & Combinations' },
      { value: 'binomial', label: 'Binomial Theorem' }
    ]
  };

  const difficultyLevels = [
    { value: 'easy', label: 'Easy', color: 'success' },
    { value: 'moderate', label: 'Moderate', color: 'warning' },
    { value: 'tough', label: 'Tough', color: 'error' }
  ];

  const questionTypes = [
    { value: 'mcq', label: 'Multiple Choice (MCQ)' },
    { value: 'integer', label: 'Integer Type' },
    { value: 'subjective', label: 'Subjective' }
  ];

  const handleLocalFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    
    // Reset dependent filters when parent changes
    if (key === 'subject') {
      updatedFilters.chapter = '';
      updatedFilters.topic = '';
    } else if (key === 'chapter') {
      updatedFilters.topic = '';
    }
    
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleDifficultyToggle = (difficulty) => {
    const currentDifficulties = localFilters?.difficulty || [];
    const updatedDifficulties = currentDifficulties?.includes(difficulty)
      ? currentDifficulties?.filter(d => d !== difficulty)
      : [...currentDifficulties, difficulty];
    
    handleLocalFilterChange('difficulty', updatedDifficulties);
  };

  const handleQuestionTypeToggle = (type) => {
    const currentTypes = localFilters?.questionTypes || [];
    const updatedTypes = currentTypes?.includes(type)
      ? currentTypes?.filter(t => t !== type)
      : [...currentTypes, type];
    
    handleLocalFilterChange('questionTypes', updatedTypes);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters?.subject) count++;
    if (localFilters?.chapter) count++;
    if (localFilters?.topic) count++;
    if (localFilters?.difficulty?.length > 0) count++;
    if (localFilters?.questionTypes?.length > 0) count++;
    return count;
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-20 left-4 z-[1010] lg:hidden">
        <Button
          variant="primary"
          size="icon"
          onClick={onToggleCollapse}
          className="w-12 h-12 rounded-full shadow-lg"
        >
          <Icon name="Filter" size={20} />
          {getActiveFiltersCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-error-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {getActiveFiltersCount()}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border-r border-border h-full overflow-y-auto">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Filter" size={20} className="text-primary" />
            <h3 className="font-semibold text-foreground">Filters</h3>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {getActiveFiltersCount()}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="lg:hidden"
          >
            <Icon name="X" size={16} />
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* Subject Selection */}
        <div>
          <Select
            label="Subject"
            placeholder="Select subject"
            options={subjectOptions}
            value={localFilters?.subject || ''}
            onChange={(value) => handleLocalFilterChange('subject', value)}
            searchable
            clearable
          />
        </div>

        {/* Chapter Selection */}
        {localFilters?.subject && (
          <div>
            <Select
              label="Chapter"
              placeholder="Select chapter"
              options={chapterOptions?.[localFilters?.subject] || []}
              value={localFilters?.chapter || ''}
              onChange={(value) => handleLocalFilterChange('chapter', value)}
              searchable
              clearable
            />
          </div>
        )}

        {/* Topic Selection */}
        {localFilters?.chapter && (
          <div>
            <Select
              label="Topic"
              placeholder="Select topic"
              options={topicOptions?.[localFilters?.chapter] || []}
              value={localFilters?.topic || ''}
              onChange={(value) => handleLocalFilterChange('topic', value)}
              searchable
              clearable
            />
          </div>
        )}

        {/* Difficulty Level */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Difficulty Level
          </label>
          <div className="space-y-2">
            {difficultyLevels?.map((level) => (
              <Checkbox
                key={level?.value}
                label={level?.label}
                checked={(localFilters?.difficulty || [])?.includes(level?.value)}
                onChange={() => handleDifficultyToggle(level?.value)}
              />
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Question Types
          </label>
          <div className="space-y-2">
            {questionTypes?.map((type) => (
              <Checkbox
                key={type?.value}
                label={type?.label}
                checked={(localFilters?.questionTypes || [])?.includes(type?.value)}
                onChange={() => handleQuestionTypeToggle(type?.value)}
              />
            ))}
          </div>
        </div>

        {/* Filter Actions */}
        <div className="pt-4 border-t border-border space-y-3">
          <Button
            variant="primary"
            fullWidth
            onClick={onApplyFilters}
            iconName="Search"
            iconPosition="left"
          >
            Apply Filters
          </Button>
          
          <Button
            variant="outline"
            fullWidth
            onClick={onClearFilters}
            iconName="RotateCcw"
            iconPosition="left"
          >
            Clear All
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="bg-muted rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-2">Quick Stats</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <span className="font-medium">2,847</span>
            </div>
            <div className="flex justify-between">
              <span>Easy:</span>
              <span className="font-medium text-success">1,203</span>
            </div>
            <div className="flex justify-between">
              <span>Moderate:</span>
              <span className="font-medium text-warning">1,156</span>
            </div>
            <div className="flex justify-between">
              <span>Tough:</span>
              <span className="font-medium text-error">488</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;