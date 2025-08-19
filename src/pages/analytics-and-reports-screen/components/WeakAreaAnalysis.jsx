import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const WeakAreaAnalysis = ({ weakAreasData, onGenerateRecommendations }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);

  const weakAreasAnalysis = [
    {
      topic: "Thermodynamics",
      subject: "Physics",
      studentsAffected: 45,
      averageScore: 58,
      difficulty: "Tough",
      commonMistakes: [
        "Confusion between isothermal and adiabatic processes",
        "Incorrect application of first law of thermodynamics",
        "Misunderstanding of entropy concept"
      ],
      recommendations: [
        "Focus on conceptual understanding of thermodynamic processes",
        "Practice more numerical problems on heat engines",
        "Review entropy and second law applications"
      ],
      practiceTests: 12,
      improvementRate: 15
    },
    {
      topic: "Organic Chemistry - Reactions",
      subject: "Chemistry",
      studentsAffected: 38,
      averageScore: 62,
      difficulty: "Moderate",
      commonMistakes: [
        "Incorrect mechanism prediction",
        "Confusion in stereochemistry",
        "Wrong product identification in substitution reactions"
      ],
      recommendations: [
        "Practice reaction mechanisms step by step",
        "Focus on stereochemistry concepts",
        "Solve more problems on SN1 and SN2 reactions"
      ],
      practiceTests: 18,
      improvementRate: 22
    },
    {
      topic: "Calculus - Integration",
      subject: "Mathematics",
      studentsAffected: 52,
      averageScore: 65,
      difficulty: "Moderate",
      commonMistakes: [
        "Incorrect substitution methods",
        "Sign errors in integration by parts",
        "Confusion in limits of definite integrals"
      ],
      recommendations: [
        "Practice standard integration formulas",
        "Focus on integration by parts technique",
        "Solve more problems on definite integrals"
      ],
      practiceTests: 25,
      improvementRate: 18
    },
    {
      topic: "Human Physiology",
      subject: "Biology",
      studentsAffected: 28,
      averageScore: 71,
      difficulty: "Easy",
      commonMistakes: [
        "Confusion between different organ systems",
        "Incorrect hormone functions",
        "Mixing up nervous system pathways"
      ],
      recommendations: [
        "Create concept maps for organ systems",
        "Practice hormone function tables",
        "Review nervous system diagrams"
      ],
      practiceTests: 15,
      improvementRate: 25
    }
  ];

  const studentWeakAreas = [
    {
      id: 1,
      name: "Arjun Sharma",
      rollNumber: "JEE24001",
      weakAreas: [
        { topic: "Thermodynamics", score: 45, attempts: 8 },
        { topic: "Calculus - Integration", score: 52, attempts: 12 },
        { topic: "Organic Chemistry", score: 58, attempts: 6 }
      ],
      overallImprovement: 12,
      lastPracticeDate: "2025-08-15"
    },
    {
      id: 2,
      name: "Priya Patel",
      rollNumber: "JEE24002",
      weakAreas: [
        { topic: "Modern Physics", score: 62, attempts: 10 },
        { topic: "Coordination Compounds", score: 68, attempts: 7 }
      ],
      overallImprovement: 18,
      lastPracticeDate: "2025-08-16"
    }
  ];

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      'Easy': 'text-success bg-success/10',
      'Moderate': 'text-warning bg-warning/10',
      'Tough': 'text-error bg-error/10'
    };
    return colorMap?.[difficulty] || 'text-muted-foreground bg-muted/10';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getImprovementColor = (rate) => {
    if (rate >= 20) return 'text-success';
    if (rate >= 10) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="space-y-6">
      {/* Overall Weak Areas Analysis */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center space-x-2">
            <Icon name="AlertTriangle" size={20} className="text-warning" />
            <span>Weak Areas Analysis</span>
          </h2>
          <Button
            variant="default"
            size="sm"
            onClick={onGenerateRecommendations}
            iconName="Brain"
            iconPosition="left"
          >
            Generate AI Recommendations
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {weakAreasAnalysis?.map((area, index) => (
            <div key={index} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-foreground">{area?.topic}</h3>
                  <p className="text-sm text-muted-foreground">{area?.subject}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(area?.difficulty)}`}>
                  {area?.difficulty}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-error">{area?.studentsAffected}</div>
                  <div className="text-xs text-muted-foreground">Students Affected</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(area?.averageScore)}`}>
                    {area?.averageScore}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getImprovementColor(area?.improvementRate)}`}>
                    +{area?.improvementRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">Improvement</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Common Mistakes:</h4>
                  <ul className="space-y-1">
                    {area?.commonMistakes?.slice(0, 2)?.map((mistake, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start space-x-2">
                        <Icon name="Minus" size={12} className="mt-1 flex-shrink-0" />
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Recommendations:</h4>
                  <ul className="space-y-1">
                    {area?.recommendations?.slice(0, 2)?.map((rec, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start space-x-2">
                        <Icon name="CheckCircle" size={12} className="mt-1 flex-shrink-0 text-success" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {area?.practiceTests} practice tests available
                  </span>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Individual Student Weak Areas */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Individual Student Analysis</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              iconName="Users"
              iconPosition="left"
            >
              View All Students
            </Button>
            <Button
              variant="default"
              size="sm"
              iconName="Send"
              iconPosition="left"
            >
              Send Recommendations
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {studentWeakAreas?.map((student) => (
            <div
              key={student?.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setSelectedStudent(selectedStudent === student?.id ? null : student?.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium text-foreground">{student?.name}</h3>
                    <p className="text-sm text-muted-foreground">{student?.rollNumber}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-error">{student?.weakAreas?.length}</div>
                      <div className="text-xs text-muted-foreground">Weak Areas</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${getImprovementColor(student?.overallImprovement)}`}>
                        +{student?.overallImprovement}%
                      </div>
                      <div className="text-xs text-muted-foreground">Improvement</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    Last practice: {student?.lastPracticeDate}
                  </span>
                  <Icon 
                    name={selectedStudent === student?.id ? "ChevronUp" : "ChevronDown"} 
                    size={16} 
                    className="text-muted-foreground"
                  />
                </div>
              </div>

              {selectedStudent === student?.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Detailed Weak Areas:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {student?.weakAreas?.map((area, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-3">
                        <div className="font-medium text-sm text-foreground">{area?.topic}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-sm font-medium ${getScoreColor(area?.score)}`}>
                            {area?.score}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {area?.attempts} attempts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm">
                      Assign Practice Tests
                    </Button>
                    <Button variant="default" size="sm">
                      Generate Study Plan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeakAreaAnalysis;