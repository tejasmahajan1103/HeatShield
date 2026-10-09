import type { AssessmentRecord } from '../types';

const HISTORY_STORAGE_KEY = 'heatshield_assessment_history_v1';

const INITIAL_DEMO_HISTORY: AssessmentRecord[] = [
  {
    id: 'rec-101',
    date: 'Today, 02:15 PM',
    input: {
      location: 'Bengaluru Central District',
      activity: 'running',
      activityLabel: 'Running',
      plannedTime: '14:30',
      durationMinutes: 45,
      shadeAvailability: 'direct_sun'
    },
    result: {
      score: 76,
      level: 'High',
      levelColor: '#F97316',
      summary: 'WARNING: High thermal stress. Limit strenuous outdoor work and seek cool spots frequently.',
      contributingFactors: [
        { factor: 'Ambient Temp (37.8°C)', impact: 'High', description: 'High apparent temp reduces sweat cooling.' },
        { factor: 'Activity (Running)', impact: 'High', description: 'High metabolic internal heat.' }
      ],
      uncertaintyScore: 14,
      calculatedAt: '14:15',
      disclaimer: 'Preliminary frontend heuristic score.',
      demoNotice: 'Demo Mode Record',
      weatherSnapshot: {
        locationName: 'Bengaluru Central District',
        temperatureC: 37.8,
        humidityPercent: 62,
        uvIndex: 9.4,
        wetBulbTempC: 29.2,
        windSpeedKmh: 8.5,
        conditionText: 'Hot & Humid',
        isDemo: true,
        fetchedAt: new Date().toISOString()
      }
    },
    isDemo: true
  },
  {
    id: 'rec-102',
    date: 'Yesterday, 10:30 AM',
    input: {
      location: 'Cubbon Park Perimeter',
      activity: 'walking',
      activityLabel: 'Walking',
      plannedTime: '10:30',
      durationMinutes: 30,
      shadeAvailability: 'full_shade'
    },
    result: {
      score: 28,
      level: 'Low',
      levelColor: '#10B981',
      summary: 'Heat stress risk is minimal. Maintain normal hydration.',
      contributingFactors: [
        { factor: 'Full Shade', impact: 'Low', description: 'Canopy cover reduces heat.' }
      ],
      uncertaintyScore: 14,
      calculatedAt: '10:30',
      disclaimer: 'Preliminary frontend heuristic score.',
      demoNotice: 'Demo Mode Record',
      weatherSnapshot: {
        locationName: 'Cubbon Park',
        temperatureC: 31.0,
        humidityPercent: 55,
        uvIndex: 6.0,
        wetBulbTempC: 24.1,
        windSpeedKmh: 12.0,
        conditionText: 'Mild Solar Exposure',
        isDemo: true,
        fetchedAt: new Date().toISOString()
      }
    },
    isDemo: true
  }
];

export interface HistoryService {
  getHistory(): Promise<AssessmentRecord[]>;
  saveAssessment(record: AssessmentRecord): Promise<void>;
  getAssessmentById(id: string): Promise<AssessmentRecord | undefined>;
  clearHistory(): Promise<void>;
}

export class LocalStorageHistoryService implements HistoryService {
  async getHistory(): Promise<AssessmentRecord[]> {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_HISTORY));
        return INITIAL_DEMO_HISTORY;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_DEMO_HISTORY;
    }
  }

  async saveAssessment(record: AssessmentRecord): Promise<void> {
    const list = await this.getHistory();
    const updated = [record, ...list.filter(item => item.id !== record.id)];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  }

  async getAssessmentById(id: string): Promise<AssessmentRecord | undefined> {
    const list = await this.getHistory();
    return list.find(item => item.id === id);
  }

  async clearHistory(): Promise<void> {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }
}

export const historyService = new LocalStorageHistoryService();
