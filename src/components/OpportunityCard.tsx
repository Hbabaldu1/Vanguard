import React from 'react';
import { Opportunity } from '../types/opportunity';
import { ExternalLink, Bookmark, BookmarkCheck, Calendar, MapPin, Building2, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onSelect: (opportunity: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isBookmarked,
  onToggleBookmark,
  onSelect,
}) => {
  const formatDeadline = (dateStr: string | null, tz: string | null) => {
    if (!dateStr) return 'Deadline not confirmed';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Deadline not confirmed';
      const formatted = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return tz ? `${formatted} (${tz})` : formatted;
    } catch {
      return 'Deadline not confirmed';
    }
  };

  const formatCategory = (type: string) => {
    return type
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30';
    if (score >= 65) return 'text-sky-400 border-sky-500/30 bg-sky-950/30';
    return 'text-amber-400 border-amber-500/30 bg-amber-950/30';
  };

  return (
    <article
      onClick={() => onSelect(opportunity)}
      className="group relative cursor-pointer rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 transition-all duration-150 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-lg"
    >
      {/* Quiet 1-line text kicker (NO pill enclosures) */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5 font-medium tracking-wide">
          <span className="text-slate-200">{opportunity.organizer}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-300">{formatCategory(opportunity.opportunity_type)}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-emerald-400/90">{opportunity.geographic_eligibility}</span>
        </div>

        {/* Relevance Score Indicator */}
        <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${getScoreColorClass(opportunity.relevance_score)}`}>
          <span>{opportunity.relevance_score}</span>
          <span className="text-[9px] opacity-75 font-normal">/ 100</span>
        </div>
      </div>

      {/* Primary Headline */}
      <h3 className="text-base font-semibold leading-snug text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2 mb-2">
        {opportunity.title}
      </h3>

      {/* 2-3 sentence editorial summary */}
      <p className="text-xs leading-relaxed text-slate-300/90 line-clamp-3 mb-4">
        {opportunity.summary}
      </p>

      {/* Confirmed Benefits & Award Highlights (if confirmed) */}
      {opportunity.award_amount_text && (
        <div className="mb-3.5 text-xs text-emerald-300/90 font-medium flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Confirmed award: {opportunity.award_amount_text}</span>
        </div>
      )}

      {/* Unboxed Metadata Line with typographic separators */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          {/* Deadline */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className={opportunity.deadline_at ? 'text-slate-300' : 'text-slate-400 italic'}>
              {formatDeadline(opportunity.deadline_at, opportunity.deadline_tz)}
            </span>
          </div>

          <span aria-hidden="true" className="text-slate-700">·</span>

          {/* Verification Status */}
          <div className="flex items-center gap-1 text-[11px]">
            {opportunity.verification_status === 'verified' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified Source
              </span>
            ) : (
              <span className="text-amber-400/90 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Partially Verified
              </span>
            )}
          </div>
        </div>

        {/* Interactive Controls (Actions) */}
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onToggleBookmark(opportunity.id)}
            className={`p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
              isBookmarked ? 'text-emerald-400' : ''
            }`}
            title={isBookmarked ? 'Remove from saved' : 'Save opportunity'}
            aria-label="Save opportunity"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 fill-emerald-400/20" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>

          <a
            href={opportunity.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-emerald-600 hover:text-white transition-colors"
            title="Open official verified application webpage"
          >
            <span>Apply</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
