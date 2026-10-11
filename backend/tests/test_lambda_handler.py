
import sys
import json
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

from lambda_handler import lambda_handler


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
            "queryStringParameters": {
                "location": "Bengaluru",
                "demo": "true"
            }
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 200)
        body = json.loads(res["body"])
        self.assertTrue(body["isDemo"])
        self.assertEqual(body["dataSourceStatus"], "demo_simulated")
        self.assertGreater(body["temperatureC"], 20.0)

    def test_forecast_endpoint_demo(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/forecast",
            "queryStringParameters": {
                "lat": "12.9716",
                "lon": "77.5946",
                "demo": "true"
            }
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 200)
        body = json.loads(res["body"])
        self.assertIsInstance(body, list)
        self.assertGreater(len(body), 0)

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

    @patch("lambda_handler.save_assessment")
    def test_post_risk_history_success(self, mock_save):
        mock_save.return_value = {
            "saved": True,
            "assessmentId": "test-assessment-id",
            "timestamp": "2026-10-11T10:00:00+00:00",
        }

        event = {
            "httpMethod": "POST",
            "path": "/api/risk-history",
            "body": json.dumps({
                "sessionId": "test-session_123",
                "assessment": {
                    "score": 75,
                    "level": "High",
                },
            }),
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 201)
        body = json.loads(res["body"])
        self.assertTrue(body["saved"])
        mock_save.assert_called_once()

    @patch("lambda_handler.get_assessments")
    def test_get_risk_history_success(self, mock_get):
        mock_get.return_value = [
            {
                "sessionId": "test-session_123",
                "assessmentKey": "2026-10-11T10:00:00+00:00#test",
                "assessmentId": "test-assessment-id",
                "timestamp": "2026-10-11T10:00:00+00:00",
                "assessment": {
                    "score": 75,
                    "level": "High",
                },
            }
        ]

        event = {
            "httpMethod": "GET",
            "path": "/api/risk-history",
            "queryStringParameters": {
                "sessionId": "test-session_123",
            },
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 200)
        body = json.loads(res["body"])
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["items"][0]["assessment"]["score"], 75)
        mock_get.assert_called_once_with(
            "test-session_123",
            limit=20
        )

    @patch("lambda_handler.save_assessment")
    def test_post_risk_history_invalid_input(self, mock_save):
        mock_save.side_effect = ValueError("Invalid assessment")

        event = {
            "httpMethod": "POST",
            "path": "/api/risk-history",
            "body": json.dumps({
                "sessionId": "invalid",
                "assessment": {},
            }),
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 400)
        mock_save.assert_called_once()

    @patch("lambda_handler.get_assessments")
    def test_get_risk_history_missing_session_id(self, mock_get):
        event = {
            "httpMethod": "GET",
            "path": "/api/risk-history",
            "queryStringParameters": {},
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 400)
        mock_get.assert_not_called()

    def test_404_not_found_endpoint(self):
        event = {
            "httpMethod": "GET",
            "path": "/api/unknown",
        }
        res = lambda_handler(event, None)

        self.assertEqual(res["statusCode"], 404)


if __name__ == "__main__":
    unittest.main()
