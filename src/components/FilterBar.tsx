import React from 'react';
import { Search, X, SlidersHorizontal, MapPin } from 'lucide-react';
import { OpportunityType, GeographicRegion } from '../types/opportunity';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedRegion: string;
  onRegionChange: (reg: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCount: number;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Opportunities' },
  { id: 'grant', label: 'Grants' },
  { id: 'accelerator', label: 'Accelerators' },
  { id: 'startup_competition', label: 'Competitions' },
  { id: 'fellowship', label: 'Fellowships' },
  { id: 'funding_call', label: 'Funding Calls' },
  { id: 'technology_program', label: 'Tech Programs' },
  { id: 'contract_tender', label: 'Tenders & Contracts' },
  { id: 'scholarship', label: 'Scholarships' },
];

const REGIONS: { id: string; label: string }[] = [
  { id: 'all', label: 'Worldwide & All Regions' },
  { id: 'nigeria', label: 'Nigeria (Priority Focus)' },
  { id: 'sub_saharan_africa', label: 'Sub-Saharan Africa' },
  { id: 'pan_africa', label: 'Pan-Africa' },
  { id: 'global', label: 'Global Open' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedRegion,
  onRegionChange,
  sortBy,
  onSortChange,
  totalCount,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search verified opportunities by keyword, organizer, or eligibility..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Region & Sort Selectors */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          {/* Region Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedRegion}
              onChange={e => onRegionChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2.5 pr-8 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer truncate"
            >
              {REGIONS.map(reg => (
                <option key={reg.id} value={reg.id} className="bg-slate-900 text-slate-200">
                  {reg.label}
                </option>
              ))}
            </select>
            <MapPin className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={e => onSortChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2.5 pr-8 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer truncate"
            >
              <option value="score" className="bg-slate-900 text-slate-200">Relevance Score</option>
              <option value="deadline" className="bg-slate-900 text-slate-200">Deadline (Soonest)</option>
              <option value="recent" className="bg-slate-900 text-slate-200">Newest Discovered</option>
            </select>
            <SlidersHorizontal className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Category Segmented Control Tabs (Functional buttons, zero-pill discipline) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Result Count and Active Filters Line */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing <span className="font-semibold text-slate-200">{totalCount}</span> verified opportunities
          {selectedRegion !== 'all' && (
            <span> in <span className="text-emerald-400 capitalize">{selectedRegion.replace(/_/g, ' ')}</span></span>
          )}
        </div>
      </div>
    </div>
  );
};
