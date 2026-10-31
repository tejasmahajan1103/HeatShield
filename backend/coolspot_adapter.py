
import json
import math
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List
from config import HTTP_TIMEOUT_SECONDS


OVERPASS_API_URL = "https://overpass.openstreetmap.fr/api/interpreter"
FALLBACK_OVERPASS_URL = "https://overpass-api.de/api/interpreter"
ADDITIONAL_OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"


# Sensible provider timeouts fitting within frontend 12s abort and API Gateway 29s limits:
DEFAULT_PROVIDER_TIMEOUT_SECONDS = 4.0
MAX_PROVIDER_BUDGET_SECONDS = 8.5


class CoolSpotError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "PROVIDER_ERROR",
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


def is_valid_coordinate(lat: float, lon: float) -> bool:
    return (
        isinstance(lat, (int, float))
        and isinstance(lon, (int, float))
        and -90.0 <= lat <= 90.0
        and -180.0 <= lon <= 180.0
    )


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    if (
        not is_valid_coordinate(lat1, lon1)
        or not is_valid_coordinate(lat2, lon2)
    ):
        return float("inf")

    earth_radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )

    c = 2.0 * math.atan2(
        math.sqrt(a),
        math.sqrt(max(0.0, 1.0 - a)),
    )

    return earth_radius_km * c


class CoolSpotAdapter:
    def __init__(
        self,
        provider_url: str = OVERPASS_API_URL,
        timeout: float = DEFAULT_PROVIDER_TIMEOUT_SECONDS,
        max_total_budget: float = MAX_PROVIDER_BUDGET_SECONDS,
    ):
        self.provider_url = provider_url
        # Provider per-request timeout: capped between 1.5 and 4.5 seconds (fits within 8.5s total budget)
        self.timeout = max(1.5, min(4.5, float(timeout) if timeout else DEFAULT_PROVIDER_TIMEOUT_SECONDS))
        self.max_total_budget = float(max_total_budget)

    def calculate_worst_case_budget(self, num_endpoints: int = 3) -> float:
        """Calculates total worst-case execution budget across endpoints."""
        attempts_per_endpoint = 1 if num_endpoints > 1 else 2
        return min(self.max_total_budget, num_endpoints * attempts_per_endpoint * self.timeout)

    def _read_with_deadline(
        self,
        response: Any,
        deadline: float,
        chunk_size: int = 65536,
    ) -> bytes:
        """
        Reads the response body, strictly enforcing that total elapsed time
        does not exceed `deadline`. Prevents slow-drip responses from bypassing socket timeouts.
        Handles both streaming HTTP responses and mock objects in unit tests.
        """
        if time.time() >= deadline:
            raise TimeoutError("Total provider execution deadline exceeded before reading response stream")

        chunks = []
        while True:
            if time.time() >= deadline:
                raise TimeoutError("Total provider execution deadline exceeded while reading response stream")

            chunk = response.read(chunk_size)
            if not chunk:
                break
            chunks.append(chunk)

            if time.time() >= deadline:
                raise TimeoutError("Total provider execution deadline exceeded while reading response stream")

            if len(chunk) < chunk_size:
                break

        return b"".join(chunks)

    def fetch_nearby_coolspots(
        self,
        lat: float,
        lon: float,
        radius_km: float = 5.0,
        max_results: int = 30,
    ) -> List[Dict[str, Any]]:
        if not is_valid_coordinate(lat, lon):
            raise CoolSpotError(
                "Invalid coordinates: Latitude must be between -90 and 90, "
                "Longitude between -180 and 180",
                status_code=400,
                error_code="INVALID_INPUT",
            )

        # Bound radius between 0.1km and 10.0km to prevent excessive element collection
        radius_km = max(0.1, min(10.0, float(radius_km)))
        radius_m = int(radius_km * 1000)
        max_results = max(1, min(60, int(max_results)))

        # Optimized Overpass QL query:
        # - [timeout:5]; instructs Overpass server to quickly process and not hang
        # - 'out tags center qt {max_results * 2};' uses quadtile spatial indexing (qt)
        #   which is twice as fast as default ID sorting and strips away massive way node lists.
        query = f"""[out:json][timeout:5];
(
  node["leisure"="park"](around:{radius_m},{lat},{lon});
  way["leisure"="park"](around:{radius_m},{lat},{lon});
  node["leisure"="garden"](around:{radius_m},{lat},{lon});
  way["leisure"="garden"](around:{radius_m},{lat},{lon});
  node["amenity"="drinking_water"](around:{radius_m},{lat},{lon});
  node["amenity"="cooling_centre"](around:{radius_m},{lat},{lon});
  node["amenity"="library"](around:{radius_m},{lat},{lon});
  way["amenity"="library"](around:{radius_m},{lat},{lon});
  node["amenity"="community_centre"](around:{radius_m},{lat},{lon});
  way["amenity"="community_centre"](around:{radius_m},{lat},{lon});
  node["amenity"="place_of_worship"](around:{radius_m},{lat},{lon});
  way["amenity"="place_of_worship"](around:{radius_m},{lat},{lon});
);
out tags center qt {max_results * 2};"""

        encoded_data = urllib.parse.urlencode(
            {"data": query}
        ).encode("utf-8")

        endpoints = [self.provider_url]
        if self.provider_url == OVERPASS_API_URL:
            endpoints.append(FALLBACK_OVERPASS_URL)
            endpoints.append(ADDITIONAL_OVERPASS_URL)
        else:
            if OVERPASS_API_URL not in endpoints:
                endpoints.append(OVERPASS_API_URL)
            if FALLBACK_OVERPASS_URL not in endpoints:
                endpoints.append(FALLBACK_OVERPASS_URL)
            if ADDITIONAL_OVERPASS_URL not in endpoints:
                endpoints.append(ADDITIONAL_OVERPASS_URL)

        unique_endpoints = list(dict.fromkeys(endpoints))
        # If multiple mirrors are configured, use 1 attempt per mirror (0 retries) for fast failover.
        # If only 1 mirror is configured, allow 1 retry with short backoff.
        max_retries_per_endpoint = 1 if len(unique_endpoints) == 1 else 0

        last_err = None
        start_time = time.time()
        deadline = start_time + self.max_total_budget

        for endpoint in unique_endpoints:
            now = time.time()
            if now >= deadline:
                # Stop if total budget has expired
                break

            for attempt in range(max_retries_per_endpoint + 1):
                now = time.time()
                if now >= deadline:
                    break

                remaining = max(0.01, deadline - now)
                current_timeout = min(self.timeout, remaining)

                req = urllib.request.Request(
                    endpoint,
                    data=encoded_data,
                    headers={
                        "User-Agent": "HeatShield-CoolSpotDiscovery/1.0",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/json",
                    },
                    method="POST",
                )

                try:
                    with urllib.request.urlopen(
                        req,
                        timeout=current_timeout,
                    ) as response:
                        raw_bytes = self._read_with_deadline(response, deadline=deadline)
                        raw_text = raw_bytes.decode("utf-8")
                        parsed = json.loads(raw_text)

                        if not isinstance(parsed, dict):
                            raise json.JSONDecodeError(
                                "Unexpected provider response",
                                raw_text,
                                0,
                            )

                        elements = parsed.get("elements", [])

                        if not isinstance(elements, list):
                            raise json.JSONDecodeError(
                                "Invalid elements in provider response",
                                raw_text,
                                0,
                            )

                        return self._parse_elements(
                            elements,
                            lat,
                            lon,
                            max_results,
                        )

                except urllib.error.HTTPError as e:
                    error_code = (
                        "RATE_LIMITED"
                        if e.code == 429
                        else "PROVIDER_HTTP_ERROR"
                    )

                    last_err = CoolSpotError(
                        f"Overpass API HTTP Error {e.code}: {e.reason}",
                        status_code=(
                            e.code if e.code in (400, 429) else 503
                        ),
                        error_code=error_code,
                    )

                    if e.code in (429, 500, 502, 503, 504) and attempt < max_retries_per_endpoint:
                        time.sleep(0.2 * (attempt + 1))
                        continue

                    break

                except (urllib.error.URLError, OSError, TimeoutError) as e:
                    reason = getattr(e, "reason", e)

                    last_err = CoolSpotError(
                        f"Network error connecting to Overpass provider: {reason}",
                        status_code=504,
                        error_code="NETWORK_TIMEOUT",
                    )
                    if attempt < max_retries_per_endpoint:
                        time.sleep(0.2 * (attempt + 1))
                        continue
                    break

                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    last_err = CoolSpotError(
                        f"Invalid response from Overpass provider: {e}",
                        status_code=502,
                        error_code="MALFORMED_RESPONSE",
                    )
                    break

        if last_err:
            raise last_err

        if time.time() - start_time >= self.max_total_budget:
            raise CoolSpotError(
                f"Provider request exceeded total execution deadline of {self.max_total_budget:.1f}s",
                status_code=504,
                error_code="NETWORK_TIMEOUT",
            )

        raise CoolSpotError(
            "Geographic provider request failed",
            status_code=503,
            error_code="PROVIDER_UNAVAILABLE",
        )

    def _parse_elements(
        self,
        elements: List[Dict[str, Any]],
        user_lat: float,
        user_lon: float,
        max_results: int,
    ) -> List[Dict[str, Any]]:
        spots = []

        for elem in elements:
            tags = elem.get("tags", {})
            elem_type = elem.get("type", "node")
            elem_id = elem.get("id")

            if elem_type == "node":
                spot_lat = elem.get("lat")
                spot_lon = elem.get("lon")
            else:
                center = elem.get("center", {})
                spot_lat = center.get("lat")
                spot_lon = center.get("lon")

            if (
                spot_lat is None
                or spot_lon is None
                or not is_valid_coordinate(spot_lat, spot_lon)
            ):
                continue

            distance_km = round(
                calculate_haversine_distance(
                    user_lat,
                    user_lon,
                    spot_lat,
                    spot_lon,
                ),
                1,
            )

            amenity = tags.get("amenity", "")
            waterway = tags.get("waterway", "")
            leisure = tags.get("leisure", "")
            name = tags.get("name")

            if amenity == "drinking_water" or waterway == "water_point":
                category = "water_point"
                category_label = "Water Refill Point"
                fallback_name = "Public Drinking Water Station"
                is_indoor = False
                water_verified = True
                shade_verified = tags.get("shade") == "yes"

            elif amenity == "cooling_centre":
                category = "cooling_center"
                category_label = "Official Cooling Haven"
                fallback_name = "Designated Cooling Center"
                is_indoor = True
                water_verified = (
                    tags.get("drinking_water") == "yes"
                    or tags.get("water") == "yes"
                )
                shade_verified = True

            elif amenity == "place_of_worship":
                category = "temple"
                category_label = "Shaded Temple / Worship Place"
                religion = tags.get("religion", "")
                fallback_name = (
                    f"Shaded {religion.title()} Space"
                    if religion
                    else "Shaded Temple / Worship Place"
                )
                is_indoor = True
                water_verified = (
                    tags.get("drinking_water") == "yes"
                    or tags.get("water") == "yes"
                )
                shade_verified = True

            elif amenity in (
                "library",
                "community_centre",
                "townhall",
                "public_building",
            ):
                category = "indoor_public"
                category_label = "Indoor Public Space"
                fallback_name = f"Public {amenity.replace('_', ' ').title()}"
                is_indoor = True
                water_verified = (
                    tags.get("drinking_water") == "yes"
                    or tags.get("water") == "yes"
                )
                shade_verified = True

            else:
                category = "park"
                category_label = "Park & Outdoor Shade"
                fallback_name = "Public Shaded Park"
                is_indoor = False
                water_verified = tags.get("drinking_water") == "yes"
                shade_verified = tags.get("shade") == "yes" or leisure in ("park", "garden")

            amenities = []

            if shade_verified or category == "park":
                amenities.append("Shade Coverage")

            # Air Conditioning: Only claim verified AC if explicitly tagged air_conditioning or designated cooling centre
            has_verified_ac = (
                tags.get("air_conditioning") in ("yes", "true", "conditioned")
                or amenity == "cooling_centre"
            )
            has_hvac = tags.get("hvac") in ("yes", "true")

            if has_verified_ac:
                amenities.append("Air Conditioned (Verified)")
            elif has_hvac:
                amenities.append("Climate Controlled (HVAC)")
            elif is_indoor:
                amenities.append("Indoor Public Space")

            if water_verified:
                amenities.append("Drinking Water")

            if tags.get("wheelchair") == "yes":
                amenities.append("Wheelchair Accessible")

            if tags.get("toilets") == "yes":
                amenities.append("Restrooms")

            if tags.get("benches") == "yes":
                amenities.append("Seating / Benches")

            if not amenities:
                amenities = ["Public Access Area"]

            spot_id = f"osm_{elem_type}_{elem_id}"
            spot_name = (
                name.strip()
                if isinstance(name, str) and name.strip()
                else fallback_name
            )

            street = tags.get("addr:street")
            city = tags.get("addr:city")
            suburb = tags.get("addr:suburb")

            address_parts = [
                part for part in (street, suburb, city) if part
            ]

            address = (
                ", ".join(address_parts)
                if address_parts
                else f"Near {user_lat:.4f}, {user_lon:.4f}"
            )

            # Opening Hours & Open Status Verification
            # Never claim isOpenNow=True unless verified open (e.g. 24/7 or confirmed schedule)
            opening_hours = tags.get("opening_hours")
            open_status_verified = bool(opening_hours and opening_hours.strip())
            if not open_status_verified:
                is_open_now = False
            elif opening_hours.strip().lower() in ("24/7", "24/7 daily", "24 hours", "00:00-24:00"):
                is_open_now = True
            else:
                # Listed opening hours exist (verified schedule available), but real-time schedule unverified
                is_open_now = False

            spots.append(
                {
                    "id": spot_id,
                    "name": spot_name,
                    "category": category,
                    "categoryLabel": category_label,
                    "distanceKm": distance_km,
                    "latitude": spot_lat,
                    "longitude": spot_lon,
                    "isIndoor": is_indoor,
                    "shadeVerified": shade_verified,
                    "waterVerified": water_verified,
                    "openStatusVerified": open_status_verified,
                    "isOpenNow": is_open_now,
                    "operatingHours": (
                        opening_hours
                        if open_status_verified
                        else "Public Access / Check Local Hours"
                    ),
                    "lastVerifiedTimestamp": datetime.now(
                        timezone.utc
                    ).isoformat(),
                    "description": tags.get(
                        "description",
                        (
                            "OpenStreetMap mapped "
                            f"{category_label.lower()} location "
                            "with geographic coordinates."
                        ),
                    ),
                    "address": address,
                    "amenities": amenities,
                    "isSampleData": False,
                    "dataSourceStatus": "osm_live",
                }
            )

        spots.sort(key=lambda spot: spot["distanceKm"])
        return spots[:max_results]
