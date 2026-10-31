import os
from datetime import datetime, timezone
from typing import Dict, Any, List
from config import HTTP_TIMEOUT_SECONDS
from coolspot_adapter import (
    CoolSpotAdapter,
    CoolSpotError,
    calculate_haversine_distance,
    is_valid_coordinate,
    OVERPASS_API_URL,
)

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
    """
    In-memory geographic cache for OpenStreetMap cooling sanctuaries.

    Architectural & Container Lifecycle Notes:
    - Process-local: Resides in the execution memory of a single container / worker process.
    - Cold-start behavior: Each newly spawned AWS Lambda container initializes with an empty cache.
    - Warm invocations: Subsequent requests routed to the same container reuse cached entries,
      dramatically reducing calls to public Overpass mirrors.
    - Spatial coverage & Boundary safety:
      Keyed using 3-decimal precision (~110m grid). When querying, distance-aware spatial coverage
      is verified using the triangle inequality: d(request, entry) + request_radius <= entry_radius.
      Distances for returned spots are always recalculated using the actual requester coordinates.
    - Eviction policy:
      Entries remain fresh for `ttl_seconds` (default: 600s / 10m).
      Expired entries are retained for stale fallback up to `max_stale_seconds` (default: 3600s / 1h).
      Entries are deleted only when stale retention expires or when capacity eviction is required.
    """

    def __init__(
        self,
        ttl_seconds: int = 600,
        max_stale_seconds: int = 3600,
        max_size: int = 200,
    ):
        self.ttl_seconds = int(ttl_seconds)
        self.max_stale_seconds = int(max_stale_seconds)
        self.max_size = int(max_size)
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

    def _make_key(self, lat: float, lon: float, radius_km: float) -> str:
        # 3 decimal places (~110m grid) for high geographic fidelity
        return f"{round(lat, 3):.3f}_{round(lon, 3):.3f}_{round(radius_km, 1):.1f}"

    def _find_entry(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        max_age: float,
    ) -> Optional[Tuple[str, float, List[Dict[str, Any]]]]:
        now = time.time()

        # 1. Direct key match
        direct_key = self._make_key(lat, lon, radius_km)
        if direct_key in self._cache:
            ts, data = self._cache[direct_key]
            if (now - ts) <= max_age:
                return (direct_key, ts, data)

        # 2. Spatially safe coverage check:
        # By the triangle inequality, if an existing cache entry satisfies:
        # d(user, entry_center) + user_radius <= entry_radius + tolerance
        # then the cached disc is guaranteed to contain ALL POIs within the user's circle.
        for key, (ts, data) in self._cache.items():
            age = now - ts
            if age > max_age:
                continue

            try:
                parts = key.split("_")
                entry_lat = float(parts[0])
                entry_lon = float(parts[1])
                entry_radius = float(parts[2])
            except (ValueError, IndexError):
                continue

            center_dist = calculate_haversine_distance(lat, lon, entry_lat, entry_lon)
            # 50m tolerance for floating-point calculations
            if (center_dist + radius_km) <= (entry_radius + 0.05):
                return (key, ts, data)

        return None

    def _format_cached_spots(
        self,
        data: List[Dict[str, Any]],
        user_lat: float,
        user_lon: float,
        radius_km: float,
        timestamp: float,
        age: float,
        is_stale: bool = False,
    ) -> List[Dict[str, Any]]:
        cached_at_iso = datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
        cached_copy = []
        for spot in data:
            item = dict(spot)
            item["dataSourceStatus"] = "osm_live_cached"
            item["cachedAt"] = cached_at_iso
            item["cacheAgeSeconds"] = round(age, 1)
            if is_stale:
                item["isStaleCached"] = True
            # Recalculate distance from the actual user coordinates
            item["distanceKm"] = round(
                calculate_haversine_distance(
                    user_lat,
                    user_lon,
                    item["latitude"],
                    item["longitude"],
                ),
                1,
            )
            cached_copy.append(item)

        cached_copy.sort(key=lambda s: s["distanceKm"])
        return [s for s in cached_copy if s["distanceKm"] <= radius_km]

    def get(self, lat: float, lon: float, radius_km: float) -> Optional[List[Dict[str, Any]]]:
        now = time.time()
        match = self._find_entry(lat, lon, radius_km, max_age=self.ttl_seconds)
        if match is not None:
            _, timestamp, data = match
            age = now - timestamp
            return self._format_cached_spots(
                data,
                lat,
                lon,
                radius_km,
                timestamp,
                age,
                is_stale=False,
            )

        # Evict entries that have exceeded max_stale_seconds completely
        expired_keys = [
            k for k, (ts, _) in self._cache.items()
            if (now - ts) > self.max_stale_seconds
        ]
        for k in expired_keys:
            del self._cache[k]

        return None

    def get_stale(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        max_stale_seconds: Optional[int] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """Returns stale cached data when live upstream providers fail."""
        now = time.time()
        allowed_stale = float(max_stale_seconds or self.max_stale_seconds)
        match = self._find_entry(lat, lon, radius_km, max_age=allowed_stale)
        if match is not None:
            _, timestamp, data = match
            age = now - timestamp
            return self._format_cached_spots(
                data,
                lat,
                lon,
                radius_km,
                timestamp,
                age,
                is_stale=True,
            )
        return None

    def set(self, lat: float, lon: float, radius_km: float, data: List[Dict[str, Any]]) -> None:
        if not isinstance(data, list):
            return

        now = time.time()
        # First clean up fully expired stale entries to free capacity
        expired_keys = [
            k for k, (ts, _) in self._cache.items()
            if (now - ts) > self.max_stale_seconds
        ]
        for k in expired_keys:
            del self._cache[k]

        # Capacity eviction: remove oldest if still at capacity limit
        if len(self._cache) >= self.max_size:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][0])
            del self._cache[oldest_key]

        key = self._make_key(lat, lon, radius_km)
        clean_spots = [dict(s) for s in data]
        self._cache[key] = (now, clean_spots)

    def clear(self) -> None:
        self._cache.clear()

class CoolSpotService:
    def __init__(self, provider_url: str = None, timeout: float = None):
        url = provider_url or os.environ.get("OVERPASS_API_URL", OVERPASS_API_URL)
        self.adapter = CoolSpotAdapter(
            provider_url=url,
            timeout=float(timeout) if timeout else 2.8,
        )
        self.cache = CoolSpotCache(
            ttl_seconds=600,
            max_stale_seconds=3600,
            max_size=200,
        )

    def get_nearby_coolspots(self, lat: float, lon: float, radius_km: float = 5.0, allow_demo: bool = False) -> List[Dict[str, Any]]:
        if not is_valid_coordinate(lat, lon):
            raise CoolSpotError("Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180", status_code=400, error_code="INVALID_INPUT")

        radius_km = max(0.1, min(50.0, float(radius_km)))

        if not allow_demo:
            cached = self.cache.get(lat, lon, radius_km)
            if cached is not None:
                return cached
            try:
                spots = self.adapter.fetch_nearby_coolspots(lat, lon, radius_km=radius_km)
                self.cache.set(lat, lon, radius_km, spots)
                return spots
            except CoolSpotError as err:
                # If provider fails, check if stale cache exists to preserve service continuity
                stale = self.cache.get_stale(lat, lon, radius_km)
                if stale is not None and len(stale) > 0:
                    return stale
                raise err

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
