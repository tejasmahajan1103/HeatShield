import React, { useEffect, useState } from 'react';
import { Bookmark, Trash2, ArrowRight, X, Calendar, MapPin } from 'lucide-react';
import type { AssessmentRecord } from '../types';
import { historyService } from '../services/historyService';
import { getRiskBadgeColor } from '../utils/formatters';
import { HeatRiskCard } from '../components/HeatRiskCard';

export const HistoryPage: React.FC = () => {
  const [historyList, setHistoryList] = useState<AssessmentRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const records = await historyService.getHistory();
      setHistoryList(records);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your demo assessment history?')) {
      await historyService.clearHistory();
      setHistoryList([]);
      setSelectedRecord(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Assessment History</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              LocalStorage Persistence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1">Past Heat Risk Evaluations</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Review your saved risk assessments and prior outdoor activity evaluations.
          </p>
        </div>

        {historyList.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-2 transition self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* History List */}
      {loading ? (
        <div className="py-20 text-center space-y-4 animate-pulse">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Retrieving history logs...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm">
          No past assessment records found. Run a new assessment from the Heat Risk tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historyList.map((record) => {
            const badgeStyle = getRiskBadgeColor(record.result.level);
            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="bg-slate-900/90 border border-slate-800 hover:border-orange-500/40 rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{record.date}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Demo Record
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 text-base group-hover:text-orange-300 transition-colors flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>{record.input.location}</span>
                  </h4>

                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Activity:</span>
                      <span className="font-semibold capitalize">{record.input.activity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-semibold">{record.input.durationMinutes} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Solar Exposure:</span>
                      <span className="font-semibold capitalize">{record.input.shadeAvailability.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                    {record.result.level} Risk ({record.result.score}/100)
                  </span>

                  <span className="text-xs text-orange-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-slate-100 text-lg">Assessment Log #{selectedRecord.id}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <HeatRiskCard result={selectedRecord.result} showDetailsLink={false} />

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
