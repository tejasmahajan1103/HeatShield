import json
from typing import Dict, Any
from models import HeatRiskInputModel
from weather_service import WeatherService
from heat_risk_engine import calculate_heat_risk
from openweather_adapter import OpenWeatherError

import os

weather_svc = WeatherService()

def build_response(status_code: int, body: Dict[str, Any], headers: Dict[str, str] = None) -> Dict[str, Any]:
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
    default_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    if headers:
        default_headers.update(headers)
    return {
        "statusCode": status_code,
        "headers": default_headers,
        "body": json.dumps(body),
    }

def route_api_request(method: str, path: str, query_params: Dict[str, str], body_json: Dict[str, Any]) -> Dict[str, Any]:
    method = method.upper()

    if method == "OPTIONS":
        return build_response(200, {"status": "ok"})

    if path in ["/api/health", "/health"]:
        return build_response(200, {
            "status": "healthy",
            "service": "HeatShield Backend API",
            "live_weather_configured": weather_svc.is_live_configured(),
            "provider": "OpenWeather API v2.5" if weather_svc.is_live_configured() else "Demo Mock Provider"
        })

    if path in ["/api/weather", "/weather"] and method == "GET":
        location = query_params.get("location", "").strip()
        allow_demo = query_params.get("demo", "").lower() in ["true", "1"]
        if not location:
            return build_response(400, {"error": "Missing required query parameter: location", "errorCode": "INVALID_INPUT"})

        try:
            weather = weather_svc.get_weather(location, allow_demo_fallback=allow_demo)
            return build_response(200, weather.to_dict())
        except OpenWeatherError as e:
            return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
        except Exception as e:
            return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})

    if path in ["/api/risk", "/risk"] and method == "POST":
        try:
            if not body_json:
                return build_response(400, {"error": "Missing request body JSON", "errorCode": "INVALID_INPUT"})

            location = body_json.get("location", "").strip()
            activity = body_json.get("activity", "walking")
            planned_time = body_json.get("plannedTime", "14:00")
            duration_minutes = int(body_json.get("durationMinutes", 45))
            shade = body_json.get("shadeAvailability", "partial_shade")
            allow_demo = body_json.get("allowDemoFallback", False)

            if not location:
                return build_response(400, {"error": "Location field is required", "errorCode": "INVALID_INPUT"})

            risk_input = HeatRiskInputModel(
                location=location,
                activity=activity,
                plannedTime=planned_time,
                durationMinutes=duration_minutes,
                shadeAvailability=shade
            )

            weather = weather_svc.get_weather(location, allow_demo_fallback=allow_demo)
            result = calculate_heat_risk(risk_input, weather)
            return build_response(200, result.to_dict())
        except OpenWeatherError as e:
            return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
        except ValueError as e:
            return build_response(400, {"error": str(e), "errorCode": "INVALID_INPUT"})
        except Exception as e:
            return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})

    return build_response(404, {"error": f"Endpoint not found: {method} {path}", "errorCode": "NOT_FOUND"})

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """AWS Lambda entrypoint conforming to API Gateway Proxy integration event schema."""
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/api/health")
    query_params = event.get("queryStringParameters") or {}
    
    body_json = {}
    raw_body = event.get("body")
    if raw_body:
        try:
            body_json = json.loads(raw_body)
        except Exception:
            pass

    return route_api_request(http_method, path, query_params, body_json)
