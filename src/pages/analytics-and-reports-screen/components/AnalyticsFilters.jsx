import React from 'react';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const AnalyticsFilters = ({ 
  filters, 
  onFilterChange, 
  onExportData, 
  onGenerateReport,
  availableOptions 
}) => {
  const timeRangeOptions = [
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'last-6-months', label: 'Last 6 Months' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const subjectOptions = [
    { value: 'all', label: 'All Subjects' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'biology', label: 'Biology' }
  ];

  const batchOptions = [
    { value: 'all', label: 'All Batches' },
    { value: 'jee-2024-batch-a', label: 'JEE 2024 - Batch A' },
    { value: 'jee-2024-batch-b', label: 'JEE 2024 - Batch B' },
    { value: 'neet-2024-batch-a', label: 'NEET 2024 - Batch A' },
    { value: 'cbse-class-12', label: 'CBSE Class 12' }
  ];

  const testTypeOptions = [
    { value: 'all', label: 'All Test Types' },
    { value: 'practice', label: 'Practice Tests' },
    { value: 'mock', label: 'Mock Tests' },
    { value: 'chapter', label: 'Chapter Tests' },
    { value: 'full-syllabus', label: 'Full Syllabus' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulty Levels' },
    { value: 'easy', label: 'Easy' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'tough', label: 'Tough' }
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center space-x-2">
          <Icon name="Filter" size={20} />
          <span>Analytics Filters</span>
        </h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportData}
            iconName="Download"
            iconPosition="left"
          >
            Export Data
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onGenerateReport}
            iconName="FileText"
            iconPosition="left"
          >
            Generate Report
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Select
          label="Time Range"
          options={timeRangeOptions}
          value={filters?.timeRange}
          onChange={(value) => onFilterChange('timeRange', value)}
          className="w-full"
        />

        <Select
          label="Subject"
          options={subjectOptions}
          value={filters?.subject}
          onChange={(value) => onFilterChange('subject', value)}
          className="w-full"
        />

        <Select
          label="Batch"
          options={batchOptions}
          value={filters?.batch}
          onChange={(value) => onFilterChange('batch', value)}
          searchable
          className="w-full"
        />

        <Select
          label="Test Type"
          options={testTypeOptions}
          value={filters?.testType}
          onChange={(value) => onFilterChange('testType', value)}
          className="w-full"
        />

        <Select
          label="Difficulty"
          options={difficultyOptions}
          value={filters?.difficulty}
          onChange={(value) => onFilterChange('difficulty', value)}
          className="w-full"
        />
      </div>
      {filters?.timeRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
            <input
              type="date"
              value={filters?.startDate}
              onChange={(e) => onFilterChange('startDate', e?.target?.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
            <input
              type="date"
              value={filters?.endDate}
              onChange={(e) => onFilterChange('endDate', e?.target?.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Showing data for {filters?.batch === 'all' ? 'all batches' : filters?.batch} • {filters?.subject === 'all' ? 'all subjects' : filters?.subject}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange('reset')}
          iconName="RotateCcw"
          iconPosition="left"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsFilters;