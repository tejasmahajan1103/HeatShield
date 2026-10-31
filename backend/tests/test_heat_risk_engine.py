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
        self.assertEqual(res.level, "Moderate")  # 32.5°C 60% RH -> 100.9°F HI (NOAA Extreme Caution) -> Moderate Risk (60/100)
        self.assertGreater(res.score, 0)
        self.assertLessEqual(res.score, 100)
        self.assertEqual(len(res.contributingFactors), 4)
        self.assertIn("NOAA National Weather Service", res.disclaimer)

    def test_user_reported_screenshot_parameters(self):
        # Specific reproduction: 32°C ambient, 56.5% RH, cycling, 45 mins in direct sun at 14:30
        weather = NormalizedWeatherData(
            locationName="Bengaluru Central",
            temperatureC=32.0,
            humidityPercent=56.5,
            uvIndex=8.0,
            wetBulbTempC=25.0,
            windSpeedKmh=10.0,
            conditionText="Simulated Demo",
            isDemo=True,
            dataSourceStatus="demo_simulated",
            fetchedAt="2026-10-31T14:30:00Z",
        )
        risk_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="cycling",
            plannedTime="14:30",
            durationMinutes=45,
            shadeAvailability="direct_sun",
        )
        res = calculate_heat_risk(risk_input, weather)
        # Verify NOAA Heat Index is 36.1°C / 96.9°F
        self.assertEqual(res.heatIndexC, 36.1)
        self.assertEqual(res.heatIndexF, 96.9)
        # Score is 59/100 (in the Moderate 36-65 band), NOT exaggerated 72/100 High Risk
        self.assertEqual(res.score, 59)
        self.assertEqual(res.level, "Moderate")
        # Notice clearly flags demo provenance
        self.assertIn("Demo Telemetry Active", res.demoNotice)
        self.assertIn("SIMULATED:", res.contributingFactors[0]["description"])

    def test_strenuous_activity_and_extended_duration_escalates_to_high_risk(self):
        # Running for 130 minutes in direct sun at 32°C correctly escalates to High Risk
        weather = NormalizedWeatherData(
            locationName="Bengaluru",
            temperatureC=32.0,
            humidityPercent=56.5,
            uvIndex=8.0,
            wetBulbTempC=25.0,
            windSpeedKmh=10.0,
            conditionText="Clear",
            isDemo=False,
            dataSourceStatus="live_sensor",
            fetchedAt="2026-10-31T14:30:00Z",
        )
        strenuous_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="running",
            plannedTime="14:30",
            durationMinutes=130,
            shadeAvailability="direct_sun",
        )
        res = calculate_heat_risk(strenuous_input, weather)
        self.assertEqual(res.score, 71)
        self.assertEqual(res.level, "High")

    def test_monotonic_risk_behavior(self):
        weather = NormalizedWeatherData(
            locationName="Bengaluru",
            temperatureC=32.0,
            humidityPercent=50.0,
            uvIndex=7.0,
            wetBulbTempC=24.0,
            windSpeedKmh=10.0,
            conditionText="Clear",
            isDemo=False,
            dataSourceStatus="live_sensor",
            fetchedAt="2026-10-31T12:00:00Z",
        )
        base_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="walking",
            plannedTime="12:00",
            durationMinutes=30,
            shadeAvailability="full_shade",
        )
        base_res = calculate_heat_risk(base_input, weather)

        # Longer duration increases risk
        long_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="walking",
            plannedTime="12:00",
            durationMinutes=90,
            shadeAvailability="full_shade",
        )
        long_res = calculate_heat_risk(long_input, weather)
        self.assertGreater(long_res.score, base_res.score)

        # Greater exertion increases risk
        run_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="running",
            plannedTime="12:00",
            durationMinutes=30,
            shadeAvailability="full_shade",
        )
        run_res = calculate_heat_risk(run_input, weather)
        self.assertGreater(run_res.score, base_res.score)

        # Direct sun increases risk relative to full shade
        sun_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="walking",
            plannedTime="12:00",
            durationMinutes=30,
            shadeAvailability="direct_sun",
        )
        sun_res = calculate_heat_risk(sun_input, weather)
        self.assertGreater(sun_res.score, base_res.score)

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

    def test_nighttime_solar_radiation_eliminated(self):
        weather = NormalizedWeatherData(
            locationName="Bengaluru",
            temperatureC=32.0,
            humidityPercent=60.0,
            uvIndex=0.0,
            wetBulbTempC=0.0,
            windSpeedKmh=10.0,
            conditionText="Clear Night",
            isDemo=True,
            dataSourceStatus="demo_simulated",
            fetchedAt="2026-10-10T20:30:00Z",
        )
        night_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="walking",
            plannedTime="20:30",
            durationMinutes=45,
            shadeAvailability="direct_sun",
        )
        res = calculate_heat_risk(night_input, weather)
        solar_factor = [f for f in res.contributingFactors if "Solar Exposure" in f["factor"]][0]
        self.assertIn("Nighttime", solar_factor["factor"])
        self.assertIn("absent after sunset", solar_factor["description"])
        # Verify score is lower at night than during daytime with direct sun
        day_input = HeatRiskInputModel(
            location="Bengaluru",
            activity="walking",
            plannedTime="14:00",
            durationMinutes=45,
            shadeAvailability="direct_sun",
        )
        res_day = calculate_heat_risk(day_input, weather)
        self.assertLess(res.score, res_day.score)

    def test_hot_humid_nighttime_risk(self):
        weather = NormalizedWeatherData(
            locationName="Mumbai Coastal",
            temperatureC=33.0,
            humidityPercent=75.0,
            uvIndex=0.0,
            wetBulbTempC=0.0,
            windSpeedKmh=12.0,
            conditionText="Humid Night",
            isDemo=False,
            dataSourceStatus="live_sensor",
            fetchedAt="2026-10-10T22:00:00Z",
        )
        night_humid_input = HeatRiskInputModel(
            location="Mumbai",
            activity="running",
            plannedTime="22:00",
            durationMinutes=60,
            shadeAvailability="direct_sun",
        )
        res = calculate_heat_risk(night_humid_input, weather)
        self.assertIn(res.level, ["High", "Extreme"])
        self.assertGreater(res.score, 50)

if __name__ == "__main__":
    unittest.main()


