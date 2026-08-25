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
    const finalQuery = targetQuery.trim() || activeTargetRole || 'Software Engineer';
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
          className="p-2 text-ink-dim hover:text-ink hover:bg-surface-light rounded-xl transition-all flex items-center justify-center cursor-pointer"
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
            className={`flex items-center gap-2 bg-surface/90 border ${
              isOpen ? 'border-accent ring-1 ring-accent/30 shadow-lg shadow-accent/10' : 'border-border hover:border-border/80'
            } rounded-xl px-3 py-1.5 transition-all`}
          >
            <Search className="w-4 h-4 text-ink-dim shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholderText}
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink-dim/60 focus:outline-none font-sans"
              aria-label="Quick search jobs and roles"
            />

            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="text-ink-dim hover:text-ink p-0.5 rounded cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 bg-surface-light border border-border text-ink-dim rounded">
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
            className="fixed inset-x-0 top-16 bg-surface/95 backdrop-blur-xl border-b border-border p-3 z-50 md:hidden shadow-2xl"
          >
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-background border border-accent/40 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-accent shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholderText}
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-dim/60 focus:outline-none font-sans"
                  aria-label="Quick search input"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-ink-dim hover:text-ink p-0.5 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-3.5 py-2 bg-accent text-black font-mono font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="p-2 text-ink-dim hover:text-ink rounded-xl"
                aria-label="Close search overlay"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {/* Mobile Suggestions in Dropdown */}
            <div className="mt-3 max-h-72 overflow-y-auto no-scrollbar pt-2 border-t border-border/60">
              {recentSearches.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent" /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearAllRecent}
                      className="text-[10px] font-mono text-ink-dim hover:text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => executeSearch(item)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-light/50 hover:bg-surface-light text-ink text-xs font-sans transition-colors cursor-pointer"
                      >
                        <span className="truncate">{item}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-ink-dim" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div>
                <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider px-1 mb-1.5 block">
                  Popular & Matched Roles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeTargetRole && (
                    <button
                      type="button"
                      onClick={() => executeSearch(activeTargetRole)}
                      className="px-2.5 py-1 bg-accent/15 border border-accent/30 text-accent rounded-lg text-xs font-mono font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> {activeTargetRole}
                    </button>
                  )}
                  {DEFAULT_POPULAR_ROLES.map((role, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => executeSearch(role)}
                      className="px-2.5 py-1 bg-surface-light hover:bg-surface border border-border text-ink rounded-lg text-xs font-sans"
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
            className="hidden md:block absolute top-full left-0 right-0 mt-2 w-80 lg:w-96 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-3 z-50 overflow-hidden"
          >
            {/* Quick Action when query is typed */}
            {query.trim() && (
              <div
                onClick={() => executeSearch(query)}
                className="flex items-center justify-between p-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-xl mb-2 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs text-ink font-semibold truncate">
                    Search for "<span className="text-accent">{query}</span>" in Job Finder
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-accent shrink-0">
                  <span>Enter</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            )}

            {/* Target Role Instant Match */}
            {activeTargetRole && (
              <div className="mb-2.5">
                <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider px-1 mb-1 block">
                  Your Target Role
                </span>
                <button
                  type="button"
                  onClick={() => executeSearch(activeTargetRole)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-accent/5 hover:bg-accent/15 border border-accent/20 text-left cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-bold text-ink">{activeTargetRole}</span>
                  </div>
                  <span className="text-[10px] font-mono text-accent flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Find Openings <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            )}

            {/* Recent Searches Section */}
            {recentSearches.length > 0 && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-ink-dim" /> Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="text-[10px] font-mono text-ink-dim hover:text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => executeSearch(item)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-surface-light text-ink text-xs font-sans transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="w-3 h-3 text-ink-dim group-hover:text-accent shrink-0 transition-colors" />
                        <span className="truncate">{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => removeSearchItem(e, item)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-dim hover:text-rose-400 rounded transition-opacity"
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
              <span className="text-[10px] font-mono font-bold text-ink-dim uppercase tracking-wider px-1 mb-1.5 block">
                Popular Tech Roles
              </span>
              <div className="flex flex-wrap gap-1">
                {DEFAULT_POPULAR_ROLES.map((role, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeSearch(role)}
                    className="px-2.5 py-1 bg-surface-light hover:bg-surface border border-border/80 hover:border-accent/40 text-ink rounded-lg text-[11px] font-sans transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Briefcase className="w-3 h-3 text-ink-dim" />
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
