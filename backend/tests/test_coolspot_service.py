import sys
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from coolspot_adapter import CoolSpotAdapter, CoolSpotError, is_valid_coordinate, calculate_haversine_distance
from coolspot_service import CoolSpotService
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

if __name__ == "__main__":
    unittest.main()
