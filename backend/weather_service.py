import math
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

    def get_weather_by_coords(self, lat: float, lon: float, allow_demo_fallback: bool = False) -> NormalizedWeatherData:
        if self.is_live_configured():
            return self.adapter.fetch_current_weather_by_coords(lat, lon)
        
        if allow_demo_fallback:
            return self.get_demo_weather(f"GPS ({lat:.4f}, {lon:.4f})", lat=lat, lon=lon)

        raise OpenWeatherError(
            "Live weather service is unavailable: OPENWEATHER_API_KEY is not configured.",
            status_code=401,
            error_code="MISSING_API_KEY"
        )

    def get_forecast(self, location: str, allow_demo_fallback: bool = False) -> List[ForecastDataPoint]:
        if self.is_live_configured():
            return self.adapter.fetch_forecast(location)
        
        if allow_demo_fallback:
            return self.get_demo_forecast(location)
        
        raise OpenWeatherError(
            "Live forecast service is unavailable: OPENWEATHER_API_KEY is not configured.",
            status_code=401,
            error_code="MISSING_API_KEY"
        )

    def get_forecast_by_coords(self, lat: float, lon: float, allow_demo_fallback: bool = False) -> List[ForecastDataPoint]:
        if self.is_live_configured():
            return self.adapter.fetch_forecast_by_coords(lat, lon)

        if allow_demo_fallback:
            return self.get_demo_forecast(f"GPS ({lat:.4f}, {lon:.4f})", lat=lat, lon=lon)

        raise OpenWeatherError(
            "Live forecast service is unavailable: OPENWEATHER_API_KEY is not configured.",
            status_code=401,
            error_code="MISSING_API_KEY"
        )

    def get_demo_weather(self, location: str, lat: Optional[float] = None, lon: Optional[float] = None) -> NormalizedWeatherData:
        loc_lower = (location or "").strip().lower()
        
        target_lat = lat if lat is not None else 12.9716
        target_lon = lon if lon is not None else 77.5946

        # Dynamic location-aware variation
        lat_var = math.sin(target_lat * 0.15) * 2.5
        lon_var = math.cos(target_lon * 0.15) * 2.0

        temp_c = round(31.2 + lat_var, 1)
        humidity = round(max(35.0, min(85.0, 56.0 + lon_var * 4.0)), 1)
        wet_bulb = round(temp_c * 0.72 + (humidity * 0.1), 1)
        uv = round(max(4.0, min(11.0, 7.5 + lat_var)), 1)

        if "delhi" in loc_lower or "north" in loc_lower:
            temp_c = 38.5
            humidity = 42.0
            wet_bulb = 28.5
            uv = 9.8
        elif "mumbai" in loc_lower or "coastal" in loc_lower:
            temp_c = 33.2
            humidity = 78.0
            wet_bulb = 29.5
            uv = 8.2
        elif "park" in loc_lower or "garden" in loc_lower:
            temp_c = 29.8
            humidity = 54.0
            wet_bulb = 23.5
            uv = 7.0

        return NormalizedWeatherData(
            locationName=location or "Bengaluru Central District",
            temperatureC=temp_c,
            humidityPercent=humidity,
            uvIndex=uv,
            wetBulbTempC=wet_bulb,
            windSpeedKmh=12.5,
            conditionText="Partly Sunny (Simulated Demo)",
            isDemo=True,
            dataSourceStatus="demo_simulated",
            fetchedAt=datetime.now(timezone.utc).isoformat(),
            latitude=target_lat,
            longitude=target_lon,
            country="IN",
            observationTime=datetime.now(timezone.utc).isoformat()
        )

    def get_demo_forecast(self, location: str, lat: Optional[float] = None, lon: Optional[float] = None) -> List[ForecastDataPoint]:
        base_w = self.get_demo_weather(location, lat, lon)
        t_base = base_w.temperatureC
        h_base = base_w.humidityPercent

        return [
            ForecastDataPoint(timestamp="Today +1h", temperatureC=round(t_base + 0.4, 1), humidityPercent=max(30.0, h_base - 2.0), conditionText="Partly Sunny"),
            ForecastDataPoint(timestamp="Today +3h", temperatureC=round(t_base + 1.2, 1), humidityPercent=max(30.0, h_base - 5.0), conditionText="Warm / Clear"),
            ForecastDataPoint(timestamp="Today +6h", temperatureC=round(t_base - 1.5, 1), humidityPercent=min(90.0, h_base + 6.0), conditionText="Clear / Evening"),
            ForecastDataPoint(timestamp="Today +9h", temperatureC=round(t_base - 3.2, 1), humidityPercent=min(90.0, h_base + 10.0), conditionText="Nighttime Mild"),
        ]



