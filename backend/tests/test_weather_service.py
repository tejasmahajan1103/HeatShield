import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from weather_service import WeatherService
from openweather_adapter import OpenWeatherError

class TestWeatherService(unittest.TestCase):
    def test_unconfigured_service_blocks_live_requests(self):
        svc = WeatherService(api_key="")
        self.assertFalse(svc.is_live_configured())

        with self.assertRaises(OpenWeatherError) as cm:
            svc.get_weather("Bengaluru", allow_demo_fallback=False)
        self.assertEqual(cm.exception.status_code, 401)
        self.assertEqual(cm.exception.error_code, "MISSING_API_KEY")

    def test_demo_fallback_works_when_allowed(self):
        svc = WeatherService(api_key="")
        weather = svc.get_weather("Cubbon Park", allow_demo_fallback=True)
        self.assertTrue(weather.isDemo)
        self.assertEqual(weather.dataSourceStatus, "demo_simulated")
        self.assertEqual(weather.temperatureC, 35.0)

    def test_demo_weather_city_variations(self):
        svc = WeatherService(api_key="")
        delhi_w = svc.get_demo_weather("North Delhi")
        self.assertEqual(delhi_w.temperatureC, 41.5)
        self.assertEqual(delhi_w.humidityPercent, 48.0)

        mumbai_w = svc.get_demo_weather("Mumbai Coastal")
        self.assertEqual(mumbai_w.temperatureC, 34.2)
        self.assertEqual(mumbai_w.humidityPercent, 82.0)

if __name__ == "__main__":
    unittest.main()
