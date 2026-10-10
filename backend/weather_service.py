import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from config import OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL, HTTP_TIMEOUT_SECONDS
from models import NormalizedWeatherData, ForecastDataPoint
from openweather_adapter import OpenWeatherAdapter, OpenWeatherError

class WeatherService:
    def __init__(self, api_key: str = OPENWEATHER_API_KEY, base_url: str = OPENWEATHER_BASE_URL, timeout: float = HTTP_TIMEOUT_SECONDS):
        self.api_key = api_key
        self.adapter = OpenWeatherAdapter(api_key=api_key, base_url=base_url, timeout=timeout)

    def is_live_configured(self) -> bool:
        return bool(self.api_key and self.api_key != "your_openweather_api_key_here")

    def get_weather(self, location: str, allow_demo_fallback: bool = False) -> NormalizedWeatherData:
        if self.is_live_configured():
            return self.adapter.fetch_current_weather(location)
        
        if allow_demo_fallback:
            return self.get_demo_weather(location)
        
        raise OpenWeatherError(
            "Live weather service is unavailable: OPENWEATHER_API_KEY is not configured. Please set a valid API key in backend/.env or run in demo mode.",
            status_code=401,
            error_code="MISSING_API_KEY"
        )

    def get_forecast(self, location: str, allow_demo_fallback: bool = False) -> List[ForecastDataPoint]:
        if self.is_live_configured():
            return self.adapter.fetch_forecast(location)
        
        if allow_demo_fallback:
            return [
                ForecastDataPoint(timestamp="Today +3h", temperatureC=36.5, humidityPercent=55.0, conditionText="Partly Cloudy"),
                ForecastDataPoint(timestamp="Today +6h", temperatureC=34.0, humidityPercent=60.0, conditionText="Clear"),
            ]
        
        raise OpenWeatherError(
            "Live forecast service is unavailable: OPENWEATHER_API_KEY is not configured.",
            status_code=401,
            error_code="MISSING_API_KEY"
        )

    def get_demo_weather(self, location: str) -> NormalizedWeatherData:
        loc_lower = (location or "").strip().lower()
        temp_c = 37.8
        humidity = 62.0
        wet_bulb = 29.2
        uv = 9.4

        if "delhi" in loc_lower or "north" in loc_lower:
            temp_c = 41.5
            humidity = 48.0
            wet_bulb = 30.5
            uv = 10.2
        elif "mumbai" in loc_lower or "coastal" in loc_lower:
            temp_c = 34.2
            humidity = 82.0
            wet_bulb = 31.0
            uv = 8.8
        elif "park" in loc_lower or "garden" in loc_lower:
            temp_c = 35.0
            humidity = 58.0
            wet_bulb = 27.5
            uv = 8.0

        return NormalizedWeatherData(
            locationName=location or "Bengaluru Central District",
            temperatureC=temp_c,
            humidityPercent=humidity,
            uvIndex=uv,
            wetBulbTempC=wet_bulb,
            windSpeedKmh=14.5,
            conditionText="Sunny / High Thermal Load",
            isDemo=True,
            dataSourceStatus="demo_simulated",
            fetchedAt=datetime.now(timezone.utc).isoformat(),
            latitude=12.9716,
            longitude=77.5946,
            country="IN",
            observationTime=datetime.now(timezone.utc).isoformat()
        )
