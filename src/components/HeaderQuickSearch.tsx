import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ArrowRight, Sparkles, Briefcase, CornerDownLeft } from 'lucide-react';
import { useSystemOS } from '../context/SystemOSContext';
import { motion, AnimatePresence } from 'motion/react';

const RECENT_SEARCHES_KEY = 'ai_hireflow_recent_searches';
const MAX_RECENT_SEARCHES = 6;

const DEFAULT_POPULAR_ROLES = [
  'Full Stack Engineer',
  'Frontend Developer',
  'Backend Engineer',
  'Machine Learning Engineer',
  'DevOps & Cloud Architect',
];

export default function HeaderQuickSearch() {
  const navigate = useNavigate();
  const { activeTargetRole } = useSystemOS();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((item) => typeof item === 'string' && item.trim().length > 0));
        }
      }
    } catch (e) {
      console.warn('Could not read recent searches from localStorage', e);
    }
  }, []);

  // Save query to recent searches helper
  const saveSearchToHistory = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not write recent searches to localStorage', e);
      }
      return updated;
    });
  };

  const removeSearchItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (err) {
      console.warn(err);
    }
  };

  // Execute search navigation
  const executeSearch = (targetQuery: string) => {
    const finalQuery = targetQuery.trim() || activeTargetRole;
    if (!finalQuery) return;
    saveSearchToHistory(finalQuery);
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    inputRef.current?.blur();
    mobileInputRef.current?.blur();

    navigate('/finder', {
      state: {
        query: finalQuery,
        autoSearch: true,
      },
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    } else if (activeTargetRole) {
      executeSearch(activeTargetRole);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus mobile search input when expanded
  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
    }
  }, [isMobileSearchOpen]);

  const placeholderText = activeTargetRole ? `Search jobs (e.g. ${activeTargetRole})...` : 'Search jobs, roles, companies...';

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Mobile Trigger Button (icon only on mobile < md) */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen((prev) => !prev);
            setIsOpen(true);
          }}
          className="min-h-[44px] min-w-[44px] p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-surface-secondary)] rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--hf-cta)]"
          aria-label="Open Quick Job Search"
          title="Quick Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Search Bar (visible on md+) */}
      <div className="hidden md:block w-64 lg:w-80">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`flex items-center gap-2 bg-[var(--hf-surface-secondary)] border ${
              isOpen ? 'border-[var(--hf-cta)] ring-1 ring-[var(--hf-cta)]/30 shadow-xs' : 'border-[var(--hf-border)] hover:border-[var(--hf-text-muted)]'
            } rounded-lg px-3 py-1.5 transition-all`}
          >
            <Search className="w-4 h-4 text-[var(--hf-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholderText}
              className="w-full bg-transparent text-xs text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none font-sans"
              aria-label="Quick search jobs and roles"
            />

            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] p-0.5 rounded cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-[var(--hf-surface)] border border-[var(--hf-border)] text-[var(--hf-text-muted)] rounded">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
            )}
          </div>
        </form>
      </div>

      {/* Mobile Search Overlay / Modal Expansion */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-0 top-16 bg-[var(--hf-surface)] border-b border-[var(--hf-border)] p-3 z-50 md:hidden shadow-lg"
          >
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[var(--hf-surface-secondary)] border border-[var(--hf-cta)]/40 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-[var(--hf-cta)] shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholderText}
                  className="w-full bg-transparent text-sm text-[var(--hf-text)] placeholder:text-[var(--hf-text-muted)] focus:outline-none font-sans"
                  aria-label="Quick search input"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-[var(--hf-text-muted)] hover:text-[var(--hf-text)] p-0.5 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="hf-btn-primary min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg shadow-xs cursor-pointer shrink-0"
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="min-h-[40px] min-w-[40px] p-2 text-[var(--hf-text-secondary)] hover:text-[var(--hf-text)] rounded-lg flex items-center justify-center"
                aria-label="Close search overlay"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {/* Mobile Suggestions in Dropdown */}
            <div className="mt-3 max-h-72 overflow-y-auto no-scrollbar pt-2 border-t border-[var(--hf-border)]">
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-xs font-semibold text-[var(--hf-text-secondary)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--hf-cta)]" /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearAllRecent}
                      className="text-xs text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => executeSearch(item)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--hf-surface-secondary)]/50 hover:bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] text-xs font-sans transition-colors cursor-pointer"
                      >
                        <span className="truncate">{item}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--hf-text-muted)]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div>
                <span className="text-xs font-semibold text-[var(--hf-text-secondary)] px-1 mb-1.5 block">
                  Popular & Matched Roles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeTargetRole && (
                    <button
                      type="button"
                      onClick={() => executeSearch(activeTargetRole)}
                      className="px-2.5 py-1 bg-[var(--hf-cta)]/10 border border-[var(--hf-cta)]/20 text-[var(--hf-cta)] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> {activeTargetRole}
                    </button>
                  )}
                  {DEFAULT_POPULAR_ROLES.map((role, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => executeSearch(role)}
                      className="px-2.5 py-1 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-border)] border border-[var(--hf-border)] text-[var(--hf-text)] rounded-lg text-xs font-sans cursor-pointer transition-colors"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="hidden md:block absolute top-full left-0 right-0 mt-2 w-80 lg:w-96 bg-[var(--hf-surface)] border border-[var(--hf-border)] rounded-xl shadow-lg p-3 z-50 overflow-hidden"
          >
            {/* Quick Action when query is typed */}
            {query.trim() && (
              <div
                onClick={() => executeSearch(query)}
                className="flex items-center justify-between p-2.5 bg-[var(--hf-cta)]/10 hover:bg-[var(--hf-cta)]/15 border border-[var(--hf-cta)]/20 rounded-lg mb-2 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-4 h-4 text-[var(--hf-cta)] shrink-0" />
                  <span className="text-xs text-[var(--hf-text)] font-semibold truncate">
                    Search for "<span className="text-[var(--hf-cta)]">{query}</span>" in Job Finder
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--hf-cta)] shrink-0">
                  <span>Enter</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            )}

            {/* Target Role Instant Match */}
            {activeTargetRole && (
              <div className="mb-2.5">
                <span className="text-xs font-semibold text-[var(--hf-text-secondary)] px-1 mb-1 block">
                  Your Target Role
                </span>
                <button
                  type="button"
                  onClick={() => executeSearch(activeTargetRole)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-border)] border border-[var(--hf-border)] text-left cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--hf-cta)]" />
                    <span className="text-xs font-semibold text-[var(--hf-text)]">{activeTargetRole}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--hf-cta)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Find Openings <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            )}

            {/* Recent Searches Section */}
            {recentSearches.length > 0 && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-xs font-semibold text-[var(--hf-text-secondary)] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--hf-text-muted)]" /> Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="text-xs text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => executeSearch(item)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--hf-surface-secondary)] text-[var(--hf-text)] text-xs font-sans transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="w-3 h-3 text-[var(--hf-text-muted)] group-hover:text-[var(--hf-cta)] shrink-0 transition-colors" />
                        <span className="truncate">{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => removeSearchItem(e, item)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--hf-text-muted)] hover:text-[var(--hf-error)] rounded transition-opacity"
                        aria-label={`Remove ${item} from history`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Suggestions */}
            <div>
              <span className="text-xs font-semibold text-[var(--hf-text-secondary)] px-1 mb-1.5 block">
                Popular Tech Roles
              </span>
              <div className="flex flex-wrap gap-1">
                {DEFAULT_POPULAR_ROLES.map((role, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeSearch(role)}
                    className="px-2.5 py-1 bg-[var(--hf-surface-secondary)] hover:bg-[var(--hf-border)] border border-[var(--hf-border)] text-[var(--hf-text)] rounded-md text-[11px] font-sans transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Briefcase className="w-3 h-3 text-[var(--hf-text-muted)]" />
                    <span>{role}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
