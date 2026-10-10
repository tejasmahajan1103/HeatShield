import json
import math
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from config import HTTP_TIMEOUT_SECONDS

OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"

class CoolSpotError(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str = "PROVIDER_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

def is_valid_coordinate(lat: float, lon: float) -> bool:
    return isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if not is_valid_coordinate(lat1, lon1) or not is_valid_coordinate(lat2, lon2):
        return float("inf")
    R = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c

class CoolSpotAdapter:
    def __init__(self, provider_url: str = OVERPASS_API_URL, timeout: float = HTTP_TIMEOUT_SECONDS):
        self.provider_url = provider_url
        self.timeout = timeout

    def fetch_nearby_coolspots(self, lat: float, lon: float, radius_km: float = 5.0, max_results: int = 30) -> List[Dict[str, Any]]:
        if not is_valid_coordinate(lat, lon):
            raise CoolSpotError("Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180", status_code=400, error_code="INVALID_INPUT")
        
        radius_km = max(0.1, min(50.0, float(radius_km)))
        radius_m = int(radius_km * 1000)

        # Overpass QL query targeting parks, gardens, libraries, community centres, drinking water, cooling centres, and worship places
        query = f"""[out:json][timeout:4];
(
  node["leisure"="park"](around:{radius_m},{lat},{lon});
  way["leisure"="park"](around:{radius_m},{lat},{lon});
  node["leisure"="garden"](around:{radius_m},{lat},{lon});
  way["leisure"="garden"](around:{radius_m},{lat},{lon});
  node["amenity"="library"](around:{radius_m},{lat},{lon});
  node["amenity"="community_centre"](around:{radius_m},{lat},{lon});
  node["amenity"="drinking_water"](around:{radius_m},{lat},{lon});
  node["amenity"="cooling_centre"](around:{radius_m},{lat},{lon});
  node["amenity"="place_of_worship"](around:{radius_m},{lat},{lon});
  way["amenity"="place_of_worship"](around:{radius_m},{lat},{lon});
);
out center {max_results * 2};"""

        encoded_data = urllib.parse.urlencode({"data": query}).encode("utf-8")
        endpoints = [self.provider_url]
        if self.provider_url == OVERPASS_API_URL:
            endpoints.append("https://overpass.khtml.de/api/interpreter")

        last_err = None
        for endpoint in endpoints:
            req = urllib.request.Request(
                endpoint,
                data=encoded_data,
                headers={
                    "User-Agent": "HeatShield-CoolSpotDiscovery/1.0",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw_text = resp.read().decode("utf-8")
                    parsed = json.loads(raw_text)
                    elements = parsed.get("elements", [])
                    return self._parse_elements(elements, lat, lon, max_results)
            except urllib.error.HTTPError as e:
                err_code = "RATE_LIMITED" if e.code == 429 else "PROVIDER_HTTP_ERROR"
                last_err = CoolSpotError(f"Overpass API HTTP Error {e.code}: {e.reason}", status_code=e.code, error_code=err_code)
                if e.code in [429, 502, 503, 504]:
                    continue
            except urllib.error.URLError as e:
                last_err = CoolSpotError(f"Network error connecting to Overpass provider: {e.reason}", status_code=504, error_code="NETWORK_TIMEOUT")
            except TimeoutError:
                last_err = CoolSpotError("Network timeout reached while fetching geographic data", status_code=504, error_code="NETWORK_TIMEOUT")
            except json.JSONDecodeError:
                last_err = CoolSpotError("Received malformed JSON response from geographic provider", status_code=502, error_code="MALFORMED_RESPONSE")

        if last_err:
            raise last_err
        raise CoolSpotError("Geographic provider request failed", status_code=500, error_code="PROVIDER_ERROR")

    def _parse_elements(self, elements: List[Dict[str, Any]], user_lat: float, user_lon: float, max_results: int) -> List[Dict[str, Any]]:
        spots = []

        for elem in elements:
            tags = elem.get("tags", {})
            elem_type = elem.get("type", "node")
            elem_id = elem.get("id")

            # Extract latitude & longitude
            if elem_type == "node":
                spot_lat = elem.get("lat")
                spot_lon = elem.get("lon")
            else:
                center = elem.get("center", {})
                spot_lat = center.get("lat")
                spot_lon = center.get("lon")

            if spot_lat is None or spot_lon is None or not is_valid_coordinate(spot_lat, spot_lon):
                continue

            dist_km = round(calculate_haversine_distance(user_lat, user_lon, spot_lat, spot_lon), 1)

            # Categorization & Verification Rules
            amenity = tags.get("amenity", "")
            leisure = tags.get("leisure", "")
            waterway = tags.get("waterway", "")
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
                water_verified = True
                shade_verified = True
            elif amenity == "place_of_worship":
                category = "temple"
                category_label = "Shaded Temple / Worship Place"
                religion = tags.get("religion", "")
                fallback_name = f"Shaded {religion.title() or 'Worship'} Space" if religion else "Shaded Temple / Worship Place"
                is_indoor = True
                water_verified = tags.get("drinking_water") == "yes" or tags.get("water") == "yes"
                shade_verified = True
            elif amenity in ["library", "community_centre", "townhall", "public_building"]:
                category = "indoor_public"
                category_label = "Indoor Public Space"
                fallback_name = f"Public {amenity.replace('_', ' ').title()}"
                is_indoor = True
                water_verified = tags.get("drinking_water") == "yes" or tags.get("water") == "yes"
                shade_verified = True
            else:
                category = "park"
                category_label = "Park & Outdoor Shade"
                fallback_name = "Public Shaded Park"
                is_indoor = False
                water_verified = tags.get("drinking_water") == "yes"
                shade_verified = True

            # Amenities List Extraction
            amenities = []
            if shade_verified or category == "park":
                amenities.append("Shade Coverage")
            if is_indoor:
                amenities.append("Air Conditioned")
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

            # Stable ID
            spot_id = f"osm_{elem_type}_{elem_id}"
            spot_name = name if name and name.strip() else fallback_name

            # Address formatting
            street = tags.get("addr:street")
            city = tags.get("addr:city")
            suburb = tags.get("addr:suburb")
            address_parts = [p for p in [street, suburb, city] if p]
            address = ", ".join(address_parts) if address_parts else f"Near {user_lat:.4f}, {user_lon:.4f}"

            spots.append({
                "id": spot_id,
                "name": spot_name,
                "category": category,
                "categoryLabel": category_label,
                "distanceKm": dist_km,
                "latitude": spot_lat,
                "longitude": spot_lon,
                "isIndoor": is_indoor,
                "shadeVerified": shade_verified,
                "waterVerified": water_verified,
                "openStatusVerified": bool(tags.get("opening_hours")),
                "isOpenNow": True,
                "operatingHours": tags.get("opening_hours", "Public Access / Check Local Hours"),
                "lastVerifiedTimestamp": datetime.now(timezone.utc).isoformat(),
                "description": tags.get("description", f"OpenStreetMap mapped {category_label.lower()} location with verified geographic coordinates."),
                "address": address,
                "amenities": amenities,
                "isSampleData": False,
                "dataSourceStatus": "osm_live"
            })

        # Sort by straight-line distance and limit to max_results
        spots.sort(key=lambda s: s["distanceKm"])
        return spots[:max_results]
