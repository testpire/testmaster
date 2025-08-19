import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const ReportGenerator = ({ onGenerateReport, onScheduleReport }) => {
  const [reportConfig, setReportConfig] = useState({
    reportType: 'comprehensive',
    timeRange: 'last-30-days',
    includeCharts: true,
    includeStudentDetails: true,
    includeWeakAreas: true,
    includeRecommendations: true,
    format: 'pdf',
    recipients: '',
    scheduledDelivery: false,
    deliveryFrequency: 'weekly',
    deliveryDay: 'monday'
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypeOptions = [
    { value: 'comprehensive', label: 'Comprehensive Report' },
    { value: 'student-performance', label: 'Student Performance Report' },
    { value: 'test-analysis', label: 'Test Analysis Report' },
    { value: 'weak-areas', label: 'Weak Areas Report' },
    { value: 'batch-comparison', label: 'Batch Comparison Report' },
    { value: 'subject-wise', label: 'Subject-wise Analysis' }
  ];

  const timeRangeOptions = [
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'last-6-months', label: 'Last 6 Months' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'powerpoint', label: 'PowerPoint Presentation' },
    { value: 'csv', label: 'CSV Data Export' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' }
  ];

  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const handleConfigChange = (key, value) => {
    setReportConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await onGenerateReport(reportConfig);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleReport = () => {
    onScheduleReport(reportConfig);
  };

  const getReportDescription = (type) => {
    const descriptions = {
      'comprehensive': 'Complete analytics including student performance, test analysis, and recommendations',
      'student-performance': 'Detailed individual student performance metrics and progress tracking',
      'test-analysis': 'In-depth analysis of test results, difficulty levels, and completion rates',
      'weak-areas': 'Identification of weak areas with improvement suggestions and practice recommendations',
      'batch-comparison': 'Comparative analysis between different batches and their performance metrics',
      'subject-wise': 'Subject-specific performance analysis with topic-wise breakdown'
    };
    return descriptions?.[type] || '';
  };

  const scheduledReports = [
    {
      id: 1,
      name: "Weekly Performance Summary",
      type: "comprehensive",
      frequency: "weekly",
      nextDelivery: "2025-08-23",
      recipients: "admin@testmaster.com, teachers@testmaster.com",
      status: "active"
    },
    {
      id: 2,
      name: "Monthly Weak Areas Report",
      type: "weak-areas",
      frequency: "monthly",
      nextDelivery: "2025-09-01",
      recipients: "principal@testmaster.com",
      status: "active"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Icon name="FileText" size={20} />
            <span>Generate Custom Report</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Configuration */}
          <div className="space-y-4">
            <Select
              label="Report Type"
              description={getReportDescription(reportConfig?.reportType)}
              options={reportTypeOptions}
              value={reportConfig?.reportType}
              onChange={(value) => handleConfigChange('reportType', value)}
            />

            <Select
              label="Time Range"
              options={timeRangeOptions}
              value={reportConfig?.timeRange}
              onChange={(value) => handleConfigChange('timeRange', value)}
            />

            <Select
              label="Export Format"
              options={formatOptions}
              value={reportConfig?.format}
              onChange={(value) => handleConfigChange('format', value)}
            />

            <Input
              label="Email Recipients"
              type="email"
              placeholder="Enter email addresses separated by commas"
              description="Reports will be sent to these email addresses"
              value={reportConfig?.recipients}
              onChange={(e) => handleConfigChange('recipients', e?.target?.value)}
            />
          </div>

          {/* Right Column - Content Options */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Include in Report:</h3>
              <div className="space-y-3">
                <Checkbox
                  label="Performance Charts & Graphs"
                  description="Visual representations of performance data"
                  checked={reportConfig?.includeCharts}
                  onChange={(e) => handleConfigChange('includeCharts', e?.target?.checked)}
                />
                <Checkbox
                  label="Individual Student Details"
                  description="Detailed breakdown for each student"
                  checked={reportConfig?.includeStudentDetails}
                  onChange={(e) => handleConfigChange('includeStudentDetails', e?.target?.checked)}
                />
                <Checkbox
                  label="Weak Areas Analysis"
                  description="Identification of areas needing improvement"
                  checked={reportConfig?.includeWeakAreas}
                  onChange={(e) => handleConfigChange('includeWeakAreas', e?.target?.checked)}
                />
                <Checkbox
                  label="AI-Powered Recommendations"
                  description="Personalized learning suggestions"
                  checked={reportConfig?.includeRecommendations}
                  onChange={(e) => handleConfigChange('includeRecommendations', e?.target?.checked)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Checkbox
                label="Schedule Automatic Delivery"
                description="Set up recurring report generation and delivery"
                checked={reportConfig?.scheduledDelivery}
                onChange={(e) => handleConfigChange('scheduledDelivery', e?.target?.checked)}
              />

              {reportConfig?.scheduledDelivery && (
                <div className="mt-4 space-y-3 pl-6 border-l-2 border-primary/20">
                  <Select
                    label="Delivery Frequency"
                    options={frequencyOptions}
                    value={reportConfig?.deliveryFrequency}
                    onChange={(value) => handleConfigChange('deliveryFrequency', value)}
                  />
                  {reportConfig?.deliveryFrequency === 'weekly' && (
                    <Select
                      label="Delivery Day"
                      options={dayOptions}
                      value={reportConfig?.deliveryDay}
                      onChange={(value) => handleConfigChange('deliveryDay', value)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Report will include data from {reportConfig?.timeRange?.replace('-', ' ')} in {reportConfig?.format?.toUpperCase()} format
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setReportConfig({
                reportType: 'comprehensive',
                timeRange: 'last-30-days',
                includeCharts: true,
                includeStudentDetails: true,
                includeWeakAreas: true,
                includeRecommendations: true,
                format: 'pdf',
                recipients: '',
                scheduledDelivery: false,
                deliveryFrequency: 'weekly',
                deliveryDay: 'monday'
              })}
            >
              Reset
            </Button>
            {reportConfig?.scheduledDelivery && (
              <Button
                variant="secondary"
                onClick={handleScheduleReport}
                iconName="Calendar"
                iconPosition="left"
              >
                Schedule Report
              </Button>
            )}
            <Button
              variant="default"
              onClick={handleGenerateReport}
              loading={isGenerating}
              iconName="Download"
              iconPosition="left"
            >
              Generate Report
            </Button>
          </div>
        </div>
      </div>
      {/* Scheduled Reports */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Icon name="Calendar" size={20} />
            <span>Scheduled Reports</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            iconName="Plus"
            iconPosition="left"
          >
            Add Schedule
          </Button>
        </div>

        <div className="space-y-4">
          {scheduledReports?.map((report) => (
            <div key={report?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name="FileText" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{report?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report?.type?.replace('-', ' ')} • {report?.frequency} delivery
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">Next: {report?.nextDelivery}</div>
                    <div className="text-xs text-muted-foreground">{report?.recipients?.split(',')?.length} recipients</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      report?.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {report?.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <Icon name="MoreVertical" size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;