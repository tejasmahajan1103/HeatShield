import sys
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from coolspot_adapter import (
    CoolSpotAdapter,
    CoolSpotError,
    is_valid_coordinate,
    calculate_haversine_distance,
    OVERPASS_API_URL,
    FALLBACK_OVERPASS_URL,
    ADDITIONAL_OVERPASS_URL,
)
from coolspot_service import CoolSpotService, CoolSpotCache
from lambda_handler import lambda_handler

class TestCoolSpotBackend(unittest.TestCase):
    def test_coordinate_validation(self):
        self.assertTrue(is_valid_coordinate(12.9716, 77.5946))
        self.assertTrue(is_valid_coordinate(0.0, 0.0))
        self.assertFalse(is_valid_coordinate(95.0, 77.5946))
        self.assertFalse(is_valid_coordinate(12.9716, 200.0))
        self.assertFalse(is_valid_coordinate("invalid", 77.5946))

    def test_haversine_distance_calculation(self):
        # Distance between Bengaluru Cubbon Park (12.9763, 77.5929) and Lalbagh (12.9507, 77.5848) ~ 3.0 km
        dist = calculate_haversine_distance(12.9763, 77.5929, 12.9507, 77.5848)
        self.assertAlmostEqual(dist, 3.0, delta=0.5)

    @patch("urllib.request.urlopen")
    def test_overpass_adapter_parsing(self, mock_urlopen):
        mock_overpass_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 1001,
                    "lat": 12.9763,
                    "lon": 77.5929,
                    "tags": {
                        "name": "Cubbon Park",
                        "leisure": "park",
                        "shade": "yes",
                        "drinking_water": "yes"
                    }
                },
                {
                    "type": "node",
                    "id": 1002,
                    "lat": 12.9744,
                    "lon": 77.5912,
                    "tags": {
                        "name": "Central Library",
                        "amenity": "library",
                        "opening_hours": "09:00-20:00"
                    }
                }
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_overpass_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=5.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)

        self.assertEqual(len(spots), 2)
        self.assertEqual(spots[0]["id"], "osm_node_1002")
        self.assertEqual(spots[0]["category"], "indoor_public")
        self.assertTrue(spots[0]["isIndoor"])

        self.assertEqual(spots[1]["id"], "osm_node_1001")
        self.assertEqual(spots[1]["category"], "park")
        self.assertFalse(spots[1]["isSampleData"])
        self.assertEqual(spots[1]["dataSourceStatus"], "osm_live")

    @patch("urllib.request.urlopen")
    def test_overpass_adapter_temple_category(self, mock_urlopen):
        mock_overpass_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 2001,
                    "lat": 12.9750,
                    "lon": 77.5920,
                    "tags": {
                        "name": "Shri Someshwara Temple",
                        "amenity": "place_of_worship",
                        "religion": "hindu",
                        "drinking_water": "yes"
                    }
                }
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_overpass_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=5.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(len(spots), 1)
        self.assertEqual(spots[0]["category"], "temple")
        self.assertEqual(spots[0]["categoryLabel"], "Shaded Temple / Worship Place")
        self.assertTrue(spots[0]["waterVerified"])

    def test_coolspot_service_demo_fallback(self):
        svc = CoolSpotService()
        spots = svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0, allow_demo=True)
        self.assertGreater(len(spots), 0)
        self.assertTrue(spots[0]["isSampleData"])

    def test_lambda_handler_coolspots_route(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/coolspots",
            "queryStringParameters": {
                "lat": "12.9716",
                "lon": "77.5946",
                "radiusKm": "5.0",
                "demo": "true"
            }
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 200)

        body = json.loads(res["body"])
        self.assertIsInstance(body, list)
        self.assertGreater(len(body), 0)
        self.assertIn("distanceKm", body[0])

    def test_lambda_handler_coolspots_invalid_params(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/coolspots",
            "queryStringParameters": {
                "lat": "invalid_lat",
                "lon": "77.5946"
            }
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 400)
        body = json.loads(res["body"])
        self.assertEqual(body["errorCode"], "INVALID_INPUT")

    @patch("urllib.request.urlopen")
    def test_primary_overpass_success(self, mock_urlopen):
        mock_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 3001,
                    "lat": 12.9716,
                    "lon": 77.5946,
                    "tags": {
                        "name": "Primary Park",
                        "leisure": "park",
                        "shade": "yes"
                    }
                }
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=4.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=3.0)
        self.assertEqual(len(spots), 1)
        self.assertEqual(spots[0]["name"], "Primary Park")
        self.assertEqual(spots[0]["dataSourceStatus"], "osm_live")

    @patch("urllib.request.urlopen")
    def test_primary_endpoint_timeout_fallback_success(self, mock_urlopen):
        import urllib.error
        # Primary endpoint fails; secondary mirror succeeds on immediate failover
        mock_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 3002,
                    "lat": 12.9720,
                    "lon": 77.5950,
                    "tags": {
                        "name": "Fallback Sanctuary",
                        "leisure": "garden"
                    }
                }
            ]
        }
        fallback_cm = MagicMock()
        fallback_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        fallback_cm.__enter__.return_value = fallback_cm

        mock_urlopen.side_effect = [
            urllib.error.URLError(TimeoutError("The read operation timed out")),
            fallback_cm
        ]

        adapter = CoolSpotAdapter(timeout=3.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=3.0)
        self.assertEqual(len(spots), 1)
        self.assertEqual(spots[0]["name"], "Fallback Sanctuary")

        # Verify exact call count and sequence of provider mirror URLs
        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertEqual(mock_urlopen.call_args_list[0][0][0].full_url, OVERPASS_API_URL)
        self.assertEqual(mock_urlopen.call_args_list[1][0][0].full_url, FALLBACK_OVERPASS_URL)

    @patch("urllib.request.urlopen")
    def test_tertiary_endpoint_success(self, mock_urlopen):
        import urllib.error
        # Primary and secondary fail; tertiary mirror succeeds
        mock_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 3003,
                    "lat": 12.9725,
                    "lon": 77.5955,
                    "tags": {
                        "name": "Tertiary Haven",
                        "amenity": "drinking_water"
                    }
                }
            ]
        }
        tertiary_cm = MagicMock()
        tertiary_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        tertiary_cm.__enter__.return_value = tertiary_cm

        mock_urlopen.side_effect = [
            urllib.error.URLError(TimeoutError("Primary mirror timed out")),
            urllib.error.HTTPError(FALLBACK_OVERPASS_URL, 504, "Gateway Timeout", {}, None),
            tertiary_cm
        ]

        adapter = CoolSpotAdapter(timeout=3.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=3.0)
        self.assertEqual(len(spots), 1)
        self.assertEqual(spots[0]["name"], "Tertiary Haven")

        # Verify all 3 mirrors were attempted in expected sequence
        self.assertEqual(mock_urlopen.call_count, 3)
        self.assertEqual(mock_urlopen.call_args_list[0][0][0].full_url, OVERPASS_API_URL)
        self.assertEqual(mock_urlopen.call_args_list[1][0][0].full_url, FALLBACK_OVERPASS_URL)
        self.assertEqual(mock_urlopen.call_args_list[2][0][0].full_url, ADDITIONAL_OVERPASS_URL)

    @patch("urllib.request.urlopen")
    def test_both_endpoints_failing_raises_provider_error(self, mock_urlopen):
        import urllib.error
        # All 3 configured mirrors raise timeout
        mock_urlopen.side_effect = [
            urllib.error.URLError(TimeoutError("Primary timed out")),
            urllib.error.URLError(TimeoutError("Secondary timed out")),
            urllib.error.URLError(TimeoutError("Tertiary timed out")),
        ]

        adapter = CoolSpotAdapter(timeout=2.0)
        with self.assertRaises(CoolSpotError) as ctx:
            adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=3.0)
        self.assertIn(ctx.exception.status_code, (503, 504))

        # Asserts all 3 mirrors were attempted in order
        self.assertEqual(mock_urlopen.call_count, 3)
        self.assertEqual(mock_urlopen.call_args_list[0][0][0].full_url, OVERPASS_API_URL)
        self.assertEqual(mock_urlopen.call_args_list[1][0][0].full_url, FALLBACK_OVERPASS_URL)
        self.assertEqual(mock_urlopen.call_args_list[2][0][0].full_url, ADDITIONAL_OVERPASS_URL)

    def test_provider_timeout_budget_within_limits(self):
        adapter = CoolSpotAdapter(timeout=3.0)
        budget = adapter.calculate_worst_case_budget(3)
        # Budget must comfortably fit within frontend 12s abort timeout
        self.assertLessEqual(budget, 9.5)
        self.assertLess(budget, 12.0)
        # Budget must fit within AWS API Gateway 29s integration timeout
        self.assertLess(budget, 29.0)

    @patch("urllib.request.urlopen")
    def test_invalid_provider_response_handling(self, mock_urlopen):
        # Provider returns malformed non-JSON
        mock_cm = MagicMock()
        mock_cm.read.return_value = b"<html><head><title>504 Gateway Time-out</title></head></html>"
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=2.0)
        with self.assertRaises(CoolSpotError) as ctx:
            adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=3.0)
        self.assertEqual(ctx.exception.status_code, 502)
        self.assertEqual(ctx.exception.error_code, "MALFORMED_RESPONSE")

    @patch("urllib.request.urlopen")
    def test_empty_results_handling(self, mock_urlopen):
        mock_data = {"elements": []}
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=3.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=2.0)
        self.assertEqual(spots, [])

    @patch("urllib.request.urlopen")
    def test_cache_hit_and_expiration(self, mock_urlopen):
        mock_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 4001,
                    "lat": 12.9716,
                    "lon": 77.5946,
                    "tags": {"name": "Cached Oasis", "leisure": "park"}
                }
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        svc = CoolSpotService()
        svc.cache.clear()

        # Call 1: Live fetch
        spots1 = svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(len(spots1), 1)
        self.assertEqual(spots1[0]["dataSourceStatus"], "osm_live")
        self.assertEqual(mock_urlopen.call_count, 1)

        # Call 2: Cache hit (mock_urlopen call_count should NOT increase)
        spots2 = svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(len(spots2), 1)
        self.assertEqual(spots2[0]["dataSourceStatus"], "osm_live_cached")
        self.assertIn("cacheAgeSeconds", spots2[0])
        self.assertIn("cachedAt", spots2[0])
        self.assertEqual(mock_urlopen.call_count, 1)

        # Expire cache manually
        key = svc.cache._make_key(12.9716, 77.5946, 5.0)
        old_time, old_data = svc.cache._cache[key]
        svc.cache._cache[key] = (old_time - 700, old_data)

        # Call 3: After expiration, fetches live again
        spots3 = svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertEqual(spots3[0]["dataSourceStatus"], "osm_live")

    @patch("coolspot_service.CoolSpotAdapter.fetch_nearby_coolspots")
    def test_lambda_handler_http_503_handling(self, mock_fetch):
        mock_fetch.side_effect = CoolSpotError(
            "Network error connecting to Overpass provider: The read operation timed out",
            status_code=504,
            error_code="NETWORK_TIMEOUT"
        )
        event = {
            "httpMethod": "GET",
            "path": "/api/coolspots",
            "queryStringParameters": {
                "lat": "12.9716",
                "lon": "77.5946",
                "radiusKm": "5.0"
            }
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 503)
        body = json.loads(res["body"])
        self.assertEqual(body["errorCode"], "COOLSPOT_PROVIDER_UNAVAILABLE")
        self.assertTrue(body["retryable"])
        self.assertIn("timed out", body["details"])

    @patch("urllib.request.urlopen")
    def test_accurate_opening_status_fields(self, mock_urlopen):
        mock_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 5001,
                    "lat": 12.9716,
                    "lon": 77.5946,
                    "tags": {
                        "name": "Always Open Kiosk",
                        "amenity": "drinking_water",
                        "opening_hours": "24/7"
                    }
                },
                {
                    "type": "node",
                    "id": 5002,
                    "lat": 12.9720,
                    "lon": 77.5950,
                    "tags": {
                        "name": "Scheduled Hall",
                        "amenity": "community_centre",
                        "opening_hours": "09:00-18:00"
                    }
                },
                {
                    "type": "node",
                    "id": 5003,
                    "lat": 12.9730,
                    "lon": 77.5960,
                    "tags": {
                        "name": "Unverified Garden",
                        "leisure": "garden"
                        # No opening_hours tag
                    }
                }
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=3.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        spot_map = {s["id"]: s for s in spots}

        # 24/7 location: openStatusVerified=True, isOpenNow=True
        self.assertTrue(spot_map["osm_node_5001"]["openStatusVerified"])
        self.assertTrue(spot_map["osm_node_5001"]["isOpenNow"])

        # Scheduled location: openStatusVerified=True, isOpenNow=False (not unverified true)
        self.assertTrue(spot_map["osm_node_5002"]["openStatusVerified"])
        self.assertFalse(spot_map["osm_node_5002"]["isOpenNow"])

        # Unverified location: openStatusVerified=False, isOpenNow=False
        self.assertFalse(spot_map["osm_node_5003"]["openStatusVerified"])
        self.assertFalse(spot_map["osm_node_5003"]["isOpenNow"])

    @patch("urllib.request.urlopen")
    def test_unverified_air_conditioning_information(self, mock_urlopen):
        mock_data = {
            "elements": [
                {
                    "type": "node",
                    "id": 6001,
                    "lat": 12.9716,
                    "lon": 77.5946,
                    "tags": {
                        "name": "Public Library Without AC",
                        "amenity": "library"
                        # No AC tag
                    }
                },
                {
                    "type": "node",
                    "id": 6002,
                    "lat": 12.9720,
                    "lon": 77.5950,
                    "tags": {
                        "name": "Verified AC Library",
                        "amenity": "library",
                        "air_conditioning": "yes"
                    }
                },
                {
                    "type": "node",
                    "id": 6003,
                    "lat": 12.9730,
                    "lon": 77.5960,
                    "tags": {
                        "name": "Designated Cooling Center",
                        "amenity": "cooling_centre"
                    }
                },
                {
                    "type": "node",
                    "id": 6004,
                    "lat": 12.9740,
                    "lon": 77.5970,
                    "tags": {
                        "name": "HVAC Mechanical Ventilation Hall",
                        "amenity": "community_centre",
                        "hvac": "yes"
                    }
                }
            ]
        }
        mock_cm = MagicMock()
        mock_cm.read.return_value = json.dumps(mock_data).encode("utf-8")
        mock_cm.__enter__.return_value = mock_cm
        mock_urlopen.return_value = mock_cm

        adapter = CoolSpotAdapter(timeout=3.0)
        spots = adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        spot_map = {s["id"]: s for s in spots}

        # Node without AC or HVAC tag must NOT claim Air Conditioned
        self.assertNotIn("Air Conditioned (Verified)", spot_map["osm_node_6001"]["amenities"])
        self.assertIn("Indoor Public Space", spot_map["osm_node_6001"]["amenities"])

        # Node with air_conditioning=yes must have Air Conditioned (Verified)
        self.assertIn("Air Conditioned (Verified)", spot_map["osm_node_6002"]["amenities"])

        # Designated cooling center must have Air Conditioned (Verified)
        self.assertIn("Air Conditioned (Verified)", spot_map["osm_node_6003"]["amenities"])

        # Node with hvac=yes alone must NOT claim Air Conditioned (Verified); must be Climate Controlled (HVAC)
        self.assertNotIn("Air Conditioned (Verified)", spot_map["osm_node_6004"]["amenities"])
        self.assertIn("Climate Controlled (HVAC)", spot_map["osm_node_6004"]["amenities"])

    @patch("coolspot_service.CoolSpotAdapter.fetch_nearby_coolspots")
    def test_stale_cache_fallback_after_ttl_expiry(self, mock_fetch):
        # Priority 1: Cache returns stale entries when live fetch fails after fresh TTL expires
        svc = CoolSpotService()
        svc.cache.clear()

        initial_spot = [
            {
                "id": "osm_node_7001",
                "name": "Resilient Oasis",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "distanceKm": 0.5,
                "amenities": ["Shade Coverage"],
                "isSampleData": False,
                "dataSourceStatus": "osm_live"
            }
        ]
        mock_fetch.return_value = initial_spot

        # 1. Successful fetch seeds the cache
        spots1 = svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(len(spots1), 1)
        self.assertEqual(spots1[0]["dataSourceStatus"], "osm_live")

        # 2. Advance time by 800 seconds (TTL=600s expired, but stale retention 3600s active)
        key = svc.cache._make_key(12.9716, 77.5946, 5.0)
        old_time, old_data = svc.cache._cache[key]
        svc.cache._cache[key] = (old_time - 800, old_data)

        # 3. Upstream provider fails with 504 timeout
        mock_fetch.side_effect = CoolSpotError("Overpass socket read timed out", status_code=504, error_code="NETWORK_TIMEOUT")

        # 4. Service must fall back to stale cache with isStaleCached=True and NOT raise
        spots2 = svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(len(spots2), 1)
        self.assertEqual(spots2[0]["name"], "Resilient Oasis")
        self.assertTrue(spots2[0]["isStaleCached"])
        self.assertEqual(spots2[0]["dataSourceStatus"], "osm_live_cached")
        self.assertGreaterEqual(spots2[0]["cacheAgeSeconds"], 800)

    @patch("coolspot_service.CoolSpotAdapter.fetch_nearby_coolspots")
    def test_stale_cache_expiry_after_max_stale_seconds(self, mock_fetch):
        # Priority 1: Stale cache strictly expires when age exceeds max_stale_seconds (3600s)
        svc = CoolSpotService()
        svc.cache.clear()

        initial_spot = [
            {
                "id": "osm_node_7002",
                "name": "Ancient Park",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "distanceKm": 0.5,
                "amenities": ["Shade Coverage"],
                "isSampleData": False
            }
        ]
        mock_fetch.return_value = initial_spot
        svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)

        # Advance time by 3700 seconds (exceeds max_stale_seconds=3600)
        key = svc.cache._make_key(12.9716, 77.5946, 5.0)
        old_time, old_data = svc.cache._cache[key]
        svc.cache._cache[key] = (old_time - 3700, old_data)

        # Upstream provider fails
        mock_fetch.side_effect = CoolSpotError("Provider down", status_code=503, error_code="PROVIDER_UNAVAILABLE")

        # Stale cache has expired, so service must raise CoolSpotError
        with self.assertRaises(CoolSpotError) as ctx:
            svc.get_nearby_coolspots(12.9716, 77.5946, radius_km=5.0)
        self.assertEqual(ctx.exception.status_code, 503)

    def test_cache_capacity_eviction(self):
        # Priority 1: Cache evicts oldest when capacity is reached
        cache = CoolSpotCache(ttl_seconds=600, max_stale_seconds=3600, max_size=3)
        cache.clear()

        # Add 3 entries
        cache.set(12.90, 77.50, 5.0, [{"id": "s1"}])
        cache.set(12.91, 77.51, 5.0, [{"id": "s2"}])
        cache.set(12.92, 77.52, 5.0, [{"id": "s3"}])
        self.assertEqual(len(cache._cache), 3)

        # Add 4th entry; capacity limit 3 must be preserved
        cache.set(12.93, 77.53, 5.0, [{"id": "s4"}])
        self.assertEqual(len(cache._cache), 3)

    def test_spatial_cache_safe_containment_and_recalculated_distance(self):
        # Priority 5: User within distance-aware safe containment reuses cache with distance recalculated
        cache = CoolSpotCache(ttl_seconds=600, max_stale_seconds=3600, max_size=100)
        cache.clear()

        mock_spots = [
            {
                "id": "osm_node_8001",
                "name": "Cubbon Canopy",
                "latitude": 12.9763,
                "longitude": 77.5929,
                "distanceKm": 0.5,
                "amenities": ["Shade Coverage"],
                "isSampleData": False
            }
        ]

        # Seed cache for center (12.9716, 77.5946) with 5.0 km radius
        cache.set(12.9716, 77.5946, 5.0, mock_spots)

        # Nearby user is at (12.9730, 77.5950), ~0.16 km away, requesting 3.0 km radius.
        # Containment holds: 0.16km + 3.0km = 3.16km <= 5.0km
        reused = cache.get(12.9730, 77.5950, radius_km=3.0)
        self.assertIsNotNone(reused)
        self.assertEqual(len(reused), 1)
        self.assertEqual(reused[0]["id"], "osm_node_8001")
        # Distance must be recalculated relative to the user's actual coordinate (12.9730, 77.5950)
        expected_dist = round(calculate_haversine_distance(12.9730, 77.5950, 12.9763, 77.5929), 1)
        self.assertEqual(reused[0]["distanceKm"], expected_dist)

    def test_spatial_cache_boundary_omission_prevention(self):
        # Priority 5: Request outside safe containment disc does NOT reuse incomplete cache
        cache = CoolSpotCache(ttl_seconds=600, max_stale_seconds=3600, max_size=100)
        cache.clear()

        mock_spots = [
            {
                "id": "osm_node_8002",
                "name": "Boundary Park",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "distanceKm": 0.5,
                "amenities": ["Shade Coverage"],
                "isSampleData": False
            }
        ]

        # Center A at (12.9716, 77.5946) with 2.0 km radius
        cache.set(12.9716, 77.5946, 2.0, mock_spots)

        # User B at (12.9900, 77.6100) is ~2.6 km away, requesting 2.0 km radius.
        # 2.6km + 2.0km = 4.6km > 2.0km (not contained). Must NOT return incomplete data!
        reused = cache.get(12.9900, 77.6100, radius_km=2.0)
        self.assertIsNone(reused)

    @patch("urllib.request.urlopen")
    def test_slow_response_deadline_enforcement(self, mock_urlopen):
        """Simulates a slow chunked response stream where reading chunks exceeds the total request deadline."""
        class SlowResponseStream:
            def __init__(self):
                self.calls = 0

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def read(self, chunk_size=65536):
                self.calls += 1
                if self.calls == 1:
                    return b" " * chunk_size
                import time
                time.sleep(0.05)
                return b" " * chunk_size

        adapter = CoolSpotAdapter(timeout=2.0, max_total_budget=0.03)
        mock_urlopen.return_value = SlowResponseStream()

        with self.assertRaises(CoolSpotError) as ctx:
            adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=2.0)

        self.assertIn(ctx.exception.status_code, (504, 503))
        self.assertEqual(ctx.exception.error_code, "NETWORK_TIMEOUT")

    @patch("urllib.request.urlopen")
    def test_total_deadline_aborts_subsequent_mirrors(self, mock_urlopen):
        """Verifies that if total execution deadline has expired, subsequent mirrors are aborted."""
        import time
        import urllib.error

        def slow_fail(*args, **kwargs):
            time.sleep(0.06)
            raise urllib.error.URLError(TimeoutError("First mirror timed out slowly"))

        mock_urlopen.side_effect = slow_fail

        adapter = CoolSpotAdapter(timeout=2.0, max_total_budget=0.04)

        with self.assertRaises(CoolSpotError) as ctx:
            adapter.fetch_nearby_coolspots(12.9716, 77.5946, radius_km=2.0)

        # Remaining budget <= 0.5s immediately aborted mirror 2 & 3
        self.assertEqual(mock_urlopen.call_count, 1)
        self.assertEqual(ctx.exception.status_code, 504)
        self.assertEqual(ctx.exception.error_code, "NETWORK_TIMEOUT")


if __name__ == "__main__":
    unittest.main()

