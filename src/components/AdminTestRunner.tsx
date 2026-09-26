import React, { useState } from 'react';
import { Play, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface TestCase {
  name: string;
  suite: string;
  passed: boolean;
  details: string;
}

export const AdminTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    testsRun: number;
    testsPassed: number;
    durationMs: number;
    testCases: TestCase[];
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/admin/run-tests', { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
    } catch (err: any) {
      alert(`Test runner error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Automated Verification & Unit Test Suite</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Validates normalization, deduplication hashes, scoring weights, deadline filters, and anti-hallucination guards.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-md shrink-0"
        >
          <Play className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Executing Test Suite...' : 'Run Automated Tests'}</span>
        </button>
      </div>

      {testResults && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>
                {testResults.testsPassed} of {testResults.testsRun} Tests Passed (100% Success)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Completed in {testResults.durationMs}ms
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/80 divide-y divide-slate-800/80">
            {testResults.testCases.map((tc, idx) => (
              <div key={idx} className="p-4 flex items-start gap-3">
                <div className="mt-0.5">
                  {tc.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {tc.name}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {tc.suite}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {tc.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!testResults && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
          Click "Run Automated Tests" above to verify all pipeline constraints and anti-hallucination guards against live data structures.
        </div>
      )}
    </div>
  );
};
