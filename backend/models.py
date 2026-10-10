from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any

@dataclass
class NormalizedWeatherData:
    locationName: string if False else str
    temperatureC: float
    humidityPercent: float
    uvIndex: float
    wetBulbTempC: float
    windSpeedKmh: float
    conditionText: str
    isDemo: bool
    dataSourceStatus: str  # 'live_sensor' | 'demo_simulated' | 'error_fallback'
    fetchedAt: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    observationTime: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ForecastDataPoint:
    timestamp: str
    temperatureC: float
    humidityPercent: float
    conditionText: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class HeatRiskInputModel:
    location: str
    activity: str  # 'walking' | 'cycling' | 'running' | 'outdoor_work' | 'other'
    plannedTime: str
    durationMinutes: int
    shadeAvailability: str  # 'direct_sun' | 'partial_shade' | 'full_shade'

@dataclass
class HeatRiskResultModel:
    score: int
    level: str  # 'Low' | 'Moderate' | 'High' | 'Extreme'
    levelColor: str
    summary: str
    contributingFactors: List[Dict[str, Any]]
    uncertaintyScore: int
    calculatedAt: str
    disclaimer: str
    demoNotice: str
    modelVersion: str
    metricType: str
    weatherSnapshot: Dict[str, Any]
    heatIndexC: float
    heatIndexF: float
    calculationMethod: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


