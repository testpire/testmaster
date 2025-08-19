import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const DetailedDataTable = ({ tableData, tableType, onExportCSV }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const studentPerformanceData = [
    {
      id: 1,
      name: "Arjun Sharma",
      rollNumber: "JEE24001",
      batch: "JEE 2024 - Batch A",
      totalTests: 45,
      averageScore: 78.5,
      physics: 82,
      chemistry: 75,
      mathematics: 78,
      lastTestDate: "2025-08-15",
      weakAreas: ["Thermodynamics", "Calculus"]
    },
    {
      id: 2,
      name: "Priya Patel",
      rollNumber: "JEE24002",
      batch: "JEE 2024 - Batch A",
      totalTests: 42,
      averageScore: 85.2,
      physics: 88,
      chemistry: 84,
      mathematics: 83,
      lastTestDate: "2025-08-16",
      weakAreas: ["Optics", "Organic Chemistry"]
    },
    {
      id: 3,
      name: "Rahul Kumar",
      rollNumber: "JEE24003",
      batch: "JEE 2024 - Batch B",
      totalTests: 38,
      averageScore: 72.8,
      physics: 70,
      chemistry: 76,
      mathematics: 72,
      lastTestDate: "2025-08-14",
      weakAreas: ["Modern Physics", "Trigonometry", "Coordination Compounds"]
    },
    {
      id: 4,
      name: "Sneha Reddy",
      rollNumber: "NEET24001",
      batch: "NEET 2024 - Batch A",
      totalTests: 40,
      averageScore: 88.7,
      physics: 85,
      chemistry: 90,
      biology: 91,
      lastTestDate: "2025-08-16",
      weakAreas: ["Mechanics"]
    },
    {
      id: 5,
      name: "Vikram Singh",
      rollNumber: "JEE24004",
      batch: "JEE 2024 - Batch A",
      totalTests: 47,
      averageScore: 81.3,
      physics: 84,
      chemistry: 79,
      mathematics: 81,
      lastTestDate: "2025-08-15",
      weakAreas: ["Electrochemistry", "Probability"]
    }
  ];

  const testAnalysisData = [
    {
      id: 1,
      testName: "JEE Main Mock Test - 15",
      subject: "Physics",
      date: "2025-08-15",
      totalStudents: 125,
      averageScore: 78.5,
      highestScore: 95,
      lowestScore: 45,
      completionRate: 92,
      difficulty: "Moderate"
    },
    {
      id: 2,
      testName: "Chemistry Chapter Test - Organic",
      subject: "Chemistry",
      date: "2025-08-14",
      totalStudents: 118,
      averageScore: 82.3,
      highestScore: 98,
      lowestScore: 52,
      completionRate: 95,
      difficulty: "Easy"
    },
    {
      id: 3,
      testName: "Mathematics Full Syllabus - 8",
      subject: "Mathematics",
      date: "2025-08-13",
      totalStudents: 132,
      averageScore: 75.8,
      highestScore: 92,
      lowestScore: 38,
      completionRate: 88,
      difficulty: "Tough"
    }
  ];

  const getCurrentData = () => {
    return tableType === 'students' ? studentPerformanceData : testAnalysisData;
  };

  const filteredData = getCurrentData()?.filter(item => {
    const searchFields = tableType === 'students' 
      ? [item?.name, item?.rollNumber, item?.batch]
      : [item?.testName, item?.subject];
    
    return searchFields?.some(field => 
      field?.toLowerCase()?.includes(searchTerm?.toLowerCase())
    );
  });

  const sortedData = React.useMemo(() => {
    if (!sortConfig?.key) return filteredData;

    return [...filteredData]?.sort((a, b) => {
      const aValue = a?.[sortConfig?.key];
      const bValue = b?.[sortConfig?.key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig?.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue)?.toLowerCase();
      const bString = String(bValue)?.toLowerCase();

      if (sortConfig?.direction === 'asc') {
        return aString < bString ? -1 : aString > bString ? 1 : 0;
      } else {
        return aString > bString ? -1 : aString < bString ? 1 : 0;
      }
    });
  }, [filteredData, sortConfig]);

  const paginatedData = sortedData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedData?.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig?.key === key && prevConfig?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig?.key !== key) return 'ArrowUpDown';
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  const getDifficultyBadge = (difficulty) => {
    const colorMap = {
      'Easy': 'bg-success/10 text-success',
      'Moderate': 'bg-warning/10 text-warning',
      'Tough': 'bg-error/10 text-error'
    };
    return colorMap?.[difficulty] || 'bg-muted text-muted-foreground';
  };

  const renderStudentTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Student Name</span>
                <Icon name={getSortIcon('name')} size={16} />
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('rollNumber')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Roll Number</span>
                <Icon name={getSortIcon('rollNumber')} size={16} />
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-foreground">Batch</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('totalTests')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Tests</span>
                <Icon name={getSortIcon('totalTests')} size={16} />
              </button>
            </th>
            <th className="text-center py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('averageScore')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Avg Score</span>
                <Icon name={getSortIcon('averageScore')} size={16} />
              </button>
            </th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Physics</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Chemistry</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Math/Biology</th>
            <th className="text-left py-3 px-4 font-medium text-foreground">Weak Areas</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData?.map((student) => (
            <tr key={student?.id} className="border-b border-border hover:bg-muted/50">
              <td className="py-3 px-4">
                <div className="font-medium text-foreground">{student?.name}</div>
                <div className="text-sm text-muted-foreground">Last test: {student?.lastTestDate}</div>
              </td>
              <td className="py-3 px-4 text-foreground">{student?.rollNumber}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">{student?.batch}</td>
              <td className="py-3 px-4 text-center text-foreground">{student?.totalTests}</td>
              <td className="py-3 px-4 text-center">
                <span className={`font-medium ${getScoreColor(student?.averageScore)}`}>
                  {student?.averageScore}%
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={getScoreColor(student?.physics)}>{student?.physics}%</span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={getScoreColor(student?.chemistry)}>{student?.chemistry}%</span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={getScoreColor(student?.mathematics || student?.biology)}>
                  {student?.mathematics || student?.biology}%
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {student?.weakAreas?.slice(0, 2)?.map((area, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-error/10 text-error text-xs rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                  {student?.weakAreas?.length > 2 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                      +{student?.weakAreas?.length - 2}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTestTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('testName')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Test Name</span>
                <Icon name={getSortIcon('testName')} size={16} />
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-foreground">Subject</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('date')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Date</span>
                <Icon name={getSortIcon('date')} size={16} />
              </button>
            </th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Students</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">
              <button
                onClick={() => handleSort('averageScore')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <span>Avg Score</span>
                <Icon name={getSortIcon('averageScore')} size={16} />
              </button>
            </th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Highest</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Lowest</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Completion</th>
            <th className="text-center py-3 px-4 font-medium text-foreground">Difficulty</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData?.map((test) => (
            <tr key={test?.id} className="border-b border-border hover:bg-muted/50">
              <td className="py-3 px-4">
                <div className="font-medium text-foreground">{test?.testName}</div>
              </td>
              <td className="py-3 px-4 text-foreground">{test?.subject}</td>
              <td className="py-3 px-4 text-center text-muted-foreground">{test?.date}</td>
              <td className="py-3 px-4 text-center text-foreground">{test?.totalStudents}</td>
              <td className="py-3 px-4 text-center">
                <span className={`font-medium ${getScoreColor(test?.averageScore)}`}>
                  {test?.averageScore}%
                </span>
              </td>
              <td className="py-3 px-4 text-center text-success">{test?.highestScore}%</td>
              <td className="py-3 px-4 text-center text-error">{test?.lowestScore}%</td>
              <td className="py-3 px-4 text-center text-foreground">{test?.completionRate}%</td>
              <td className="py-3 px-4 text-center">
                <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyBadge(test?.difficulty)}`}>
                  {test?.difficulty}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {tableType === 'students' ? 'Student Performance Details' : 'Test Analysis Details'}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          iconName="Download"
          iconPosition="left"
        >
          Export CSV
        </Button>
      </div>
      <div className="mb-4">
        <Input
          type="search"
          placeholder={`Search ${tableType === 'students' ? 'students' : 'tests'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e?.target?.value)}
          className="max-w-md"
        />
      </div>
      {tableType === 'students' ? renderStudentTable() : renderTestTable()}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData?.length)} of {sortedData?.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              iconName="ChevronLeft"
            />
            <span className="text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              iconName="ChevronRight"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedDataTable;