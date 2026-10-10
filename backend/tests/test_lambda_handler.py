import sys
import json
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lambda_handler import lambda_handler, route_api_request

class TestLambdaHandler(unittest.TestCase):
    def test_health_endpoint(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/health",
            "queryStringParameters": {}
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 200)

        body = json.loads(res["body"])
        self.assertEqual(body["status"], "healthy")
        self.assertIn("live_weather_configured", body)

    def test_cors_preflight_options(self):
        event = {
            "httpMethod": "OPTIONS",
            "path": "/api/weather",
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 200)
        self.assertIn("Access-Control-Allow-Origin", res["headers"])

    def test_missing_location_parameter(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/weather",
            "queryStringParameters": {}
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 400)

        body = json.loads(res["body"])
        self.assertEqual(body["errorCode"], "INVALID_INPUT")

    def test_demo_weather_request(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/weather",
            "queryStringParameters": {"location": "Bengaluru", "demo": "true"}
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 200)

        body = json.loads(res["body"])
        self.assertTrue(body["isDemo"])
        self.assertEqual(body["dataSourceStatus"], "demo_simulated")
        self.assertEqual(body["temperatureC"], 37.8)

    def test_post_risk_assessment_demo(self):
        event = {
            "httpMethod": "POST",
            "path": "/api/risk",
            "body": json.dumps({
                "location": "Cubbon Park",
                "activity": "walking",
                "plannedTime": "14:00",
                "durationMinutes": 45,
                "shadeAvailability": "partial_shade",
                "allowDemoFallback": True
            })
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 200)

        body = json.loads(res["body"])
        self.assertIn("score", body)
        self.assertIn("level", body)
        self.assertEqual(body["modelVersion"], "v1.1-noaa-nws")

    def test_404_not_found_endpoint(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/unknown",
        }
        res = lambda_handler(event, None)
        self.assertEqual(res["statusCode"], 404)

if __name__ == "__main__":
    unittest.main()
