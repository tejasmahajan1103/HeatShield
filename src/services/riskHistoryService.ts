
import type { HeatRiskInput, HeatRiskResult } from '../types';
const API_BASE_URL = (() => {
  const customBase =
    (import.meta.env?.VITE_API_BASE_URL as string) ||
    (import.meta.env?.VITE_WEATHER_API_URL as string);

  if (customBase) {
    const cleanBase = customBase.replace(/\/+$/, '');

    if (cleanBase.endsWith('/api/weather')) {
      return cleanBase.replace(/\/weather$/, '');
    }

    return cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
  }

  if (import.meta.env?.DEV) {
    return 'http://127.0.0.1:8000/api';
  }

  return 'https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api';
})();

const STORAGE_KEY = 'heatshield-risk-history-session-v1';

export interface RiskHistoryAssessment {
  location: string;
  activity: string;
  durationMinutes: number;
  score: number;
  level: string;
  heatIndexC?: number;
  heatIndexF?: number;
  temperatureC?: number;
  humidity?: number;
  isDemo: boolean;
  dataSourceStatus: string;
  calculatedAt: string;
  modelVersion?: string;
}

export interface RiskHistoryRecord {
  sessionId: string;
  assessmentKey: string;
  assessmentId: string;
  timestamp: string;
  assessment: RiskHistoryAssessment;
}

interface SaveHistoryResponse {
  saved: boolean;
  assessmentId: string;
  timestamp: string;
}

interface HistoryResponse {
  items: RiskHistoryRecord[];
  count: number;
}

function getSessionId(): string {
  if (typeof window === 'undefined') {
    throw new Error('Risk history requires a browser session.');
  }

  let sessionId = window.localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = window.crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

function getAssessmentPayload(
  input: HeatRiskInput,
  result: HeatRiskResult,
): RiskHistoryAssessment {
  const weather = result.weatherSnapshot;

  return {
    location: input.location,
    activity: input.activity,
    durationMinutes: input.durationMinutes,
    score: result.score,
    level: result.level,
    heatIndexC: result.heatIndexC,
    heatIndexF: result.heatIndexF,
    temperatureC: weather?.temperatureC,
    humidity: weather?.humidityPercent,
    isDemo: Boolean(weather?.isDemo),
    dataSourceStatus: weather?.dataSourceStatus ?? 'unknown',
    calculatedAt: result.calculatedAt,
    modelVersion: result.modelVersion,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Risk history request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export const riskHistoryService = {
  async saveAssessment(
    input: HeatRiskInput,
    result: HeatRiskResult,
  ): Promise<SaveHistoryResponse> {
    const response = await fetch(`${API_BASE_URL}/risk-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        assessment: getAssessmentPayload(input, result),
      }),
    });

    return parseResponse<SaveHistoryResponse>(response);
  },

  async getHistory(): Promise<RiskHistoryRecord[]> {
    const sessionId = getSessionId();
    const params = new URLSearchParams({ sessionId });

    const response = await fetch(
      `${API_BASE_URL}/risk-history?${params.toString()}`,
    );

    const data = await parseResponse<HistoryResponse>(response);
    return data.items;
  },
};
