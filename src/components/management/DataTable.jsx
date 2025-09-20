import React from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  searchTerm = '',
  onSearch = () => {},
  emptyState = {},
  onRetry = () => {},
  searchPlaceholder = 'Search...'
}) => {
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return columns.some(column => {
      const value = column.accessor(item);
      return value?.toString().toLowerCase().includes(searchLower);
    });
  });

  const EmptyState = ({ icon, title, description, action }) => (
    <div className="p-8 text-center">
      <Icon name={icon} size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {action && action}
    </div>
  );

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Icon
            name="Search"
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="p-8 text-center">
          <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <Icon name="AlertCircle" size={32} className="mx-auto mb-4 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button onClick={onRetry} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : filteredData.length === 0 ? (
        <EmptyState
          icon={emptyState.icon || 'Users'}
          title={searchTerm ? 'No results found' : (emptyState.title || 'No data yet')}
          description={
            searchTerm 
              ? 'Try adjusting your search terms' 
              : (emptyState.description || 'Get started by adding your first item')
          }
          action={!searchTerm && emptyState.action ? emptyState.action : null}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((column, index) => (
                  <th key={index} className={`text-left p-4 font-semibold text-foreground ${column.className || ''}`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  {columns.map((column, index) => (
                    <td key={index} className={`p-4 ${column.cellClassName || ''}`}>
                      {column.render ? column.render(item) : column.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} items
        </div>
      )}
    </div>
  );
};

export default DataTable;
