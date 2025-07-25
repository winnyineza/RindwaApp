import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface GlobalSearchOptions {
  searchableFields?: string[];
  enableHistory?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number; // in milliseconds
}

interface SearchResult {
  id: string;
  type: 'incident' | 'user' | 'station' | 'organization';
  title: string;
  description?: string;
  url: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

interface CachedSearch {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

const DEFAULT_OPTIONS: GlobalSearchOptions = {
  searchableFields: ['title', 'description', 'location', 'notes'],
  enableHistory: true,
  enableCaching: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

export const useGlobalSearch = (options: GlobalSearchOptions = {}) => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchCache, setSearchCache] = useState<CachedSearch[]>([]);
  const [globalQuery, setGlobalQuery] = useState('');

  // Load search history from localStorage
  useEffect(() => {
    if (mergedOptions.enableHistory && user?.userId) {
      const history = localStorage.getItem(`global-search-history-${user.userId}`);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    }
  }, [user?.userId, mergedOptions.enableHistory]);

  // Save search history to localStorage
  useEffect(() => {
    if (mergedOptions.enableHistory && user?.userId) {
      localStorage.setItem(
        `global-search-history-${user.userId}`,
        JSON.stringify(searchHistory)
      );
    }
  }, [searchHistory, user?.userId, mergedOptions.enableHistory]);

  // Clean up expired cache entries
  useEffect(() => {
    if (mergedOptions.enableCaching) {
      const now = Date.now();
      setSearchCache(prev =>
        prev.filter(cached => now - cached.timestamp < mergedOptions.cacheTimeout!)
      );
    }
  }, [mergedOptions.enableCaching, mergedOptions.cacheTimeout]);

  const addToHistory = useCallback((query: string) => {
    if (!mergedOptions.enableHistory || !query.trim()) return;

    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(h => h !== query)];
      return newHistory.slice(0, 10); // Keep last 10 searches
    });
  }, [mergedOptions.enableHistory]);

  const getCachedResults = useCallback((query: string): SearchResult[] | null => {
    if (!mergedOptions.enableCaching) return null;

    const cached = searchCache.find(c => c.query.toLowerCase() === query.toLowerCase());
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < mergedOptions.cacheTimeout!) {
        return cached.results;
      }
    }
    return null;
  }, [searchCache, mergedOptions.enableCaching, mergedOptions.cacheTimeout]);

  const setCachedResults = useCallback((query: string, results: SearchResult[]) => {
    if (!mergedOptions.enableCaching) return;

    setSearchCache(prev => [
      { query, results, timestamp: Date.now() },
      ...prev.filter(c => c.query.toLowerCase() !== query.toLowerCase())
    ]);
  }, [mergedOptions.enableCaching]);

  const performGlobalSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const response = await fetch('/api/search/global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: query.trim(),
          searchableFields: mergedOptions.searchableFields,
          includeTypes: ['incident', 'user', 'station', 'organization']
        })
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      return data.results || [];

    } catch (error) {
      console.error('Global search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  }, [mergedOptions.searchableFields, toast]);

  const search = useCallback(async (query: string, options?: { useCache?: boolean }) => {
    const useCache = options?.useCache !== false;
    
    if (!query.trim()) {
      setSearchResults([]);
      setGlobalQuery('');
      return [];
    }

    setIsSearching(true);
    setGlobalQuery(query);

    try {
      // Check cache first
      if (useCache) {
        const cachedResults = getCachedResults(query);
        if (cachedResults) {
          setSearchResults(cachedResults);
          setIsSearching(false);
          return cachedResults;
        }
      }

      // Perform actual search
      const results = await performGlobalSearch(query);
      
      // Cache results
      if (useCache) {
        setCachedResults(query, results);
      }

      // Add to history
      addToHistory(query);

      setSearchResults(results);
      return results;

    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [getCachedResults, setCachedResults, addToHistory, performGlobalSearch]);

  const quickSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    // Quick search without updating global state - useful for autocomplete
    if (!query.trim()) return [];

    const cachedResults = getCachedResults(query);
    if (cachedResults) {
      return cachedResults;
    }

    try {
      const results = await performGlobalSearch(query);
      setCachedResults(query, results);
      return results;
    } catch (error) {
      console.error('Quick search error:', error);
      return [];
    }
  }, [getCachedResults, setCachedResults, performGlobalSearch]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setGlobalQuery('');
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    if (user?.userId) {
      localStorage.removeItem(`global-search-history-${user.userId}`);
    }
  }, [user?.userId]);

  const clearCache = useCallback(() => {
    setSearchCache([]);
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory(prev => prev.filter(h => h !== query));
  }, []);

  // Search by category
  const searchByType = useCallback(async (query: string, type: SearchResult['type']) => {
    const allResults = await search(query);
    return allResults.filter(result => result.type === type);
  }, [search]);

  return {
    // State
    isSearching,
    searchResults,
    searchHistory,
    globalQuery,
    
    // Actions
    search,
    quickSearch,
    clearSearch,
    clearHistory,
    clearCache,
    removeFromHistory,
    searchByType,
    
    // Utilities
    addToHistory,
    
    // Options
    options: mergedOptions
  };
}; 