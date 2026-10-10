import os
from datetime import datetime, timezone
from typing import Dict, Any, List
from config import HTTP_TIMEOUT_SECONDS
from coolspot_adapter import CoolSpotAdapter, CoolSpotError, calculate_haversine_distance, is_valid_coordinate

SAMPLE_COOLSPOTS_PYTHON = [
    {
        "id": "cs-001",
        "name": "Cubbon Park Canopy Area",
        "category": "park",
        "categoryLabel": "Park & Outdoor Shade",
        "distanceKm": 0.8,
        "latitude": 12.9763,
        "longitude": 77.5929,
        "isIndoor": False,
        "shadeVerified": True,
        "waterVerified": True,
        "openStatusVerified": True,
        "isOpenNow": True,
        "operatingHours": "06:00 - 20:00 Daily",
        "lastVerifiedTimestamp": datetime.now(timezone.utc).isoformat(),
        "description": "Dense tree canopy providing heavy solar radiation protection and water refill fountains.",
        "address": "Kasturba Road, Sampangi Rama Nagara, Bengaluru",
        "amenities": ["Dense Shade", "Drinking Water Fountains", "Public Restrooms", "Walking Paths"],
        "isSampleData": True,
        "dataSourceStatus": "demo_simulated"
    },
    {
        "id": "cs-002",
        "name": "State Central Library AC Hall",
        "category": "indoor_public",
        "categoryLabel": "Indoor Public Space",
        "distanceKm": 1.2,
        "latitude": 12.9744,
        "longitude": 77.5912,
        "isIndoor": True,
        "shadeVerified": True,
        "waterVerified": True,
        "openStatusVerified": True,
        "isOpenNow": True,
        "operatingHours": "08:30 - 19:30 Mon-Sat",
        "lastVerifiedTimestamp": datetime.now(timezone.utc).isoformat(),
        "description": "Air-conditioned public reading halls with chilled hydration points and resting areas.",
        "address": "Cubbon Park, Bengaluru, Karnataka",
        "amenities": ["HVAC Climate Control", "Filtered Cold Water", "Seating & Rest Areas", "Free Public Access"],
        "isSampleData": True,
        "dataSourceStatus": "demo_simulated"
    },
    {
        "id": "cs-003",
        "name": "Lalbagh Botanical Garden Shade Grove",
        "category": "park",
        "categoryLabel": "Park & Outdoor Shade",
        "distanceKm": 2.5,
        "latitude": 12.9507,
        "longitude": 77.5848,
        "isIndoor": False,
        "shadeVerified": True,
        "waterVerified": True,
        "openStatusVerified": True,
        "isOpenNow": True,
        "operatingHours": "06:00 - 19:00 Daily",
        "lastVerifiedTimestamp": datetime.now(timezone.utc).isoformat(),
        "description": "Expansive green cover with heritage trees, lake breeze, and multiple water refill points.",
        "address": "Mavalli, Bengaluru, Karnataka",
        "amenities": ["Botanical Shade", "Water Kiosks", "Shaded Benches", "Wheelchair Access"],
        "isSampleData": True,
        "dataSourceStatus": "demo_simulated"
    },
    {
        "id": "cs-004",
        "name": "KSR Metro Transit Cooling Zone",
        "category": "cooling_center",
        "categoryLabel": "Official Cooling Haven",
        "distanceKm": 3.1,
        "latitude": 12.9781,
        "longitude": 77.5697,
        "isIndoor": True,
        "shadeVerified": True,
        "waterVerified": True,
        "openStatusVerified": True,
        "isOpenNow": True,
        "operatingHours": "05:00 - 23:00 Daily",
        "lastVerifiedTimestamp": datetime.now(timezone.utc).isoformat(),
        "description": "Air-conditioned public concourse equipped with medical emergency aid and free hydration station.",
        "address": "Majestic Station, Kempegowda, Bengaluru",
        "amenities": ["Air Conditioned", "Emergency Aid Desk", "Free Hydration", "Public Transit Connect"],
        "isSampleData": True,
        "dataSourceStatus": "demo_simulated"
    },
    {
        "id": "cs-005",
        "name": "MG Road Public Water Kiosk",
        "category": "water_point",
        "categoryLabel": "Water Refill Point",
        "distanceKm": 1.6,
        "latitude": 12.9756,
        "longitude": 77.6068,
        "isIndoor": False,
        "shadeVerified": True,
        "waterVerified": True,
        "openStatusVerified": True,
        "isOpenNow": True,
        "operatingHours": "24 Hours Public Access",
        "lastVerifiedTimestamp": datetime.now(timezone.utc).isoformat(),
        "description": "High-capacity stainless steel drinking water station under covered canopy.",
        "address": "MG Road Boulevard, Bengaluru",
        "amenities": ["RO Filtered Water", "Canopy Shade", "Touchless Dispenser", "24/7 Access"],
        "isSampleData": True,
        "dataSourceStatus": "demo_simulated"
    }
]

import time
from typing import Optional, Tuple

class CoolSpotCache:
    def __init__(self, ttl_seconds: int = 300, max_size: int = 100):
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

    def _make_key(self, lat: float, lon: float, radius_km: float) -> str:
        return f"{round(lat, 2):.2f}_{round(lon, 2):.2f}_{round(radius_km, 1):.1f}"

    def get(self, lat: float, lon: float, radius_km: float) -> Optional[List[Dict[str, Any]]]:
        key = self._make_key(lat, lon, radius_km)
        if key in self._cache:
            timestamp, data = self._cache[key]
            if time.time() - timestamp < self.ttl_seconds:
                cached_copy = []
                for spot in data:
                    item = dict(spot)
                    item["dataSourceStatus"] = "osm_live_cached"
                    item["distanceKm"] = round(calculate_haversine_distance(lat, lon, item["latitude"], item["longitude"]), 1)
                    cached_copy.append(item)
                cached_copy.sort(key=lambda s: s["distanceKm"])
                return cached_copy
            else:
                del self._cache[key]
        return None

    def set(self, lat: float, lon: float, radius_km: float, data: List[Dict[str, Any]]) -> None:
        if len(self._cache) >= self.max_size:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][0])
            del self._cache[oldest_key]
        key = self._make_key(lat, lon, radius_km)
        self._cache[key] = (time.time(), data)

class CoolSpotService:
    def __init__(self, provider_url: str = None, timeout: float = HTTP_TIMEOUT_SECONDS):
        url = provider_url or os.environ.get("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
        self.adapter = CoolSpotAdapter(provider_url=url, timeout=min(float(timeout), 4.0))
        self.cache = CoolSpotCache(ttl_seconds=300)

    def get_nearby_coolspots(self, lat: float, lon: float, radius_km: float = 5.0, allow_demo: bool = False) -> List[Dict[str, Any]]:
        if not is_valid_coordinate(lat, lon):
            raise CoolSpotError("Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180", status_code=400, error_code="INVALID_INPUT")

        radius_km = max(0.1, min(50.0, float(radius_km)))

        if not allow_demo:
            cached = self.cache.get(lat, lon, radius_km)
            if cached is not None:
                return cached
            spots = self.adapter.fetch_nearby_coolspots(lat, lon, radius_km=radius_km)
            self.cache.set(lat, lon, radius_km, spots)
            return spots

        # Demo Mode recalculating distance from user lat/lon
        return self._get_sample_coolspots(lat, lon, radius_km)

    def _get_sample_coolspots(self, lat: float, lon: float, radius_km: float) -> List[Dict[str, Any]]:
        recalculated = []
        for s in SAMPLE_COOLSPOTS_PYTHON:
            item = dict(s)
            dist = round(calculate_haversine_distance(lat, lon, item["latitude"], item["longitude"]), 1)
            item["distanceKm"] = dist
            recalculated.append(item)
        
        recalculated.sort(key=lambda x: x["distanceKm"])
        return [s for s in recalculated if s["distanceKm"] <= radius_km]
