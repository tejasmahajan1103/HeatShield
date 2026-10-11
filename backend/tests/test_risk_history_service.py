import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

from boto3.dynamodb.conditions import Key

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1])
)

import risk_history_service as history


class TestRiskHistoryService(unittest.TestCase):
    def setUp(self):
        self.table = MagicMock()
        self.dynamodb_patcher = patch(
            "risk_history_service.boto3.resource"
        )
        self.mock_resource = self.dynamodb_patcher.start()
        self.mock_resource.return_value.Table.return_value = self.table
        self.addCleanup(self.dynamodb_patcher.stop)

        self.payload = {
            "sessionId": "test-session_123",
            "assessment": {
                "location": "Pune",
                "activity": "Walking",
                "durationMinutes": 30,
                "score": 75,
                "level": "High",
                "temperatureC": 38.5,
                "humidity": 65,
                "isDemo": True,
                "unexpectedField": "must not be saved",
            },
        }

    def test_save_assessment_success(self):
        result = history.save_assessment(self.payload)

        self.assertTrue(result["saved"])
        self.assertTrue(result["assessmentId"])
        self.assertTrue(result["timestamp"])

        self.mock_resource.assert_called_once_with(
            "dynamodb"
        )
        self.mock_resource.return_value.Table.assert_called_once_with(
            history.TABLE_NAME
        )

        item = self.table.put_item.call_args.kwargs["Item"]
        self.assertEqual(item["sessionId"], "test-session_123")
        self.assertEqual(item["assessment"]["location"], "Pune")
        self.assertEqual(item["assessment"]["temperatureC"], Decimal("38.5"))
        self.assertNotIn("unexpectedField", item["assessment"])

    def test_save_rejects_invalid_session_id(self):
        payload = {
            **self.payload,
            "sessionId": "bad id",
        }

        with self.assertRaises(ValueError):
            history.save_assessment(payload)

        self.table.put_item.assert_not_called()

    def test_save_rejects_missing_assessment(self):
        payload = {"sessionId": "test-session_123"}

        with self.assertRaises(ValueError):
            history.save_assessment(payload)

        self.table.put_item.assert_not_called()

    def test_save_rejects_missing_score_or_level(self):
        payload = {
            "sessionId": "test-session_123",
            "assessment": {"score": 50},
        }

        with self.assertRaises(ValueError):
            history.save_assessment(payload)

        self.table.put_item.assert_not_called()

    def test_save_rejects_score_out_of_range(self):
        for score in (-1, 101):
            with self.subTest(score=score):
                payload = {
                    "sessionId": "test-session_123",
                    "assessment": {"score": score, "level": "High"},
                }

                with self.assertRaises(ValueError):
                    history.save_assessment(payload)

        self.table.put_item.assert_not_called()

    def test_save_rejects_boolean_score(self):
        payload = {
            "sessionId": "test-session_123",
            "assessment": {"score": True, "level": "High"},
        }

        with self.assertRaises(ValueError):
            history.save_assessment(payload)

        self.table.put_item.assert_not_called()

    def test_get_assessments_returns_items(self):
        expected_items = [
            {
                "sessionId": "test-session_123",
                "assessmentId": "assessment-1",
            }
        ]
        self.table.query.return_value = {"Items": expected_items}

        result = history.get_assessments("test-session_123")

        self.assertEqual(result, expected_items)
        query_args = self.table.query.call_args.kwargs
        self.assertEqual(query_args["Limit"], 20)
        self.assertFalse(query_args["ScanIndexForward"])
        self.assertEqual(
            query_args["KeyConditionExpression"],
            Key("sessionId").eq("test-session_123"),
        )

    def test_get_assessments_caps_limit_at_20(self):
        self.table.query.return_value = {"Items": []}

        history.get_assessments("test-session_123", limit=100)

        self.assertEqual(
            self.table.query.call_args.kwargs["Limit"], 20
        )

    def test_get_assessments_enforces_minimum_limit(self):
        self.table.query.return_value = {"Items": []}

        history.get_assessments("test-session_123", limit=0)

        self.assertEqual(
            self.table.query.call_args.kwargs["Limit"], 1
        )

    def test_get_assessments_rejects_invalid_session(self):
        with self.assertRaises(ValueError):
            history.get_assessments("bad session")

        self.table.query.assert_not_called()


if __name__ == "__main__":
    unittest.main()