import React, { useState } from 'react';
import { Source } from '../types/opportunity';
import {
  ShieldCheck,
  Radio,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  X,
} from 'lucide-react';

interface AdminSourcesProps {
  sources: Source[];
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  onAddSource: (source: Partial<Source>) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onTestSource: (id: string) => Promise<any>;
}

export const AdminSources: React.FC<AdminSourcesProps> = ({
  sources,
  onToggleEnabled,
  onAddSource,
  onDeleteSource,
  onTestSource,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; data: any } | null>(null);

  // New source form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'rss' | 'api' | 'webpage'>('rss');
  const [category, setCategory] = useState('grant');
  const [region, setRegion] = useState('pan_africa');
  const [fetchInterval, setFetchInterval] = useState(15);
  const [reliabilityScore, setReliabilityScore] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await onTestSource(id);
      setTestResult({ id, data: res });
    } catch (err: any) {
      setTestResult({ id, data: { success: false, error: err.message } });
    } finally {
      setTestingId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setIsSubmitting(true);
    try {
      await onAddSource({
        name,
        url,
        type,
        category: category as any,
        region: region as any,
        fetch_interval_minutes: Number(fetchInterval),
        reliability_score: Number(reliabilityScore),
      });
      setIsAddModalOpen(false);
      setName('');
      setUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Configured Opportunity Feeds & Adapters
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sources can be individually tested, enabled, disabled, and monitored with isolated error handling.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Source Feed</span>
        </button>
      </div>

      {/* Sources Table / List */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Source Name & Feed</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Region / Scope</th>
                <th className="py-3 px-4 font-semibold">Poll Interval</th>
                <th className="py-3 px-4 font-semibold">Reliability</th>
                <th className="py-3 px-4 font-semibold">Status / Last Poll</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sources.map(src => {
                const isTesting = testingId === src.id;
                const hasError = Boolean(src.last_error);

                return (
                  <tr key={src.id} className="hover:bg-slate-850/50 transition-colors">
                    {/* Name & URL */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{src.name}</span>
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400/80 hover:underline truncate max-w-xs block mt-0.5"
                      >
                        {src.url}
                      </a>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="uppercase text-[10px] font-semibold tracking-wide text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {src.type}
                      </span>
                    </td>

                    {/* Region */}
                    <td className="py-3.5 px-4 capitalize text-slate-300">
                      {src.region.replace(/_/g, ' ')}
                    </td>

                    {/* Interval */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {src.fetch_interval_minutes}m
                    </td>

                    {/* Reliability */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-semibold text-emerald-400">
                        <span>{src.reliability_score}%</span>
                      </div>
                    </td>

                    {/* Status & Last poll */}
                    <td className="py-3.5 px-4">
                      {hasError ? (
                        <div className="text-amber-400 text-[11px] flex items-center gap-1" title={src.last_error || ''}>
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[140px]">{src.last_error}</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[11px]">
                          {src.last_polled_at
                            ? `Polled ${new Date(src.last_polled_at).toLocaleTimeString()}`
                            : 'Pending first scan'}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Test button */}
                        <button
                          onClick={() => handleTest(src.id)}
                          disabled={isTesting}
                          className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                          title="Test live feed connectivity"
                        >
                          <Play className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                        </button>

                        {/* Toggle active button */}
                        <button
                          onClick={() => onToggleEnabled(src.id, !src.enabled)}
                          className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            src.enabled
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {src.enabled ? 'Enabled' : 'Disabled'}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => {
                            if (confirm(`Remove source "${src.name}"?`)) {
                              onDeleteSource(src.id);
                            }
                          }}
                          className="rounded p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                          title="Delete source"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Result Callout if active */}
      {testResult && (
        <div className={`rounded-xl border p-4 text-xs ${
          testResult.data.success
            ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200'
            : 'border-rose-800/60 bg-rose-950/20 text-rose-200'
        }`}>
          <div className="flex items-center justify-between font-semibold mb-2">
            <span>Live Adapter Connectivity Test Result:</span>
            <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {testResult.data.success ? (
            <div className="space-y-1.5">
              <div>
                Verified <strong>{testResult.data.itemsFound}</strong> live items from source in <strong>{testResult.data.durationMs}ms</strong>.
              </div>
              {testResult.data.sampleHeadlines && (
                <div className="pt-1">
                  <span className="text-slate-400 font-medium block">Recent headlines detected:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-300 mt-1">
                    {testResult.data.sampleHeadlines.map((h: any, i: number) => (
                      <li key={i} className="truncate">{h.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>Error: {testResult.data.error}</div>
          )}
        </div>
      )}

      {/* Add Source Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-semibold">Add New Opportunity Source</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Source Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. African Development Bank Tenders"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Feed / API Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.org/feed.xml"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Adapter Type
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="rss">RSS / Atom Feed</option>
                    <option value="api">Structured JSON API</option>
                    <option value="webpage">Permitted Web Listing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Opportunity Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="grant">Grant</option>
                    <option value="accelerator">Accelerator</option>
                    <option value="startup_competition">Startup Competition</option>
                    <option value="fellowship">Fellowship</option>
                    <option value="funding_call">Funding Call</option>
                    <option value="technology_program">Technology Program</option>
                    <option value="contract_tender">Contract / Tender</option>
                    <option value="scholarship">Scholarship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Geographic Region
                  </label>
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="nigeria">Nigeria Focus</option>
                    <option value="sub_saharan_africa">Sub-Saharan Africa</option>
                    <option value="pan_africa">Pan-Africa</option>
                    <option value="global">Global / Worldwide</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Discovery Interval
                  </label>
                  <select
                    value={fetchInterval}
                    onChange={e => setFetchInterval(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
