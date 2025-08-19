import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const StudentFilters = ({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  batches = [],
  courses = [],
  isCollapsed = false,
  onToggleCollapse = () => {}
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  // Generate dynamic options from actual data
  const batchOptions = useMemo(() => [
    { value: '', label: 'All Batches' },
    ...batches?.map(batch => ({
      value: batch?.id,
      label: batch?.name
    })) || []
  ], [batches]);

  const courseOptions = useMemo(() => [
    { value: '', label: 'All Courses' },
    ...courses?.map(course => ({
      value: course?.id,
      label: course?.name
    })) || []
  ], [courses]);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'graduated', label: 'Graduated' }
  ];

  const performanceOptions = [
    { value: '', label: 'All Performance' },
    { value: 'excellent', label: 'Excellent (90-100%)' },
    { value: 'good', label: 'Good (75-89%)' },
    { value: 'average', label: 'Average (60-74%)' },
    { value: 'below-average', label: 'Below Average (<60%)' }
  ];

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleClearAll = () => {
    const clearedFilters = {
      batch: '',
      course: '',
      status: '',
      performance: '',
      enrollmentDate: '',
      searchTerm: ''
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClearFilters();
  };

  const hasActiveFilters = Object.values(localFilters)?.some(value => value !== '');

  if (isCollapsed) {
    return (
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-card border-b border-border z-[1010] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Filter" size={20} />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <Icon name="X" size={20} />
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Batch"
              options={batchOptions}
              value={localFilters?.batch}
              onChange={(value) => handleFilterChange('batch', value)}
              placeholder="Select batch"
            />
            
            <Select
              label="Course"
              options={courseOptions}
              value={localFilters?.course}
              onChange={(value) => handleFilterChange('course', value)}
              placeholder="Select course"
            />
            
            <Select
              label="Status"
              options={statusOptions}
              value={localFilters?.status}
              onChange={(value) => handleFilterChange('status', value)}
              placeholder="Select status"
            />
            
            <Select
              label="Performance"
              options={performanceOptions}
              value={localFilters?.performance}
              onChange={(value) => handleFilterChange('performance', value)}
              placeholder="Select performance"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClearAll} className="flex-1">
              <Icon name="RotateCcw" size={16} />
              Clear All
            </Button>
            <Button onClick={onToggleCollapse} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Icon name="Filter" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            <Icon name="RotateCcw" size={16} />
            Clear All
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {/* Batch Filter */}
        <div>
          <Select
            label="Batch"
            options={batchOptions}
            value={localFilters?.batch}
            onChange={(value) => handleFilterChange('batch', value)}
            placeholder="Select batch"
          />
        </div>

        {/* Course Filter */}
        <div>
          <Select
            label="Course"
            options={courseOptions}
            value={localFilters?.course}
            onChange={(value) => handleFilterChange('course', value)}
            placeholder="Select course"
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select
            label="Enrollment Status"
            options={statusOptions}
            value={localFilters?.status}
            onChange={(value) => handleFilterChange('status', value)}
            placeholder="Select status"
          />
        </div>

        {/* Performance Filter */}
        <div>
          <Select
            label="Performance Range"
            options={performanceOptions}
            value={localFilters?.performance}
            onChange={(value) => handleFilterChange('performance', value)}
            placeholder="Select performance"
          />
        </div>

        {/* Enrollment Date Filter */}
        <div>
          <Input
            label="Enrollment Date"
            type="date"
            value={localFilters?.enrollmentDate}
            onChange={(e) => handleFilterChange('enrollmentDate', e?.target?.value)}
            placeholder="Select date"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Quick Filters</p>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilterChange('status', 'active')}
              className="w-full justify-start"
            >
              <Icon name="Users" size={16} />
              Active Students
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilterChange('performance', 'excellent')}
              className="w-full justify-start"
            >
              <Icon name="Trophy" size={16} />
              Top Performers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilterChange('performance', 'below-average')}
              className="w-full justify-start"
            >
              <Icon name="AlertTriangle" size={16} />
              Need Attention
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFilters;