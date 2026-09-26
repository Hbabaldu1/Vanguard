import React, { useState } from 'react';
import { SystemQualitySettings, SchedulerHealth } from '../types/opportunity';
import { Sliders, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface AdminSettingsProps {
  settings: SystemQualitySettings;
  scheduler: SchedulerHealth;
  onUpdateSettings: (newSettings: Partial<SystemQualitySettings>) => Promise<void>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  scheduler,
  onUpdateSettings,
}) => {
  const [publishingMode, setPublishingMode] = useState(settings.publishingMode);
  const [emergencyPause, setEmergencyPause] = useState(settings.emergencyPause);
  const [discoveryInterval, setDiscoveryInterval] = useState(settings.discoveryIntervalMinutes);
  const [minimumScore, setMinimumScore] = useState(settings.minimumScoreToPublish);
  const [nigeriaBoost, setNigeriaBoost] = useState(settings.nigeriaPriorityBoost);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onUpdateSettings({
        publishingMode,
        emergencyPause,
        discoveryIntervalMinutes: discoveryInterval,
        minimumScoreToPublish: Number(minimumScore),
        nigeriaPriorityBoost: Number(nigeriaBoost),
      });
      setSaveMessage('Quality gates & scheduler settings updated successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-base font-semibold text-slate-100">
          Publishing Modes, Quality Gates & Scheduling Architecture
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure publication thresholds, scheduling cadence, and emergency kill switches.
        </p>
      </div>

      {saveMessage && (
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 1. Emergency Pause Switch */}
      <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
              <ShieldAlert className="h-4 w-4" />
              <span>Emergency Pipeline Pause</span>
            </div>
            <p className="text-xs text-rose-200/80 leading-relaxed">
              Instantly suspends all automated publishing and enqueues all incoming opportunities into the review queue. Existing published items remain viewable unless individually rolled back.
            </p>
          </div>

          <button
            onClick={() => setEmergencyPause(!emergencyPause)}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all shrink-0 ${
              emergencyPause
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {emergencyPause ? 'Emergency Pause Active' : 'Normal Operation'}
          </button>
        </div>
      </div>

      {/* 2. Publishing Mode: Approval Mode vs Auto-Publishing */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Publishing Mode
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Approval Mode */}
          <div
            onClick={() => setPublishingMode('approval')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              publishingMode === 'approval'
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm text-slate-100">
                Admin Approval Mode (Default)
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${publishingMode === 'approval' ? 'bg-indigo-400' : 'bg-slate-700'}`}></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every discovered and verified opportunity is routed to the Review Queue for human administrator confirmation before being published to the website or channels.
            </p>
          </div>

          {/* Auto Mode */}
          <div
            onClick={() => setPublishingMode('auto')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              publishingMode === 'auto'
                ? 'border-emerald-500 bg-emerald-950/30'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm text-slate-100">
                Automated Publishing Mode
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${publishingMode === 'auto' ? 'bg-emerald-400' : 'bg-slate-700'}`}></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Opportunities meeting or exceeding the minimum quality score threshold and passing all verification checks are published immediately upon discovery.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Persistent Backend Scheduler Interval */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Backend Discovery Scheduler Cadence
          </h4>
          <p className="text-xs text-slate-400">
            Persistent Node.js interval worker checks source adapters autonomously in the background. Configurable to 10, 15, 20, or 30 minutes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[10, 15, 20, 30].map(mins => {
            const isSelected = discoveryInterval === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => setDiscoveryInterval(mins as any)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-lg font-bold">{mins} min</div>
                <div className="text-[10px] opacity-75 mt-0.5">Cadence</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Quality Gate Score Threshold Slider */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Minimum Relevance Score Threshold
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Opportunities with scores below this threshold are placed in the Review Queue.
            </p>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {minimumScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
        </div>

        <input
          type="range"
          min={50}
          max={90}
          step={5}
          value={minimumScore}
          onChange={e => setMinimumScore(Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>50 (Permissive)</span>
          <span>70 (Balanced Standard)</span>
          <span>90 (Strict Excellence)</span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-md"
        >
          {isSaving ? 'Saving Configurations...' : 'Save System Settings'}
        </button>
      </div>
    </div>
  );
};
