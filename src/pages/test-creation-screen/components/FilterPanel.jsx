import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
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


  const difficultyLevels = [
    { value: 'easy', label: 'EASY', color: 'success' },
    { value: 'medium', label: 'MEDIUM', color: 'warning' },
    { value: 'hard', label: 'HARD', color: 'error' }
  ];


  const handleLocalFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
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


  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters?.difficulty?.length > 0) count++;
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