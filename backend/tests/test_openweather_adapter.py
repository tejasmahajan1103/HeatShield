import sys
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
import urllib.error

# Ensure backend directory is in python sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from openweather_adapter import OpenWeatherAdapter, OpenWeatherError

class TestOpenWeatherAdapter(unittest.TestCase):
    def setUp(self):
        self.adapter = OpenWeatherAdapter(api_key="test_api_key_12345", timeout=5.0)

    @patch("urllib.request.urlopen")
    def test_fetch_current_weather_success(self, mock_urlopen):
        mock_response_data = {
            "coord": {"lon": 77.5946, "lat": 12.9716},
            "weather": [{"id": 800, "main": "Clear", "description": "clear sky"}],
            "main": {"temp": 32.5, "feels_like": 35.0, "humidity": 60},
            "wind": {"speed": 4.2},
            "dt": 1696982400,
            "sys": {"country": "IN"},
            "name": "Bengaluru"
        }
        
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_response_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        res = self.adapter.fetch_current_weather("Bengaluru")

        self.assertEqual(res.locationName, "Bengaluru, IN")
        self.assertEqual(res.temperatureC, 32.5)
        self.assertEqual(res.humidityPercent, 60.0)
        self.assertEqual(res.windSpeedKmh, 15.1)  # 4.2 * 3.6 = 15.12 -> 15.1
        self.assertEqual(res.conditionText, "Clear sky")
        self.assertFalse(res.isDemo)
        self.assertEqual(res.dataSourceStatus, "live_sensor")
        self.assertEqual(res.latitude, 12.9716)
        self.assertEqual(res.longitude, 77.5946)

    def test_missing_api_key_raises_error(self):
        unconfigured_adapter = OpenWeatherAdapter(api_key="")
        with self.assertRaises(OpenWeatherError) as cm:
            unconfigured_adapter.fetch_current_weather("Bengaluru")
        self.assertEqual(cm.exception.status_code, 401)
        self.assertEqual(cm.exception.error_code, "MISSING_API_KEY")

    def test_empty_location_raises_error(self):
        with self.assertRaises(OpenWeatherError) as cm:
            self.adapter.fetch_current_weather("   ")
        self.assertEqual(cm.exception.status_code, 400)
        self.assertEqual(cm.exception.error_code, "INVALID_INPUT")

    @patch("urllib.request.urlopen")
    def test_401_unauthorized_error(self, mock_urlopen):
        err_body = json.dumps({"cod": "401", "message": "Invalid API key"}).encode("utf-8")
        mock_err = urllib.error.HTTPError(url="", code=401, msg="Unauthorized", hdrs={}, fp=MagicMock())
        mock_err.read = MagicMock(return_value=err_body)
        mock_urlopen.side_effect = mock_err

        with self.assertRaises(OpenWeatherError) as cm:
            self.adapter.fetch_current_weather("Bengaluru")
        self.assertEqual(cm.exception.status_code, 401)
        self.assertEqual(cm.exception.error_code, "INVALID_API_KEY")

    @patch("urllib.request.urlopen")
    def test_404_not_found_error(self, mock_urlopen):
        err_body = json.dumps({"cod": "404", "message": "city not found"}).encode("utf-8")
        mock_err = urllib.error.HTTPError(url="", code=404, msg="Not Found", hdrs={}, fp=MagicMock())
        mock_err.read = MagicMock(return_value=err_body)
        mock_urlopen.side_effect = mock_err

        with self.assertRaises(OpenWeatherError) as cm:
            self.adapter.fetch_current_weather("NonExistentCity12345")
        self.assertEqual(cm.exception.status_code, 404)
        self.assertEqual(cm.exception.error_code, "LOCATION_NOT_FOUND")

    @patch("urllib.request.urlopen")
    def test_429_rate_limit_error(self, mock_urlopen):
        err_body = json.dumps({"cod": "429", "message": "Rate limit exceeded"}).encode("utf-8")
        mock_err = urllib.error.HTTPError(url="", code=429, msg="Too Many Requests", hdrs={}, fp=MagicMock())
        mock_err.read = MagicMock(return_value=err_body)
        mock_urlopen.side_effect = mock_err

        with self.assertRaises(OpenWeatherError) as cm:
            self.adapter.fetch_current_weather("Bengaluru")
        self.assertEqual(cm.exception.status_code, 429)
        self.assertEqual(cm.exception.error_code, "RATE_LIMIT_EXCEEDED")

    @patch("urllib.request.urlopen")
    def test_network_timeout_error(self, mock_urlopen):
        mock_urlopen.side_effect = TimeoutError("Connection timed out")

        with self.assertRaises(OpenWeatherError) as cm:
            self.adapter.fetch_current_weather("Bengaluru")
        self.assertEqual(cm.exception.status_code, 504)
        self.assertEqual(cm.exception.error_code, "NETWORK_TIMEOUT")

    @patch("urllib.request.urlopen")
    def test_missing_temperature_raises_error(self, mock_urlopen):
        incomplete_json = {"main": {"humidity": 50}, "weather": []}
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(incomplete_json).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        with self.assertRaises(OpenWeatherError) as cm:
            self.adapter.fetch_current_weather("Bengaluru")
        self.assertEqual(cm.exception.status_code, 502)
        self.assertEqual(cm.exception.error_code, "MISSING_DATA")

    @patch("urllib.request.urlopen")
    def test_fetch_forecast_success(self, mock_urlopen):
        mock_forecast_json = {
            "list": [
                {"dt_txt": "2026-10-10 18:00:00", "main": {"temp": 30.0, "humidity": 65}, "weather": [{"description": "few clouds"}]},
                {"dt_txt": "2026-10-10 21:00:00", "main": {"temp": 28.0, "humidity": 70}, "weather": [{"description": "clear sky"}]}
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_forecast_json).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        forecast = self.adapter.fetch_forecast("Bengaluru")
        self.assertEqual(len(forecast), 2)
        self.assertEqual(forecast[0].temperatureC, 30.0)
        self.assertEqual(forecast[0].humidityPercent, 65.0)
        self.assertEqual(forecast[0].conditionText, "Few clouds")

if __name__ == "__main__":
    unittest.main()
