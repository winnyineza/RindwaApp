import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { 
  Search, 
  Filter, 
  X, 
  Save, 
  Star, 
  Clock, 
  Settings,
  Download,
  Calendar as CalendarIcon,
  MapPin,
  User,
  AlertTriangle,
  Hash,
  Tag,
  ChevronDown,
  ChevronUp,
  Bookmark,
  History
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SearchFilter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'boolean';
  options?: Array<{ value: string; label: string; }>;
  value?: any;
  placeholder?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  isStarred: boolean;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

interface AdvancedSearchProps {
  onSearch: (filters: Record<string, any>) => void;
  initialFilters?: Record<string, any>;
  searchableFields?: SearchFilter[];
  showSavedSearches?: boolean;
  showGlobalSearch?: boolean;
  placeholder?: string;
}

const DEFAULT_FILTERS: SearchFilter[] = [
  {
    id: 'search',
    label: 'Search Terms',
    type: 'text',
    placeholder: 'Search incidents, descriptions, locations...'
  },
  {
    id: 'status',
    label: 'Status',
    type: 'multiselect',
    options: [
      { value: 'reported', label: '📋 Reported' },
      { value: 'assigned', label: '👤 Assigned' },
      { value: 'in_progress', label: '⚡ In Progress' },
      { value: 'resolved', label: '✅ Resolved' },
      { value: 'escalated', label: '🚨 Escalated' },
      { value: 'closed', label: '🔒 Closed' }
    ]
  },
  {
    id: 'priority',
    label: 'Priority',
    type: 'multiselect',
    options: [
      { value: 'critical', label: '🔴 Critical' },
      { value: 'high', label: '🟠 High' },
      { value: 'medium', label: '🟡 Medium' },
      { value: 'low', label: '🟢 Low' }
    ]
  },
  {
    id: 'type',
    label: 'Incident Type',
    type: 'multiselect',
    options: [
      { value: 'emergency', label: '🚨 Emergency' },
      { value: 'health', label: '🏥 Health' },
      { value: 'fire', label: '🔥 Fire' },
      { value: 'police', label: '👮 Police' },
      { value: 'investigation', label: '🔍 Investigation' },
      { value: 'other', label: '📋 Other' }
    ]
  },
  {
    id: 'assignedTo',
    label: 'Assigned To',
    type: 'select',
    options: [
      { value: 'me', label: '👤 Assigned to Me' },
      { value: 'unassigned', label: '⚪ Unassigned' },
      { value: 'anyone', label: '👥 Anyone' }
    ]
  },
  {
    id: 'dateRange',
    label: 'Date Range',
    type: 'select',
    options: [
      { value: 'today', label: '📅 Today' },
      { value: 'yesterday', label: '📅 Yesterday' },
      { value: 'week', label: '📅 This Week' },
      { value: 'month', label: '📅 This Month' },
      { value: 'custom', label: '📅 Custom Range' }
    ]
  },
  {
    id: 'location',
    label: 'Location',
    type: 'text',
    placeholder: 'Search by location or address...'
  },
  {
    id: 'incidentId',
    label: 'Incident ID',
    type: 'text',
    placeholder: 'Enter incident ID...'
  }
];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  initialFilters = {},
  searchableFields = DEFAULT_FILTERS,
  showSavedSearches = true,
  showGlobalSearch = true,
  placeholder = "Search incidents..."
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchDescription, setSaveSearchDescription] = useState('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const { user } = useAuth();
  const { toast } = useToast();

  // Load saved searches and search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`saved-searches-${user?.userId}`);
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }

    const history = localStorage.getItem(`search-history-${user?.userId}`);
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, [user?.userId]);

  // Save to localStorage when savedSearches or searchHistory changes
  useEffect(() => {
    if (user?.userId) {
      localStorage.setItem(`saved-searches-${user.userId}`, JSON.stringify(savedSearches));
    }
  }, [savedSearches, user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      localStorage.setItem(`search-history-${user.userId}`, JSON.stringify(searchHistory));
    }
  }, [searchHistory, user?.userId]);

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...filters, [filterId]: value };
    
    // Remove filter if value is empty
    if (value === '' || value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0)) {
      const { [filterId]: removed, ...rest } = newFilters;
      setFilters(rest);
    } else {
      setFilters(newFilters);
    }
  };

  const handleSearch = useCallback(() => {
    // Add search term to history if it's not empty and not already in history
    if (filters.search && !searchHistory.includes(filters.search)) {
      setSearchHistory(prev => [filters.search, ...prev.slice(0, 9)]); // Keep last 10 searches
    }

    onSearch(filters);
  }, [filters, onSearch, searchHistory]);

  const handleGlobalSearch = useCallback((term: string) => {
    const globalFilters = { search: term };
    setFilters(globalFilters);
    onSearch(globalFilters);
    
    if (term && !searchHistory.includes(term)) {
      setSearchHistory(prev => [term, ...prev.slice(0, 9)]);
    }
  }, [onSearch, searchHistory]);

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) return;

    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName.trim(),
      description: saveSearchDescription.trim(),
      filters: { ...filters },
      isStarred: false,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 1
    };

    setSavedSearches(prev => [newSavedSearch, ...prev]);
    setSaveSearchName('');
    setSaveSearchDescription('');
    setShowSaveDialog(false);

    toast({
      title: "Search Saved",
      description: `"${newSavedSearch.name}" has been saved to your searches.`,
    });
  };

  const handleLoadSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    onSearch(savedSearch.filters);

    // Update usage stats
    setSavedSearches(prev => 
      prev.map(s => 
        s.id === savedSearch.id 
          ? { ...s, lastUsed: new Date().toISOString(), useCount: s.useCount + 1 }
          : s
      )
    );
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
    toast({
      title: "Search Deleted",
      description: "Saved search has been removed.",
    });
  };

  const handleStarSearch = (searchId: string) => {
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === searchId ? { ...s, isStarred: !s.isStarred } : s
      )
    );
  };

  const clearAllFilters = () => {
    setFilters({});
    onSearch({});
  };

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key];
      return value !== '' && value !== null && value !== undefined && 
             !(Array.isArray(value) && value.length === 0);
    }).length;
  };

  const renderFilterInput = (filter: SearchFilter) => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={filter.placeholder}
            value={filters[filter.id] || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full"
          />
        );

      case 'select':
        return (
          <Select
            value={filters[filter.id] || ''}
            onValueChange={(value) => handleFilterChange(filter.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All {filter.label}</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = filters[filter.id] || [];
        return (
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedValues.length > 0 
                    ? `${selectedValues.length} selected`
                    : `Select ${filter.label.toLowerCase()}...`
                  }
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-2">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filter.options?.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={selectedValues.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const newValues = checked
                            ? [...selectedValues, option.value]
                            : selectedValues.filter((v: string) => v !== option.value);
                          handleFilterChange(filter.id, newValues);
                        }}
                      />
                      <Label htmlFor={option.value} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map((value: string) => {
                  const option = filter.options?.find(o => o.value === value);
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="text-xs"
                    >
                      {option?.label || value}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => {
                          const newValues = selectedValues.filter((v: string) => v !== value);
                          handleFilterChange(filter.id, newValues);
                        }}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Global Search Bar */}
      {showGlobalSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={placeholder}
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleGlobalSearch(globalSearchTerm);
              }
            }}
            className="pl-10 pr-32"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => handleGlobalSearch(globalSearchTerm)}
            >
              Search
            </Button>
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Settings className="h-5 w-5" />
                Advanced Search
              </CardTitle>
              <div className="flex items-center gap-2">
                {showSavedSearches && (
                  <>
                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="h-4 w-4 mr-1" />
                          Save Search
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Search</DialogTitle>
                          <DialogDescription>
                            Save your current search filters for quick access later.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="searchName">Search Name *</Label>
                            <Input
                              id="searchName"
                              placeholder="Enter a name for this search..."
                              value={saveSearchName}
                              onChange={(e) => setSaveSearchName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="searchDescription">Description (Optional)</Label>
                            <Textarea
                              id="searchDescription"
                              placeholder="Describe what this search is for..."
                              value={saveSearchDescription}
                              onChange={(e) => setSaveSearchDescription(e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowSaveDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveSearch}
                            disabled={!saveSearchName.trim()}
                          >
                            Save Search
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  disabled={getActiveFilterCount() === 0}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchableFields.map((filter) => (
                <div key={filter.id} className="space-y-2">
                  <Label className="text-sm font-medium">{filter.label}</Label>
                  {renderFilterInput(filter)}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                {getActiveFilterCount() > 0 && (
                  <span>{getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearAllFilters}>
                  Reset
                </Button>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches & History */}
      {showSavedSearches && (savedSearches.length > 0 || searchHistory.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Bookmark className="h-4 w-4" />
                  Saved Searches ({savedSearches.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {savedSearches.slice(0, 5).map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleLoadSearch(search)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {search.name}
                        </span>
                        {search.isStarred && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      {search.description && (
                        <p className="text-xs text-gray-600 truncate">
                          {search.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Used {search.useCount} times • {format(parseISO(search.lastUsed), 'MMM d')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStarSearch(search.id);
                        }}
                      >
                        <Star className={`h-3 w-3 ${search.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSearch(search.id);
                        }}
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <History className="h-4 w-4" />
                  Recent Searches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {searchHistory.slice(0, 5).map((term, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleGlobalSearch(term)}
                  >
                    <span className="text-sm truncate flex-1">{term}</span>
                    <Clock className="h-3 w-3 text-gray-400" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}; 