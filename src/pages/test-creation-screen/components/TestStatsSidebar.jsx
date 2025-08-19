import React from 'react';
import Icon from '../../../components/AppIcon';

const TestStatsSidebar = ({ 
  questions = [], 
  metadata = {},
  isVisible = true,
  onToggle = () => {}
}) => {
  const getQuestionStats = () => {
    const stats = {
      total: questions?.length,
      mcq: questions?.filter(q => q?.type === 'mcq')?.length,
      integer: questions?.filter(q => q?.type === 'integer')?.length,
      subjective: questions?.filter(q => q?.type === 'subjective')?.length,
      easy: questions?.filter(q => q?.difficulty === 'easy')?.length,
      moderate: questions?.filter(q => q?.difficulty === 'moderate')?.length,
      tough: questions?.filter(q => q?.difficulty === 'tough')?.length
    };
    return stats;
  };

  const getSubjectDistribution = () => {
    const subjects = {};
    questions?.forEach(q => {
      subjects[q.subject] = (subjects?.[q?.subject] || 0) + 1;
    });
    return subjects;
  };

  const calculateEstimatedTime = () => {
    const totalTime = questions?.reduce((acc, q) => {
      return acc + (q?.estimatedTime || 2);
    }, 0);
    return totalTime;
  };

  const calculateTotalMarks = () => {
    return questions?.reduce((acc, q) => {
      return acc + (q?.marks || 4);
    }, 0);
  };

  const getDifficultyPercentage = (difficulty) => {
    const stats = getQuestionStats();
    if (stats?.total === 0) return 0;
    return Math.round((stats?.[difficulty] / stats?.total) * 100);
  };

  const stats = getQuestionStats();
  const subjectDistribution = getSubjectDistribution();
  const estimatedTime = calculateEstimatedTime();
  const totalMarks = calculateTotalMarks();

  if (!isVisible) {
    return (
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-[1010]">
        <button
          onClick={onToggle}
          className="bg-primary text-primary-foreground p-3 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Icon name="BarChart3" size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-0 w-80 h-[calc(100vh-5rem)] bg-card border-l border-border shadow-lg z-[1010] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="BarChart3" size={20} className="text-primary" />
            <h3 className="font-semibold text-foreground">Test Statistics</h3>
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-muted rounded"
          >
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.total}</div>
            <div className="text-xs text-muted-foreground">Total Questions</div>
          </div>
          
          <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-success">{totalMarks}</div>
            <div className="text-xs text-muted-foreground">Total Marks</div>
          </div>
          
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-warning">{estimatedTime}</div>
            <div className="text-xs text-muted-foreground">Est. Time (min)</div>
          </div>
          
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-secondary">
              {metadata?.duration || 180}
            </div>
            <div className="text-xs text-muted-foreground">Duration (min)</div>
          </div>
        </div>

        {/* Question Type Distribution */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Question Types</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name="CheckCircle" size={14} className="text-primary" />
                <span className="text-sm text-foreground">MCQ</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{stats?.mcq}</span>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${stats?.total ? (stats?.mcq / stats?.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name="Hash" size={14} className="text-secondary" />
                <span className="text-sm text-foreground">Integer</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{stats?.integer}</span>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${stats?.total ? (stats?.integer / stats?.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name="FileText" size={14} className="text-accent" />
                <span className="text-sm text-foreground">Subjective</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{stats?.subjective}</span>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${stats?.total ? (stats?.subjective / stats?.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Difficulty Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-success">Easy</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{stats?.easy}</span>
                <span className="text-xs text-muted-foreground">({getDifficultyPercentage('easy')}%)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-warning">Moderate</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{stats?.moderate}</span>
                <span className="text-xs text-muted-foreground">({getDifficultyPercentage('moderate')}%)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-error">Tough</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">{stats?.tough}</span>
                <span className="text-xs text-muted-foreground">({getDifficultyPercentage('tough')}%)</span>
              </div>
            </div>
          </div>
          
          {/* Difficulty Bar */}
          <div className="mt-3 h-3 bg-muted rounded-full overflow-hidden flex">
            <div 
              className="bg-success h-full"
              style={{ width: `${getDifficultyPercentage('easy')}%` }}
            />
            <div 
              className="bg-warning h-full"
              style={{ width: `${getDifficultyPercentage('moderate')}%` }}
            />
            <div 
              className="bg-error h-full"
              style={{ width: `${getDifficultyPercentage('tough')}%` }}
            />
          </div>
        </div>

        {/* Subject Distribution */}
        {Object.keys(subjectDistribution)?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Subject Distribution</h4>
            <div className="space-y-2">
              {Object.entries(subjectDistribution)?.map(([subject, count]) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="text-sm text-foreground capitalize">{subject}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">{count}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${stats?.total ? (count / stats?.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-muted rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center space-x-1">
            <Icon name="Lightbulb" size={14} />
            <span>Recommendations</span>
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            {stats?.total < 30 && (
              <div className="flex items-start space-x-1">
                <Icon name="AlertCircle" size={12} className="text-warning mt-0.5" />
                <span>Consider adding more questions for a comprehensive test</span>
              </div>
            )}
            
            {getDifficultyPercentage('easy') > 60 && (
              <div className="flex items-start space-x-1">
                <Icon name="TrendingUp" size={12} className="text-primary mt-0.5" />
                <span>Add more moderate/tough questions for better assessment</span>
              </div>
            )}
            
            {estimatedTime > (metadata?.duration || 180) && (
              <div className="flex items-start space-x-1">
                <Icon name="Clock" size={12} className="text-error mt-0.5" />
                <span>Estimated time exceeds test duration</span>
              </div>
            )}
            
            {stats?.total > 0 && stats?.mcq === 0 && (
              <div className="flex items-start space-x-1">
                <Icon name="CheckCircle" size={12} className="text-secondary mt-0.5" />
                <span>Consider adding MCQ questions for variety</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestStatsSidebar;