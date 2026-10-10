import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import NormalizedWeatherData, HeatRiskInputModel
from heat_risk_engine import (
    celsius_to_fahrenheit,
    fahrenheit_to_celsius,
    calculate_noaa_heat_index,
    calculate_heat_risk,
)

class TestHeatRiskEngine(unittest.TestCase):
    def test_temperature_conversion(self):
        self.assertEqual(celsius_to_fahrenheit(0.0), 32.0)
        self.assertEqual(celsius_to_fahrenheit(100.0), 212.0)
        self.assertAlmostEqual(celsius_to_fahrenheit(26.6667), 80.0, places=1)

        self.assertEqual(fahrenheit_to_celsius(32.0), 0.0)
        self.assertEqual(fahrenheit_to_celsius(212.0), 100.0)
        self.assertAlmostEqual(fahrenheit_to_celsius(80.0), 26.67, places=1)

    def test_noaa_reference_values(self):
        # 1. 80°F (26.6667°C), 45% RH -> NWS HI = 80.0°F
        hi_f, _ = calculate_noaa_heat_index(26.6667, 45.0)
        self.assertAlmostEqual(hi_f, 80.0, delta=0.5)

        # 2. 90°F (32.2222°C), 50% RH -> NWS HI = 95.0°F
        hi_f2, _ = calculate_noaa_heat_index(32.2222, 50.0)
        self.assertAlmostEqual(hi_f2, 95.0, delta=0.5)

        # 3. 95°F (35.0°C), 55% RH -> NWS HI = 108.9°F
        hi_f3, _ = calculate_noaa_heat_index(35.0, 55.0)
        self.assertAlmostEqual(hi_f3, 108.9, delta=0.5)

    def test_simple_formula_switch(self):
        # T = 75°F (23.8889°C), RH = 50% -> Simple HI = 74.55°F (< 80°F)
        hi_f, _ = calculate_noaa_heat_index(23.8889, 50.0)
        self.assertAlmostEqual(hi_f, 74.6, places=1)

    def test_low_humidity_adjustment(self):
        # T = 90°F (32.2222°C), RH = 10%
        unadjusted_rothfusz = (
            -42.379
            + 2.04901523 * 90
            + 10.14333127 * 10
            - 0.22475541 * 90 * 10
            - 0.00683783 * 90 * 90
            - 0.05481717 * 10 * 10
            + 0.00122874 * 90 * 90 * 10
            + 0.00085282 * 90 * 10 * 10
            - 0.00000199 * 90 * 90 * 10 * 10
        )
        expected_adj = ((13.0 - 10.0) / 4.0) * ((17.0 - abs(90.0 - 95.0)) / 17.0) ** 0.5
        expected_hi = unadjusted_rothfusz - expected_adj

        hi_f, _ = calculate_noaa_heat_index(32.2222, 10.0)
        self.assertAlmostEqual(hi_f, expected_hi, delta=0.2)

    def test_high_humidity_adjustment(self):
        # T = 84°F (28.8889°C), RH = 90%
        unadjusted_rothfusz = (
            -42.379
            + 2.04901523 * 84
            + 10.14333127 * 90
            - 0.22475541 * 84 * 90
            - 0.00683783 * 84 * 84
            - 0.05481717 * 90 * 90
            + 0.00122874 * 84 * 84 * 90
            + 0.00085282 * 84 * 90 * 90
            - 0.00000199 * 84 * 84 * 90 * 90
        )
        expected_adj = ((90.0 - 85.0) / 10.0) * ((87.0 - 84.0) / 5.0)  # 0.3
        expected_hi = unadjusted_rothfusz + expected_adj

        hi_f, _ = calculate_noaa_heat_index(28.8889, 90.0)
        self.assertAlmostEqual(hi_f, expected_hi, delta=0.2)

    def test_risk_calculation_output(self):
        weather = NormalizedWeatherData(
            locationName="Bengaluru, IN",
            temperatureC=32.5,
            humidityPercent=60.0,
            uvIndex=0.0,
            wetBulbTempC=0.0,
            windSpeedKmh=15.0,
            conditionText="Clear",
            isDemo=False,
            dataSourceStatus="live_sensor",
            fetchedAt="2026-10-10T15:00:00Z",
        )
        risk_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="walking",
            plannedTime="14:00",
            durationMinutes=45,
            shadeAvailability="partial_shade",
        )

        res = calculate_heat_risk(risk_input, weather)
        self.assertEqual(res.level, "High")  # 32.5°C 60% RH -> ~100.5°F HI -> High
        self.assertGreater(res.score, 0)
        self.assertLessEqual(res.score, 100)
        self.assertEqual(len(res.contributingFactors), 4)
        self.assertIn("NOAA National Weather Service", res.disclaimer)

    def test_invalid_input_validation(self):
        weather = NormalizedWeatherData(
            locationName="Bengaluru",
            temperatureC=30.0,
            humidityPercent=50.0,
            uvIndex=0.0,
            wetBulbTempC=0.0,
            windSpeedKmh=10.0,
            conditionText="Clear",
            isDemo=True,
            dataSourceStatus="demo_simulated",
            fetchedAt="2026-10-10T15:00:00Z",
        )
        empty_loc = HeatRiskInputModel(
            location="   ",
            activity="walking",
            plannedTime="14:00",
            durationMinutes=30,
            shadeAvailability="direct_sun",
        )
        with self.assertRaises(ValueError) as cm:
            calculate_heat_risk(empty_loc, weather)
        self.assertIn("location", str(cm.exception))

        invalid_dur = HeatRiskInputModel(
            location="Park",
            activity="walking",
            plannedTime="14:00",
            durationMinutes=-5,
            shadeAvailability="direct_sun",
        )
        with self.assertRaises(ValueError) as cm:
            calculate_heat_risk(invalid_dur, weather)
        self.assertIn("duration", str(cm.exception))

if __name__ == "__main__":
    unittest.main()
