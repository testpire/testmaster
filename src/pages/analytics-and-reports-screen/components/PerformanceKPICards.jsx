import React from 'react';
import Icon from '../../../components/AppIcon';

const PerformanceKPICards = ({ kpiData, selectedTimeRange }) => {
  const kpiCards = [
    {
      id: 'average-score',
      title: 'Average Score',
      value: kpiData?.averageScore,
      unit: '%',
      change: kpiData?.scoreChange,
      changeType: kpiData?.scoreChange >= 0 ? 'positive' : 'negative',
      icon: 'TrendingUp',
      color: 'primary'
    },
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      value: kpiData?.completionRate,
      unit: '%',
      change: kpiData?.completionChange,
      changeType: kpiData?.completionChange >= 0 ? 'positive' : 'negative',
      icon: 'CheckCircle',
      color: 'success'
    },
    {
      id: 'total-tests',
      title: 'Total Tests',
      value: kpiData?.totalTests,
      unit: '',
      change: kpiData?.testsChange,
      changeType: kpiData?.testsChange >= 0 ? 'positive' : 'negative',
      icon: 'FileText',
      color: 'secondary'
    },
    {
      id: 'active-students',
      title: 'Active Students',
      value: kpiData?.activeStudents,
      unit: '',
      change: kpiData?.studentsChange,
      changeType: kpiData?.studentsChange >= 0 ? 'positive' : 'negative',
      icon: 'Users',
      color: 'accent'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      secondary: 'bg-secondary/10 text-secondary',
      accent: 'bg-accent/10 text-accent'
    };
    return colorMap?.[color] || colorMap?.primary;
  };

  const getChangeColor = (changeType) => {
    return changeType === 'positive' ? 'text-success' : 'text-error';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiCards?.map((card) => (
        <div key={card?.id} className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(card?.color)}`}>
              <Icon name={card?.icon} size={24} />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {card?.value}{card?.unit}
              </div>
              <div className={`text-sm flex items-center justify-end space-x-1 ${getChangeColor(card?.changeType)}`}>
                <Icon 
                  name={card?.changeType === 'positive' ? 'ArrowUp' : 'ArrowDown'} 
                  size={16} 
                />
                <span>{Math.abs(card?.change)}%</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">{card?.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              vs {selectedTimeRange?.toLowerCase()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PerformanceKPICards;