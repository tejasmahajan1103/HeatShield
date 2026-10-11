
import math
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Tuple

from models import (
    NormalizedWeatherData,
    HeatRiskInputModel,
    HeatRiskResultModel,
    ForecastDataPoint,
)


def celsius_to_fahrenheit(c: float) -> float:
    return (c * 9.0 / 5.0) + 32.0


def fahrenheit_to_celsius(f: float) -> float:
    return (f - 32.0) * 5.0 / 9.0


def calculate_noaa_heat_index(
    temp_input: float, humidity_percent: float
) -> Tuple[float, float]:
    """
    Calculate heat index using the NOAA/NWS Rothfusz regression equation.
    Temperature input is Celsius unless it is greater than 55, in which
    case it is treated as Fahrenheit, matching the existing implementation.
    """
    T = (
        float(temp_input)
        if float(temp_input) > 55.0
        else celsius_to_fahrenheit(float(temp_input))
    )
    RH = max(0.0, min(100.0, float(humidity_percent)))

    # Simple Steadman heat-index estimate.
    hi_f = 0.5 * (
        T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094)
    )

    # Full Rothfusz regression for heat-index conditions.
    if hi_f >= 80.0:
        hi_f = (
            -42.379
            + 2.04901523 * T
            + 10.14333127 * RH
            - 0.22475541 * T * RH
            - 0.00683783 * T * T
            - 0.05481717 * RH * RH
            + 0.00122874 * T * T * RH
            + 0.00085282 * T * RH * RH
            - 0.00000199 * T * T * RH * RH
        )

        # Low-humidity adjustment.
        if RH < 13.0 and 80.0 <= T <= 112.0:
            adjustment = (
                ((13.0 - RH) / 4.0)
                * math.sqrt(
                    max(0.0, (17.0 - abs(T - 95.0)) / 17.0)
                )
            )
            hi_f -= adjustment

        # High-humidity adjustment.
        elif RH > 85.0 and 80.0 <= T <= 87.0:
            adjustment = (
                ((RH - 85.0) / 10.0)
                * ((87.0 - T) / 5.0)
            )
            hi_f += adjustment

    hi_c = fahrenheit_to_celsius(hi_f)
    return round(hi_f, 1), round(hi_c, 1)


def is_daylight_time(
    planned_time_str: str,
    lat: float = 12.9716,
    lon: float = 77.5946,
) -> bool:
    """
    Approximate daylight detection using the supplied local time.
    This uses a fixed 06:00-18:30 window, not astronomical sunrise/sunset.
    """
    if not planned_time_str or ":" not in str(planned_time_str):
        return True

    try:
        parts = str(planned_time_str).strip().split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0

        if not 0 <= hour <= 23 or not 0 <= minute <= 59:
            return True

        decimal_hour = hour + minute / 60.0
        return 6.0 <= decimal_hour < 18.5
    except (TypeError, ValueError, IndexError):
        return True


def calculate_heat_risk(
    risk_input: HeatRiskInputModel,
    weather: NormalizedWeatherData,
) -> HeatRiskResultModel:
    if not risk_input.location or not risk_input.location.strip():
        raise ValueError("Invalid location: A location name is required.")

    if (
        not isinstance(risk_input.durationMinutes, int)
        or risk_input.durationMinutes < 1
        or risk_input.durationMinutes > 1440
    ):
        raise ValueError(
            "Invalid duration: Duration must be between 1 and 1440 minutes."
        )

    # Clamp weather inputs to reasonable bounds.
    temp_c = max(-50.0, min(60.0, weather.temperatureC))
    humidity = max(0.0, min(100.0, weather.humidityPercent))

    hi_f, hi_c = calculate_noaa_heat_index(temp_c, humidity)

    # Daylight / nighttime estimate.
    is_daylight = is_daylight_time(
        risk_input.plannedTime,
        weather.latitude or 12.9716,
        weather.longitude or 77.5946,
    )

    # Heat-index risk categories.
    if hi_f >= 103.0:
        level = "Extreme"
        level_color = "#EF4444"
        summary = (
            "DANGER: Environmental heat index indicates potential "
            "heat cramps, exhaustion, or heat stroke risk with continued exertion."
        )
    elif hi_f >= 90.0:
        level = "High"
        level_color = "#F97316"
        summary = (
            "EXTREME CAUTION: Elevated environmental heat index. "
            "Heat cramps and heat exhaustion are possible with prolonged exposure."
        )
    elif hi_f >= 80.0:
        level = "Moderate"
        level_color = "#F59E0B"
        summary = (
            "CAUTION: Environmental heat index requires caution. "
            "Fatigue is possible with prolonged physical activity."
        )
    else:
        level = "Low"
        level_color = "#10B981"
        summary = (
            "Environmental heat index is within mild limits. "
            "Baseline hydration is recommended."
        )

    # Shade and activity details.
    if not is_daylight:
        shade_desc = (
            "Nighttime assessment: direct solar radiation is absent "
            "after sunset."
        )
    elif risk_input.shadeAvailability == "full_shade":
        shade_desc = (
            "Continuous shade coverage provides solar radiation relief."
        )
    elif risk_input.shadeAvailability == "partial_shade":
        shade_desc = (
            "Partial shade coverage provides intermittent solar protection."
        )
    else:
        shade_desc = (
            "Direct sunshine may increase effective heat sensation."
        )

    activity_meta = {
        "walking": {
            "label": "Brisk Walking (Moderate Metabolic Load)",
            "impact": "Low",
        },
        "cycling": {
            "label": "Cycling (Elevated Internal Thermal Load)",
            "impact": "Medium",
        },
        "running": {
            "label": "Running (High Metabolic Heat Production)",
            "impact": "High",
        },
        "outdoor_work": {
            "label": "Heavy Outdoor Work (Sustained Physical Exertion)",
            "impact": "High",
        },
        "other": {
            "label": "General Outdoor Exertion",
            "impact": "Low",
        },
    }
    act_info = activity_meta.get(
        risk_input.activity, activity_meta["other"]
    )

    if risk_input.durationMinutes < 30:
        duration_label = "< 30 mins short exposure"
    elif risk_input.durationMinutes <= 60:
        duration_label = "30 - 60 mins exposure"
    elif risk_input.durationMinutes <= 120:
        duration_label = "60 - 120 mins extended exposure"
    else:
        duration_label = "> 2 hours prolonged exposure"

    # Presentation score. This is a product metric, not a medical probability.
    if hi_f <= 70.0:
        base_score = 5.0
    elif hi_f < 80.0:
        base_score = 5.0 + ((hi_f - 70.0) / 10.0) * 20.0
    elif hi_f < 90.0:
        base_score = 26.0 + ((hi_f - 80.0) / 10.0) * 24.0
    elif hi_f < 103.0:
        base_score = 51.0 + ((hi_f - 90.0) / 13.0) * 24.0
    else:
        base_score = min(
            95.0, 76.0 + ((hi_f - 103.0) / 20.0) * 19.0
        )

    act_bonus = (
        8
        if risk_input.activity in ["running", "outdoor_work"]
        else (3 if risk_input.activity == "cycling" else 0)
    )
    dur_bonus = (
        7
        if risk_input.durationMinutes > 120
        else (
            4
            if risk_input.durationMinutes > 60
            else (-2 if risk_input.durationMinutes < 30 else 0)
        )
    )

    if not is_daylight:
        sun_bonus = 0
    else:
        sun_bonus = (
            5
            if risk_input.shadeAvailability == "direct_sun"
            else (
                0
                if risk_input.shadeAvailability == "partial_shade"
                else -5
            )
        )

    presentation_score = min(
        99, max(5, round(base_score + act_bonus + dur_bonus + sun_bonus))
    )

    contributing_factors = [
        {
            "factor": f"Environmental Heat Index ({hi_c}°C / {hi_f}°F)",
            "impact": (
                "High"
                if hi_f >= 90
                else ("Medium" if hi_f >= 80 else "Low")
            ),
            "description": (
                f"Calculated from ambient temperature {temp_c}°C "
                f"and humidity {humidity}% using the NOAA/NWS method."
            ),
        },
        {
            "factor": (
                f"Metabolic Load ({act_info['label'].split(' ')[0]})"
            ),
            "impact": act_info["impact"],
            "description": act_info["label"],
        },
        {
            "factor": (
                f"Exposure Duration ({risk_input.durationMinutes} minutes)"
            ),
            "impact": (
                "High" if risk_input.durationMinutes > 60 else "Medium"
            ),
            "description": duration_label,
        },
        {
            "factor": (
                "Solar Exposure ("
                + (
                    "Nighttime"
                    if not is_daylight
                    else risk_input.shadeAvailability.replace("_", " ")
                )
                + ")"
            ),
            "impact": (
                "Low"
                if not is_daylight
                else (
                    "High"
                    if risk_input.shadeAvailability == "direct_sun"
                    else "Low"
                )
            ),
            "description": shade_desc,
        },
    ]

    demo_notice = (
        "Demo Telemetry Mode: Uses simulated weather data."
        if weather.isDemo
        else (
            f"Live Weather Provider: OpenWeather API "
            f"({weather.dataSourceStatus})"
        )
    )

    # IMPORTANT: Keep this return inside calculate_heat_risk.
    return HeatRiskResultModel(
        score=presentation_score,
        level=level,
        levelColor=level_color,
        summary=summary,
        contributingFactors=contributing_factors,
        uncertaintyScore=14,
        calculatedAt=datetime.now().strftime("%I:%M %p"),
        disclaimer=(
            "Calculated using the NOAA/NWS heat-index equation. "
            "HeatShield risk levels and the 0-100 score are presentation "
            "metrics, not a medical diagnosis or probability of illness."
        ),
        demoNotice=demo_notice,
        modelVersion="v1.1-noaa-nws",
        metricType="noaa_heat_index",
        weatherSnapshot=weather.to_dict(),
        heatIndexC=hi_c,
        heatIndexF=hi_f,
        calculationMethod="NOAA NWS Rothfusz Heat Index Equation",
    )


@dataclass
class OvernightSummary:
    latitude: float
    longitude: float
    isDemo: bool
    dataSourceStatus: str
    forecastPointsAnalyzed: int
    minimumTemperatureC: float
    maximumTemperatureC: float
    maximumHeatIndexC: float
    maximumHeatIndexF: float
    peakRiskLevel: str
    hourlyForecast: List[Dict[str, Any]]
    summary: str
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def calculate_overnight_summary(
    lat: float,
    lon: float,
    forecasts: List[ForecastDataPoint],
    is_demo: bool = False,
    data_source_status: str = "live_forecast",
) -> OvernightSummary:
    """
    Summarize heat-index estimates for all supplied forecast points.

    Note: This currently summarizes all supplied points; it does not filter
    them to nighttime hours. Risk levels are HeatShield estimates, not
    official medical diagnoses.
    """
    if not forecasts:
        raise ValueError(
            "No forecast data is available for the overnight summary."
        )

    hourly_forecast: List[Dict[str, Any]] = []

    for point in forecasts:
        temperature = max(-50.0, min(60.0, float(point.temperatureC)))
        humidity = max(
            0.0, min(100.0, float(point.humidityPercent))
        )

        heat_index_f, heat_index_c = calculate_noaa_heat_index(
            temperature, humidity
        )

        if heat_index_f >= 103.0:
            risk_level = "Extreme"
        elif heat_index_f >= 90.0:
            risk_level = "High"
        elif heat_index_f >= 80.0:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        hourly_forecast.append(
            {
                "timestamp": point.timestamp,
                "temperatureC": round(temperature, 1),
                "humidityPercent": round(humidity, 1),
                "conditionText": point.conditionText,
                "heatIndexC": heat_index_c,
                "heatIndexF": heat_index_f,
                "riskLevel": risk_level,
            }
        )

    peak = max(
        hourly_forecast, key=lambda item: item["heatIndexF"]
    )
    temperatures = [
        item["temperatureC"] for item in hourly_forecast
    ]
    heat_indices_f = [
        item["heatIndexF"] for item in hourly_forecast
    ]

    summary_text = (
        f"Estimated heat index ranges from "
        f"{min(heat_indices_f):.1f}°F to "
        f"{max(heat_indices_f):.1f}°F across "
        f"{len(hourly_forecast)} available forecast points. "
        f"The highest estimated HeatShield risk category is "
        f"{peak['riskLevel']}."
    )

    return OvernightSummary(
        latitude=float(lat),
        longitude=float(lon),
        isDemo=bool(is_demo),
        dataSourceStatus=data_source_status,
        forecastPointsAnalyzed=len(hourly_forecast),
        minimumTemperatureC=round(min(temperatures), 1),
        maximumTemperatureC=round(max(temperatures), 1),
        maximumHeatIndexC=peak["heatIndexC"],
        maximumHeatIndexF=peak["heatIndexF"],
        peakRiskLevel=peak["riskLevel"],
        hourlyForecast=hourly_forecast,
        summary=summary_text,
        disclaimer=(
            "Forecast heat index is an estimate based on temperature "
            "and humidity. It is not a medical diagnosis. The supplied "
            "forecast points may include daytime conditions and may not "
            "represent every hour of the night."
        ),
    )
