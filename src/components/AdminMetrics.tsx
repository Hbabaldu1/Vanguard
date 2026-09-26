import React from 'react';
import { Database, ShieldCheck, Clock, Radio, AlertCircle, FileText, CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react';
import { SchedulerHealth, SystemQualitySettings } from '../types/opportunity';

interface AdminMetricsProps {
  metrics: {
    totalDiscovered: number;
    totalVerified: number;
    discoveredToday: number;
    totalPublished: number;
    pendingReview: number;
    totalRejected: number;
    activeSources: number;
    unhealthySources: number;
    totalSources: number;
    totalRuns: number;
    pipelineFailures: number;
    expiredCount: number;
    schedulerState?: SchedulerHealth;
    qualitySettings?: SystemQualitySettings;
    adsenseStatus?: { configured: boolean; enabled: boolean };
  } | null;
  onScanNow: () => void;
  isScanning: boolean;
}

export const AdminMetrics: React.FC<AdminMetricsProps> = ({
  metrics,
  onScanNow,
  isScanning,
}) => {
  if (!metrics) return null;

  const isPaused = metrics.schedulerState?.isPaused || metrics.qualitySettings?.emergencyPause;
  const pubMode = metrics.qualitySettings?.publishingMode || 'approval';
  const hasRuns = metrics.totalRuns > 0;

  return (
    <div className="space-y-4">
      {/* Top Banner with Scheduler & Publishing Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
            isPaused
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                {isPaused ? 'Discovery Scheduler Paused' : `Continuous Discovery Worker (${metrics.schedulerState?.intervalMinutes || 15}m interval)`}
              </h2>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                pubMode === 'auto'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-indigo-950 text-indigo-300 border-indigo-800'
              }`}>
                {pubMode === 'auto' ? 'Auto-Publishing Active' : 'Manual Approval Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasRuns
                ? `Last cycle completed: ${metrics.schedulerState?.lastRunAt ? new Date(metrics.schedulerState.lastRunAt).toLocaleTimeString() : 'Recently'}`
                : 'Awaiting first scheduled discovery cycle (clean production state)'}
            </p>
          </div>
        </div>

        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shrink-0"
        >
          <Radio className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Live Feeds...' : 'Trigger Discovery Cycle'}</span>
        </button>
      </div>

      {/* Metric Cards Grid - 100% Real Database Values */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Published */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Published Opportunities</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {metrics.totalPublished}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.totalPublished === 0 ? 'Awaiting verified items' : 'Live on public portal'}
          </div>
        </div>

        {/* Pending Review Queue */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Review Queue</span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {metrics.pendingReview}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.pendingReview === 0 ? 'Queue is clear' : 'Awaiting admin decision'}
          </div>
        </div>

        {/* Total Discovered */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Discovered</span>
            <Database className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {metrics.totalDiscovered}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.totalRuns === 0 ? 'Awaiting first run' : `${metrics.totalRuns} cycles executed`}
          </div>
        </div>

        {/* Active Sources Health */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Source Feeds</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {metrics.activeSources} <span className="text-xs text-slate-400 font-normal">/ {metrics.totalSources}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.unhealthySources > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {metrics.unhealthySources} unhealthy
              </span>
            ) : (
              'All monitored sources healthy'
            )}
          </div>
        </div>
      </div>

      {/* Secondary Operational Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
          <div className="text-slate-400 font-medium mb-1">Verified / Quality Passed</div>
          <div className="text-lg font-bold text-slate-200">
            {metrics.totalVerified} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metrics.totalRejected} rejected by quality gates
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
          <div className="text-slate-400 font-medium mb-1">Pipeline Reliability</div>
          <div className="text-lg font-bold text-slate-200">
            {metrics.pipelineFailures === 0 ? '100%' : `${Math.round(((metrics.totalRuns - metrics.pipelineFailures) / Math.max(1, metrics.totalRuns)) * 100)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metrics.pipelineFailures} failed run cycles
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
          <div className="text-slate-400 font-medium mb-1">Google AdSense Layer</div>
          <div className="text-lg font-bold text-slate-200">
            {metrics.adsenseStatus?.configured ? (
              <span className="text-emerald-400">Configured</span>
            ) : (
              <span className="text-slate-400">Unconfigured</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metrics.adsenseStatus?.enabled ? 'Active on public portal' : 'Pending publisher credentials'}
          </div>
        </div>
      </div>
    </div>
  );
};
