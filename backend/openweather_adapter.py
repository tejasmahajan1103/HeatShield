import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List, Optional
from models import NormalizedWeatherData, ForecastDataPoint

class OpenWeatherError(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str = "PROVIDER_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class OpenWeatherAdapter:
    def __init__(self, api_key: str, base_url: str = "https://api.openweathermap.org/data/2.5", timeout: float = 10.0):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _make_request(self, endpoint: str, params: Dict[str, str]) -> Dict[str, Any]:
        if not self.api_key or self.api_key == "your_openweather_api_key_here":
            raise OpenWeatherError(
                "OpenWeather API key is not configured. Please set OPENWEATHER_API_KEY in backend/.env",
                status_code=401,
                error_code="MISSING_API_KEY"
            )

        query_params = {**params, "appid": self.api_key}
        url = f"{self.base_url}/{endpoint}?{urllib.parse.urlencode(query_params)}"

        req = urllib.request.Request(url, headers={"User-Agent": "HeatShield-RiskEngine/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = resp.read().decode("utf-8")
                return json.loads(data)
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="ignore")
            error_msg = f"OpenWeather HTTP Error {e.code}: {e.reason}"
            try:
                parsed = json.loads(body_text)
                if "message" in parsed:
                    error_msg = f"OpenWeather API Error: {parsed['message']}"
            except Exception:
                pass

            if e.code == 401:
                raise OpenWeatherError("Invalid OpenWeather API Key (401 Unauthorized)", status_code=401, error_code="INVALID_API_KEY")
            elif e.code == 404:
                raise OpenWeatherError("Requested location not found in OpenWeather database (404 Not Found)", status_code=404, error_code="LOCATION_NOT_FOUND")
            elif e.code == 429:
                raise OpenWeatherError("OpenWeather API rate limit exceeded (429 Too Many Requests)", status_code=429, error_code="RATE_LIMIT_EXCEEDED")
            else:
                raise OpenWeatherError(error_msg, status_code=e.code, error_code="HTTP_ERROR")
        except urllib.error.URLError as e:
            raise OpenWeatherError(f"Network error connecting to OpenWeather provider: {e.reason}", status_code=504, error_code="NETWORK_TIMEOUT")
        except TimeoutError:
            raise OpenWeatherError("Network timeout reached while waiting for OpenWeather response", status_code=504, error_code="NETWORK_TIMEOUT")
        except json.JSONDecodeError:
            raise OpenWeatherError("Received malformed JSON response from OpenWeather provider", status_code=502, error_code="MALFORMED_RESPONSE")

    def fetch_current_weather_by_coords(self, lat: float, lon: float) -> NormalizedWeatherData:
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            raise OpenWeatherError("Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180", status_code=400, error_code="INVALID_INPUT")

        raw = self._make_request("weather", {"lat": f"{lat:.4f}", "lon": f"{lon:.4f}", "units": "metric"})
        return self._parse_weather_response(raw, fallback_location=f"GPS ({lat:.4f}, {lon:.4f})")

    def fetch_current_weather(self, location: str) -> NormalizedWeatherData:
        if not location or not location.strip():
            raise OpenWeatherError("Location query cannot be empty", status_code=400, error_code="INVALID_INPUT")

        raw = self._make_request("weather", {"q": location.strip(), "units": "metric"})
        return self._parse_weather_response(raw, fallback_location=location.strip())

    def _parse_weather_response(self, raw: Dict[str, Any], fallback_location: str) -> NormalizedWeatherData:
        main = raw.get("main", {})
        temp_c = main.get("temp")
        humidity = main.get("humidity")

        if temp_c is None or humidity is None:
            raise OpenWeatherError("Provider response missing temperature or humidity fields", status_code=502, error_code="MISSING_DATA")

        wind = raw.get("wind", {})
        wind_ms = wind.get("speed", 0.0)
        wind_kmh = round(wind_ms * 3.6, 1)

        weather_list = raw.get("weather", [])
        condition = weather_list[0].get("description", "Clear").capitalize() if weather_list else "Clear"

        coord = raw.get("coord", {})
        lat = coord.get("lat")
        lon = coord.get("lon")

        sys_data = raw.get("sys", {})
        country = sys_data.get("country", "")

        name = raw.get("name", fallback_location)
        loc_name = f"{name}, {country}".strip(", ") if country else name
        dt_unix = raw.get("dt")
        obs_time = datetime.fromtimestamp(dt_unix, tz=timezone.utc).isoformat() if dt_unix else None

        return NormalizedWeatherData(
            locationName=loc_name,
            temperatureC=round(float(temp_c), 1),
            humidityPercent=round(float(humidity), 1),
            uvIndex=0.0,
            wetBulbTempC=0.0,
            windSpeedKmh=wind_kmh,
            conditionText=condition,
            isDemo=False,
            dataSourceStatus="live_sensor",
            fetchedAt=datetime.now(timezone.utc).isoformat(),
            latitude=lat,
            longitude=lon,
            country=country,
            observationTime=obs_time
        )

    def fetch_forecast(self, location: str) -> List[ForecastDataPoint]:
        if not location or not location.strip():
            raise OpenWeatherError("Location query cannot be empty", status_code=400, error_code="INVALID_INPUT")

        raw = self._make_request("forecast", {"q": location.strip(), "units": "metric"})
        return self._parse_forecast_items(raw)

    def fetch_forecast_by_coords(self, lat: float, lon: float) -> List[ForecastDataPoint]:
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            raise OpenWeatherError("Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180", status_code=400, error_code="INVALID_INPUT")

        raw = self._make_request("forecast", {"lat": f"{lat:.4f}", "lon": f"{lon:.4f}", "units": "metric"})
        return self._parse_forecast_items(raw)

    def _parse_forecast_items(self, raw: Dict[str, Any]) -> List[ForecastDataPoint]:
        items = raw.get("list", [])
        results: List[ForecastDataPoint] = []

        for item in items[:8]:  # Next 24 hours (8 x 3hr windows)
            dt_txt = item.get("dt_txt", "")
            main = item.get("main", {})
            temp_c = main.get("temp", 0.0)
            humidity = main.get("humidity", 0.0)
            w_list = item.get("weather", [])
            cond = w_list[0].get("description", "").capitalize() if w_list else "Clear"

            results.append(ForecastDataPoint(
                timestamp=dt_txt,
                temperatureC=round(float(temp_c), 1),
                humidityPercent=round(float(humidity), 1),
                conditionText=cond
            ))

        return results


