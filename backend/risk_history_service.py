import os
import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List

import boto3
from boto3.dynamodb.conditions import Key


TABLE_NAME = os.environ.get("RISK_HISTORY_TABLE", "HeatShield-RiskHistory")


SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,100}$")

ALLOWED_ASSESSMENT_FIELDS = {
    "location",
    "activity",
    "durationMinutes",
    "score",
    "level",
    "heatIndexC",
    "heatIndexF",
    "temperatureC",
    "humidity",
    "isDemo",
    "dataSourceStatus",
    "calculatedAt",
    "modelVersion",
}


class RiskHistoryError(Exception):
    pass


def _validate_session_id(session_id: Any) -> str:
    if not isinstance(session_id, str):
        raise ValueError("sessionId must be a string.")

    if not SESSION_ID_PATTERN.fullmatch(session_id):
        raise ValueError(
            "sessionId must contain 8-100 letters, numbers, underscores, or hyphens."
        )

    return session_id


def _to_dynamodb_safe(value: Any) -> Any:
    """Convert floating-point values into DynamoDB-compatible decimals."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {str(k): _to_dynamodb_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_dynamodb_safe(v) for v in value]
    return value


def save_assessment(payload: Dict[str, Any]) -> Dict[str, Any]:
    session_id = _validate_session_id(payload.get("sessionId"))
    assessment = payload.get("assessment")

    if not isinstance(assessment, dict):
        raise ValueError("assessment must be a JSON object.")

    if "score" not in assessment or "level" not in assessment:
        raise ValueError("assessment must contain score and level.")

    score = assessment["score"]
    if isinstance(score, bool) or not isinstance(score, (int, float)):
        raise ValueError("score must be a number.")
    if not 0 <= score <= 100:
        raise ValueError("score must be between 0 and 100.")

    level = assessment["level"]
    if not isinstance(level, str) or len(level) > 40:
        raise ValueError("level must be a string of at most 40 characters.")

    timestamp = datetime.now(timezone.utc).isoformat()
    assessment_id = str(uuid.uuid4())

    safe_assessment = {
        key: value
        for key, value in assessment.items()
        if key in ALLOWED_ASSESSMENT_FIELDS
    }

    item = {
        "sessionId": session_id,
        "assessmentKey": f"{timestamp}#{assessment_id}",
        "assessmentId": assessment_id,
        "timestamp": timestamp,
        "assessment": _to_dynamodb_safe(safe_assessment),
    }
    table = boto3.resource("dynamodb").Table(TABLE_NAME)

    table.put_item(Item=item)

    return {
        "saved": True,
        "assessmentId": assessment_id,
        "timestamp": timestamp,
    }


def get_assessments(session_id: Any, limit: int = 20) -> List[Dict[str, Any]]:
    session_id = _validate_session_id(session_id)

    table = boto3.resource("dynamodb").Table(TABLE_NAME)

    response = table.query(
        KeyConditionExpression=Key("sessionId").eq(session_id),
        ScanIndexForward=False,
        Limit=max(1, min(int(limit), 20)),
    )

    return response.get("Items", [])
