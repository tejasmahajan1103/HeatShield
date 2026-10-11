
import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, AlertTriangle, History, ThermometerSun } from 'lucide-react';
import { riskHistoryService, type RiskHistoryRecord } from '../services/riskHistoryService';

export const RiskHistoryPage: React.FC = () => {
  const [records, setRecords] = useState<RiskHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const history = await riskHistoryService.getHistory();
      setRecords(history);
    } catch {
      setError(
        'Unable to load risk history. Check the API deployment and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-orange-600">
            <History className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Assessment Records
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">Risk History</h1>
          <p className="mt-2 text-sm text-slate-600">
            Review your recent heat-risk assessments from this browser.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {loading && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading your assessment history…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">History unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
              <p className="mt-2 text-xs">
                The history API must be deployed before saved records can be retrieved.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Clock className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No assessments yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Complete a heat-risk assessment to start building your history.
          </p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500">
            {records.length} recent assessment{records.length === 1 ? '' : 's'}
            {' · '}maximum 20
          </p>

          {records.map((record) => {
            const assessment = record.assessment;

            return (
              <article
                key={record.assessmentId}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-slate-900">
                      {assessment.location}
                    </h2>
                    <p className="mt-1 text-sm capitalize text-slate-600">
                      {assessment.activity} · {assessment.durationMinutes} minutes
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(record.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">
                        {assessment.score}/100
                      </p>
                      <p className="text-sm font-semibold text-orange-700">
                        {assessment.level}
                      </p>
                    </div>
                    <ThermometerSun className="h-7 w-7 shrink-0 text-orange-500" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4 text-xs">
                  {assessment.temperatureC !== undefined && (
                    <span className="rounded-lg bg-stone-100 px-3 py-2 text-slate-700">
                      Temperature: {assessment.temperatureC}°C
                    </span>
                  )}
                  {assessment.humidity !== undefined && (
                    <span className="rounded-lg bg-stone-100 px-3 py-2 text-slate-700">
                      Humidity: {assessment.humidity}%
                    </span>
                  )}
                  <span className="rounded-lg bg-stone-100 px-3 py-2 text-slate-700">
                    {assessment.isDemo ? 'Simulated weather' : `Source: ${assessment.dataSourceStatus}`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RiskHistoryPage;
