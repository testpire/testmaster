import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';


const StudentToolbar = ({ 
  searchTerm, 
  onSearchChange, 
  selectedStudents,
  onBulkAction,
  onAddStudent,
  onExport,
  onImport,
  totalStudents,
  filteredStudents,
  onToggleFilters
}) => {
  const [showBulkActions, setShowBulkActions] = useState(false);

  const bulkActionOptions = [
    { value: 'assign-batch', label: 'Assign to Batch', icon: 'Users' },
    { value: 'change-status', label: 'Change Status', icon: 'ToggleLeft' },
    { value: 'send-notification', label: 'Send Notification', icon: 'Bell' },
    { value: 'export-selected', label: 'Export Selected', icon: 'Download' },
    { value: 'delete-selected', label: 'Delete Selected', icon: 'Trash2' }
  ];

  const exportOptions = [
    { value: 'excel', label: 'Export to Excel' },
    { value: 'csv', label: 'Export to CSV' },
    { value: 'pdf', label: 'Export to PDF' }
  ];

  const handleBulkAction = (actionType) => {
    onBulkAction(actionType, selectedStudents);
    setShowBulkActions(false);
  };

  const handleFileImport = (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      onImport(file);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      {/* Top Row - Search and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Left Side - Search and Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1 sm:max-w-md">
            <Icon 
              name="Search" 
              size={20} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
            />
            <Input
              type="search"
              placeholder="Search students by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e?.target?.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={onToggleFilters}
            className="lg:hidden"
          >
            <Icon name="Filter" size={16} />
            Filters
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredStudents} of {totalStudents} students
          </div>
        </div>

        {/* Right Side - Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Import Button */}
          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="import-file"
            />
            <Button variant="outline" className="relative">
              <Icon name="Upload" size={16} />
              <span className="hidden sm:inline ml-2">Import</span>
            </Button>
          </div>

          {/* Export Dropdown */}
          <div className="relative group">
            <Button variant="outline">
              <Icon name="Download" size={16} />
              <span className="hidden sm:inline ml-2">Export</span>
              <Icon name="ChevronDown" size={14} className="ml-1" />
            </Button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              {exportOptions?.map((option) => (
                <button
                  key={option?.value}
                  onClick={() => onExport(option?.value)}
                  className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {option?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Student Button */}
          <Button onClick={onAddStudent}>
            <Icon name="Plus" size={16} />
            <span className="hidden sm:inline ml-2">Add Student</span>
          </Button>
        </div>
      </div>
      {/* Bulk Actions Row - Show when students are selected */}
      {selectedStudents?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Icon name="CheckSquare" size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {selectedStudents?.length} student{selectedStudents?.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  <Icon name="Settings" size={16} />
                  <span className="ml-2">Bulk Actions</span>
                  <Icon name="ChevronDown" size={14} className="ml-1" />
                </Button>
                
                {showBulkActions && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-20">
                    {bulkActionOptions?.map((action) => (
                      <button
                        key={action?.value}
                        onClick={() => handleBulkAction(action?.value)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          action?.value === 'delete-selected' ? 'text-error hover:bg-error/10' : 'text-popover-foreground'
                        }`}
                      >
                        <Icon name={action?.icon} size={16} />
                        <span>{action?.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBulkAction('clear-selection')}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Overlay to close bulk actions dropdown */}
      {showBulkActions && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowBulkActions(false)}
        />
      )}
    </div>
  );
};

export default StudentToolbar;