import React, { useState } from 'react';
import { Opportunity, ReviewQueueItem } from '../types/opportunity';
import { Check, X, Eye, ExternalLink, Calendar, MapPin, Building2, AlertCircle } from 'lucide-react';

interface AdminReviewQueueProps {
  items: ReviewQueueItem[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onInspect: (opp: Opportunity) => void;
  isLoading: boolean;
}

export const AdminReviewQueue: React.FC<AdminReviewQueueProps> = ({
  items,
  onApprove,
  onReject,
  onInspect,
  isLoading,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Does not meet editorial guidelines');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (id: string) => {
    setProcessingId(id);
    try {
      await onReject(id, rejectReason);
      setRejectingId(null);
      setRejectReason('Does not meet editorial guidelines');
    } finally {
      setProcessingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Review Queue is Clear</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          No opportunities are pending human review. When new opportunities are discovered in Approval Mode or flagged by quality gates, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>{items.length} opportunities pending administrative decision</span>
        <span>Review Queue · Zero Fabricated Records Policy</span>
      </div>

      <div className="space-y-3">
        {items.map(queueItem => {
          const opp = queueItem.opportunity;
          if (!opp) return null;

          const isActionBusy = processingId === queueItem.id;

          return (
            <div
              key={queueItem.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-3"
            >
              {/* Header line */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-200">{opp.organizer}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="capitalize text-slate-400">{opp.opportunity_type.replace(/_/g, ' ')}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-emerald-400 font-semibold">Score: {opp.relevance_score}/100</span>
                </div>

                <div className="text-[11px] text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{queueItem.reason}</span>
                </div>
              </div>

              {/* Title & Summary */}
              <div>
                <h4 className="text-base font-semibold text-slate-100 mb-1">
                  {opp.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {opp.summary}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {opp.geographic_eligibility}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Deadline: {opp.deadline_at ? opp.deadline_at.slice(0, 10) : 'Unconfirmed'}
                </span>
                {opp.award_amount_text && (
                  <span className="text-emerald-400 font-medium">
                    Award: {opp.award_amount_text}
                  </span>
                )}
              </div>

              {/* Rejection input if open */}
              {rejectingId === queueItem.id && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3 space-y-2 text-xs">
                  <label className="block font-medium text-amber-200">
                    Reason for rejection:
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    placeholder="Enter rejection reason..."
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setRejectingId(null)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRejectSubmit(queueItem.id)}
                      disabled={isActionBusy}
                      className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                <button
                  onClick={() => onInspect(opp)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 py-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect Extracted Brief & Audit</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRejectingId(queueItem.id)}
                    disabled={isActionBusy}
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-rose-400 hover:border-rose-900/60 hover:bg-rose-950/20 transition-colors disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(queueItem.id)}
                    disabled={isActionBusy}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{isActionBusy ? 'Publishing...' : 'Approve & Publish'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
