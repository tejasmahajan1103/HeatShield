import math
from datetime import datetime
from typing import Dict, Any, Tuple
from models import NormalizedWeatherData, HeatRiskInputModel, HeatRiskResultModel

def celsius_to_fahrenheit(c: float) -> float:
    return (c * 9.0 / 5.0) + 32.0

def fahrenheit_to_celsius(f: float) -> float:
    return (f - 32.0) * 5.0 / 9.0

def calculate_noaa_heat_index(temp_c: float, humidity_percent: float) -> Tuple[float, float]:
    """
    Pure NOAA National Weather Service Heat Index Calculation (Rothfusz Regression Equation)
    Official Reference: https://www.wpc.ncep.noaa.gov/heat_index/hi_equation.html
    """
    T = celsius_to_fahrenheit(temp_c)
    RH = max(0.0, min(100.0, float(humidity_percent)))

    # 1. Simple Heat Index formula (Steadman formula)
    hi_f = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094))

    # 2. If simple HI >= 80°F, perform full Rothfusz regression equation & branch adjustments
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

        # Low-humidity adjustment branch
        if RH < 13.0 and 80.0 <= T <= 112.0:
            adj = ((13.0 - RH) / 4.0) * math.sqrt(max(0.0, (17.0 - abs(T - 95.0)) / 17.0))
            hi_f -= adj
        # High-humidity adjustment branch
        elif RH > 85.0 and 80.0 <= T <= 87.0:
            adj = ((RH - 85.0) / 10.0) * ((87.0 - T) / 5.0)
            hi_f += adj

    hi_c = fahrenheit_to_celsius(hi_f)
    return round(hi_f, 1), round(hi_c, 1)

def calculate_heat_risk(risk_input: HeatRiskInputModel, weather: NormalizedWeatherData) -> HeatRiskResultModel:
    if not risk_input.location or not risk_input.location.strip():
        raise ValueError("Invalid location: A location name is required.")

    if not isinstance(risk_input.durationMinutes, int) or risk_input.durationMinutes < 1 or risk_input.durationMinutes > 1440:
        raise ValueError("Invalid duration: Duration must be a valid number between 1 and 1440 minutes.")

    # Temperature & Humidity Clamping
    temp_c = max(-50.0, min(60.0, weather.temperatureC))
    humidity = max(0.0, min(100.0, weather.humidityPercent))

    hi_f, hi_c = calculate_noaa_heat_index(temp_c, humidity)

    # Risk level categorization
    if hi_f >= 103.0:
        level = "Extreme"
        level_color = "#EF4444"
        summary = "DANGER: Environmental heat index indicates potential heat cramps, exhaustion, or heat stroke risk with continued exertion."
    elif hi_f >= 90.0:
        level = "High"
        level_color = "#F97316"
        summary = "EXTREME CAUTION: Elevated environmental heat index. Heat cramps and heat exhaustion possible with prolonged exposure."
    elif hi_f >= 80.0:
        level = "Moderate"
        level_color = "#F59E0B"
        summary = "CAUTION: Environmental heat index requires caution. Fatigue possible with prolonged physical activity."
    else:
        level = "Low"
        level_color = "#10B981"
        summary = "Environmental heat index is within mild limits. Baseline hydration recommended."

    # Shade & Activity details
    shade_desc = "Direct sunshine (NWS notes direct sun can increase effective heat sensation by up to +15°F)"
    if risk_input.shadeAvailability == "full_shade":
        shade_desc = "Continuous shade coverage (provides solar radiation relief)"
    elif risk_input.shadeAvailability == "partial_shade":
        shade_desc = "Partial shade coverage (intermittent solar protection)"

    activity_meta = {
        "walking": {"label": "Brisk Walking (Moderate Metabolic Load)", "impact": "Low"},
        "cycling": {"label": "Cycling (Elevated Internal Thermal Load)", "impact": "Medium"},
        "running": {"label": "Running (High Metabolic Heat Production)", "impact": "High"},
        "outdoor_work": {"label": "Heavy Outdoor Work (Sustained Physical Exertion)", "impact": "High"},
        "other": {"label": "General Outdoor Exertion", "impact": "Low"},
    }
    act_info = activity_meta.get(risk_input.activity, activity_meta["other"])

    if risk_input.durationMinutes < 30:
        duration_label = "< 30 mins short exposure"
    elif risk_input.durationMinutes <= 60:
        duration_label = "30 - 60 mins exposure"
    elif risk_input.durationMinutes <= 120:
        duration_label = "60 - 120 mins extended exposure"
    else:
        duration_label = "> 2 hours prolonged exposure"

    # Presentation Score Calculation
    base_score = round(max(10, min(99, ((hi_f - 65.0) / 65.0) * 100.0)))
    act_bonus = 8 if risk_input.activity in ["running", "outdoor_work"] else (4 if risk_input.activity == "cycling" else 0)
    dur_bonus = 10 if risk_input.durationMinutes > 120 else (5 if risk_input.durationMinutes > 60 else 0)
    sun_bonus = 6 if risk_input.shadeAvailability == "direct_sun" else (2 if risk_input.shadeAvailability == "partial_shade" else -4)

    presentation_score = min(99, max(8, base_score + act_bonus + dur_bonus + sun_bonus))

    contributing_factors = [
        {
            "factor": f"Environmental Heat Index ({hi_c}°C / {hi_f}°F)",
            "impact": "High" if hi_f >= 90 else ("Medium" if hi_f >= 80 else "Low"),
            "description": f"Calculated from ambient temp {temp_c}°C and humidity {humidity}% using official NOAA NWS formula.",
        },
        {
            "factor": f"Metabolic Load ({act_info['label'].split(' ')[0]})",
            "impact": act_info["impact"],
            "description": act_info["label"],
        },
        {
            "factor": f"Exposure Duration ({risk_input.durationMinutes} minutes)",
            "impact": "High" if risk_input.durationMinutes > 60 else "Medium",
            "description": duration_label,
        },
        {
            "factor": f"Solar Exposure ({risk_input.shadeAvailability.replace('_', ' ')})",
            "impact": "High" if risk_input.shadeAvailability == "direct_sun" else "Low",
            "description": shade_desc,
        },
    ]

    demo_notice = (
        "Demo Telemetry Mode: Uses simulated weather data."
        if weather.isDemo
        else f"Live Weather Provider: OpenWeather API ({weather.dataSourceStatus})"
    )

    return HeatRiskResultModel(
        score=presentation_score,
        level=level,
        levelColor=level_color,
        summary=summary,
        contributingFactors=contributing_factors,
        uncertaintyScore=14,
        calculatedAt=datetime.now().strftime("%I:%M %p"),
        disclaimer="Calculated using NOAA National Weather Service Heat Index standard equation. HeatShield risk levels and 0-100 score are UI presentation metrics, not an official medical diagnosis or probability of illness.",
        demoNotice=demo_notice,
        modelVersion="v1.1-noaa-nws",
        metricType="noaa_heat_index",
        weatherSnapshot=weather.to_dict(),
        heatIndexC=hi_c,
        heatIndexF=hi_f,
        calculationMethod="NOAA NWS Rothfusz Heat Index Equation",
    )
