import React from 'react';
import { Opportunity } from '../types/opportunity';
import {
  X,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Calendar,
  MapPin,
  Building2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
  Info,
  Clock,
  Layers,
  Award,
} from 'lucide-react';

interface OpportunityDetailModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  isBookmarked,
  onToggleBookmark,
}) => {
  if (!isOpen || !opportunity) return null;

  const formatDeadline = (dateStr: string | null, tz: string | null) => {
    if (!dateStr) return 'Deadline not confirmed';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Deadline not confirmed';
      const formatted = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      return tz ? `${formatted} (${tz})` : formatted;
    } catch {
      return 'Deadline not confirmed';
    }
  };

  const formatVerifiedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden text-slate-100 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          {/* Unboxed breadcrumb metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{opportunity.organizer}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="capitalize">{opportunity.opportunity_type.replace(/_/g, ' ')}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400 font-medium">Relevance Score: {opportunity.relevance_score}/100</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(opportunity.id)}
              className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
                isBookmarked ? 'text-emerald-400' : ''
              }`}
              title={isBookmarked ? 'Saved' : 'Save opportunity'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-5 w-5 fill-emerald-400/20" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Main Title & Kicker */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 leading-tight">
              {opportunity.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Hosted by <strong className="text-slate-200 font-medium">{opportunity.organizer}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {opportunity.geographic_eligibility}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Last verified: {formatVerifiedDate(opportunity.last_verified_at)}
              </span>
            </div>
          </div>

          {/* Prominent Official Application Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                Official Application Window
              </div>
              <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                {formatDeadline(opportunity.deadline_at, opportunity.deadline_tz)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Applications submitted directly through the organizer's verified portal.
              </p>
            </div>

            <a
              href={opportunity.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm shrink-0"
            >
              <span>Apply on official website</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          {/* Editorial Summary */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Opportunity Brief
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">
              {opportunity.summary}
            </p>
          </div>

          {/* Benefits Description / Confirmed Award */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-400" />
              What the Applicant Receives
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {opportunity.benefits_description}
            </p>
            {opportunity.award_amount_text && (
              <div className="mt-2 text-xs font-medium text-emerald-400">
                Confirmed Financial Amount: {opportunity.award_amount_text}
              </div>
            )}
          </div>

          {/* Who Can Apply & Geographic Eligibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Who Can Apply
              </h3>
              <p className="text-sm text-slate-200">
                {opportunity.target_audience}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Eligible Locations
              </h3>
              <p className="text-sm text-slate-200">
                {opportunity.geographic_eligibility}
              </p>
            </div>
          </div>

          {/* Key Requirements Checklist */}
          {opportunity.requirements && opportunity.requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Key Requirements
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {opportunity.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Application Steps */}
          {opportunity.application_steps && opportunity.application_steps.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Application Steps
              </h3>
              <ol className="space-y-2 text-sm text-slate-300">
                {opportunity.application_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Why This May Matter */}
          <div className="rounded-xl border border-indigo-900/30 bg-indigo-950/15 p-4">
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-indigo-400" />
              Why This May Matter
            </h3>
            <p className="text-xs leading-relaxed text-indigo-200/90">
              {opportunity.why_it_matters}
            </p>
          </div>

          {/* Information Not Confirmed Disclaimer Note */}
          {opportunity.unconfirmed_info_notes && (
            <div className="rounded-xl border border-amber-900/30 bg-amber-950/15 p-3.5 text-xs text-amber-200/90 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-300">Information Disclosure:</strong>
                <span>{opportunity.unconfirmed_info_notes}</span>
              </div>
            </div>
          )}

          {/* Sourced Provenance & Verification Audit Trail */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Source Provenance & Verification
              </span>
              <span className="text-[11px] text-slate-400">
                ID: {opportunity.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
              <div>
                <span className="text-slate-400">Canonical Landing Page:</span>
                <a
                  href={opportunity.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-emerald-400 hover:underline truncate mt-0.5"
                >
                  {opportunity.canonical_url}
                </a>
              </div>
              <div>
                <span className="text-slate-400">Direct Application Page:</span>
                <a
                  href={opportunity.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-emerald-400 hover:underline truncate mt-0.5"
                >
                  {opportunity.application_url}
                </a>
              </div>
            </div>

            {/* Score Breakdown Radar */}
            {opportunity.score_breakdown && (
              <div className="pt-2 border-t border-slate-800/80 text-xs">
                <div className="text-slate-300 font-medium mb-1.5">
                  Relevance Score Breakdown ({opportunity.relevance_score}/100):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                    <div className="text-slate-400">Authority</div>
                    <div className="font-semibold text-slate-200">{opportunity.score_breakdown.sourceAuthority}/20</div>
                  </div>
                  <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                    <div className="text-slate-400">Eligibility</div>
                    <div className="font-semibold text-emerald-400">{opportunity.score_breakdown.eligibilityMatch}/25</div>
                  </div>
                  <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                    <div className="text-slate-400">Deadline</div>
                    <div className="font-semibold text-slate-200">{opportunity.score_breakdown.deadlineValidity}/20</div>
                  </div>
                  <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                    <div className="text-slate-400">Value</div>
                    <div className="font-semibold text-slate-200">{opportunity.score_breakdown.opportunityValue}/20</div>
                  </div>
                  <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                    <div className="text-slate-400">Completeness</div>
                    <div className="font-semibold text-slate-200">{opportunity.score_breakdown.completeness}/15</div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 italic pt-1">
              Note: Vanguard publishes independently verified intelligence. Listings do not constitute commercial endorsement by the organizer or funder.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <a
            href={opportunity.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <span>Proceed to Official Application</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
