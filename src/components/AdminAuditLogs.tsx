import React, { useState } from 'react';
import { AuditEvent } from '../types/opportunity';
import { Search, ShieldAlert, CheckCircle, Radio, Database, FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AuditEvent[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({
  logs,
  isLoading,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'opportunity_published':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
      case 'opportunity_queued':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/40';
      case 'quality_gate_failed':
      case 'verification_flagged':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/40';
      case 'item_deduplicated':
        return 'text-slate-400 bg-slate-900 border-slate-800';
      default:
        return 'text-sky-400 bg-sky-950/60 border-sky-800/40';
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filterType === 'all') return true;
    return l.event_type.includes(filterType);
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Immutable Audit Trail & Intelligence Provenance
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic deduplication checks, AI model extraction tokens, verification passes, and human decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Events</option>
            <option value="discovery">Discovery Runs</option>
            <option value="published">Publications</option>
            <option value="queued">Review Queue</option>
            <option value="deduplicated">Deduplications</option>
            <option value="failed">Quality Gate Rejections</option>
          </select>

          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Refresh Logs
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Event Type</th>
                <th className="py-3 px-4 font-semibold">Actor / Engine</th>
                <th className="py-3 px-4 font-semibold">Entity Target</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map(log => {
                const isExpanded = expandedId === log.id;
                const timeStr = new Date(log.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="cursor-pointer hover:bg-slate-850/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {timeStr}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getEventBadge(log.event_type)}`}>
                          {log.event_type.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {log.actor}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.entity_type}:{log.entity_id.slice(0, 16)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-slate-400 inline-flex items-center gap-1 hover:text-white">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable JSON details row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70">
                        <td colSpan={5} className="p-4 border-t border-slate-800/60">
                          <div className="font-mono text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
