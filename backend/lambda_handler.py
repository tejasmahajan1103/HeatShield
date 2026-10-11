import json
from typing import Dict, Any
from models import HeatRiskInputModel
from weather_service import WeatherService
from decimal import Decimal
from heat_risk_engine import calculate_heat_risk
from openweather_adapter import OpenWeatherError
from risk_history_service import (
    save_assessment,
    get_assessments,
    RiskHistoryError,
)

import os

weather_svc = WeatherService()
# Reuse this service across warm Lambda invocations so its short-lived geographic
# cache can reduce repeated calls to the public Overpass provider.
from coolspot_service import CoolSpotService
coolspot_svc = CoolSpotService()

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
        "body": json.dumps(
    body,
    default=lambda value: (
        float(value) if isinstance(value, Decimal) else str(value)
    ),
),
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
        lat_str = query_params.get("lat") or query_params.get("latitude")
        lon_str = query_params.get("lon") or query_params.get("longitude")
        allow_demo = query_params.get("demo", "").lower() in ["true", "1"]

        if lat_str and lon_str:
            try:
                lat = float(lat_str)
                lon = float(lon_str)
                weather = weather_svc.get_weather_by_coords(lat, lon, allow_demo_fallback=allow_demo)
                return build_response(200, weather.to_dict())
            except ValueError:
                return build_response(400, {"error": "Invalid numeric coordinates for lat/lon", "errorCode": "INVALID_INPUT"})
            except OpenWeatherError as e:
                return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
            except Exception as e:
                return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})

        if not location:
            return build_response(400, {"error": "Missing required query parameter: location or lat/lon coordinates", "errorCode": "INVALID_INPUT"})

        try:
            weather = weather_svc.get_weather(location, allow_demo_fallback=allow_demo)
            return build_response(200, weather.to_dict())
        except OpenWeatherError as e:
            return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
        except Exception as e:
            return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})

    if path in ["/api/forecast", "/forecast"] and method == "GET":
        location = query_params.get("location", "").strip()
        lat_str = query_params.get("lat") or query_params.get("latitude")
        lon_str = query_params.get("lon") or query_params.get("longitude")
        allow_demo = query_params.get("demo", "").lower() in ["true", "1"]

        if lat_str and lon_str:
            try:
                lat = float(lat_str)
                lon = float(lon_str)
                forecasts = weather_svc.get_forecast_by_coords(lat, lon, allow_demo_fallback=allow_demo)
                return build_response(200, [f.to_dict() for f in forecasts])
            except ValueError:
                return build_response(400, {"error": "Invalid numeric coordinates for lat/lon", "errorCode": "INVALID_INPUT"})
            except OpenWeatherError as e:
                return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
            except Exception as e:
                return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})

        if not location:
            return build_response(400, {"error": "Missing required parameter: location or lat/lon coordinates", "errorCode": "INVALID_INPUT"})

        try:
            forecasts = weather_svc.get_forecast(location, allow_demo_fallback=allow_demo)
            return build_response(200, [f.to_dict() for f in forecasts])
        except OpenWeatherError as e:
            return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
        except Exception as e:
            return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})

    if path in ["/api/overnight-forecast", "/overnight-forecast"] and method == "GET":
        lat_str = query_params.get("lat") or query_params.get("latitude", "12.9716")
        lon_str = query_params.get("lon") or query_params.get("longitude", "77.5946")
        allow_demo = query_params.get("demo", "").lower() in ["true", "1"]

        try:
            lat = float(lat_str)
            lon = float(lon_str)
            forecasts = weather_svc.get_forecast_by_coords(lat, lon, allow_demo_fallback=allow_demo)
            from heat_risk_engine import calculate_overnight_summary
            is_demo = not weather_svc.is_live_configured() or allow_demo
            status_str = "demo_simulated" if is_demo else "live_forecast"
            summary = calculate_overnight_summary(lat, lon, forecasts, is_demo=is_demo, data_source_status=status_str)
            return build_response(200, summary.to_dict())
        except ValueError:
            return build_response(400, {"error": "Invalid numeric coordinates", "errorCode": "INVALID_INPUT"})
        except OpenWeatherError as e:
            return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
        except Exception as e:
            return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})




    if path in ["/api/coolspots", "/coolspots"] and method == "GET":
        lat_str = query_params.get("lat") or query_params.get("latitude")
        lon_str = query_params.get("lon") or query_params.get("longitude")
        radius_str = query_params.get("radiusKm") or query_params.get("radius", "5.0")
        allow_demo = query_params.get("demo", "").lower() in ["true", "1"]

        if not lat_str or not lon_str:
            return build_response(
                400,
                {
                    "error": "Missing required parameters: lat and lon",
                    "errorCode": "INVALID_INPUT",
                },
            )

        try:
            lat = float(lat_str)
            lon = float(lon_str)
            radius_km = float(radius_str)
        except (ValueError, TypeError):
            return build_response(
                400,
                {
                    "error": "Invalid numeric coordinates or radius parameter",
                    "errorCode": "INVALID_INPUT",
                },
            )

        try:
            from coolspot_service import CoolSpotError

            spots = coolspot_svc.get_nearby_coolspots(
                lat,
                lon,
                radius_km=radius_km,
                allow_demo=allow_demo,
            )
            return build_response(200, spots)

        except CoolSpotError as e:
            status_code = e.status_code
            if status_code in (429, 502, 503, 504):
                status_code = 503

            return build_response(
                status_code,
                {
                    "error": "Nearby cooling locations are temporarily unavailable.",
                    "errorCode": "COOLSPOT_PROVIDER_UNAVAILABLE",
                    "retryable": True,
                    "details": e.message,
                },
            )

        except Exception:
            return build_response(
                500,
                {
                    "error": "An unexpected error occurred while looking up cooling locations.",
                    "errorCode": "COOLSPOT_INTERNAL_ERROR",
                },
            )

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
            lat_val = body_json.get("latitude")
            lon_val = body_json.get("longitude")

            if not location and (lat_val is None or lon_val is None):
                return build_response(400, {"error": "Location or lat/lon fields are required", "errorCode": "INVALID_INPUT"})

            if not location and lat_val is not None and lon_val is not None:
                location = f"GPS ({float(lat_val):.4f}, {float(lon_val):.4f})"

            risk_input = HeatRiskInputModel(
                location=location,
                activity=activity,
                plannedTime=planned_time,
                durationMinutes=duration_minutes,
                shadeAvailability=shade
            )

            if lat_val is not None and lon_val is not None:
                try:
                    weather = weather_svc.get_weather_by_coords(float(lat_val), float(lon_val), allow_demo_fallback=allow_demo)
                except (ValueError, TypeError):
                    weather = weather_svc.get_weather(location, allow_demo_fallback=allow_demo)
            else:
                weather = weather_svc.get_weather(location, allow_demo_fallback=allow_demo)

            result = calculate_heat_risk(risk_input, weather)
            return build_response(200, result.to_dict())
        except OpenWeatherError as e:
            return build_response(e.status_code, {"error": e.message, "errorCode": e.error_code})
        except ValueError as e:
            return build_response(400, {"error": str(e), "errorCode": "INVALID_INPUT"})
        except Exception as e:
            return build_response(500, {"error": str(e), "errorCode": "INTERNAL_SERVER_ERROR"})


    if path in ["/api/risk-history", "/risk-history"]:
        if method == "POST":
            try:
                saved = save_assessment(body_json)
                return build_response(201, saved)
            except ValueError as e:
                return build_response(
                    400,
                    {"error": str(e), "errorCode": "INVALID_INPUT"},
                )
            except Exception:
                return build_response(
                    503,
                    {
                        "error": "Risk history storage is temporarily unavailable.",
                        "errorCode": "RISK_HISTORY_UNAVAILABLE",
                    },
                )


        if method == "GET":
            try:
                session_id = query_params.get("sessionId")

                if not session_id:
                    return build_response(
                        400,
                        {
                            "error": "sessionId query parameter is required.",
                            "errorCode": "INVALID_INPUT",
                        },
                    )

                records = get_assessments(session_id, limit=20)
                return build_response(
                    200,
                    {"items": records, "count": len(records)},
                )
            except ValueError as e:
                return build_response(
                    400,
                    {"error": str(e), "errorCode": "INVALID_INPUT"},
                )
            except Exception:
                return build_response(
                    503,
                    {
                        "error": "Risk history storage is temporarily unavailable.",
                        "errorCode": "RISK_HISTORY_UNAVAILABLE",
                    },
                )

                return build_response(
                    200,
                    {"items": records, "count": len(records)},
                )
            except ValueError as e:
                return build_response(
                    400,
                    {"error": str(e), "errorCode": "INVALID_INPUT"},
                )
            except Exception:
                return build_response(
                    503,
                    {
                        "error": "Risk history storage is temporarily unavailable.",
                        "errorCode": "RISK_HISTORY_UNAVAILABLE",
                    },
                )

        return build_response(
            405,
            {"error": "Method not allowed", "errorCode": "METHOD_NOT_ALLOWED"},
            {"Allow": "GET, POST, OPTIONS"},
        )


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
