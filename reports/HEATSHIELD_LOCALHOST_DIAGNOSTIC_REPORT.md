# HeatShield Localhost Diagnostic Audit Report

**Date & Time:** October 30, 2026 — 23:50 IST  
**Audit Target:** Local Application Environment (`http://localhost:5173`)  
**Target Page Under Audit:** `http://localhost:5173/app/coolspots`  
**Auditor:** Automated Engineering Subsystem (Antigravity)  
**Status:** Completed  

---

## 1. Executive Summary

A comprehensive, localhost-first diagnostic audit was performed on the local HeatShield application running at `http://localhost:5173`. The audit covered the full extracted codebase, environment configurations, local browser execution, network traffic, frontend and backend test suites, and all application pages.

### Key Audit Findings:
1. **Frontend Host & Dev Server:** The local Vite dev server is running properly on `http://localhost:5173` with zero compilation errors.
2. **Backend Architecture & Communication Target:**
   - The local frontend does **NOT** communicate with a local backend server (`http://127.0.0.1:8000` is inactive / not started).
   - `.env.local` configures `VITE_API_BASE_URL=https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod`.
   - The local frontend communicates directly with the **deployed AWS API Gateway** backend in AWS region `ap-south-1`.
3. **CoolSpots Failure Root Cause:**
   - When coordinate-based discovery is triggered (via user geolocation, "Use My Location", or selecting "Near Destination"), the local frontend sends a `GET` request to:  
     `https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots?lat=...&lon=...&radiusKm=5`
   - The remote AWS API Gateway and Lambda invoke public OpenStreetMap Overpass API instances (`https://overpass-api.de/api/interpreter` and `https://overpass.private.coffee/api/interpreter`).
   - Both upstream Overpass endpoints exceed the 8.0-second socket timeout (`"Network error connecting to Overpass provider: The read operation timed out"`).
   - The AWS Lambda backend catches this timeout and returns an **HTTP 503 Service Unavailable** with error code `COOLSPOT_PROVIDER_UNAVAILABLE`.
   - The local frontend properly catches this 503 response, attempts an exponential-backoff retry, and on repeated failure renders the user-facing error message: `"CoolSpot API Discovery Failed (HTTP_503). Please click Retry."`.
4. **CORS Evaluation:** CORS is **NOT** failing. Both the `OPTIONS` preflight and the `GET` response return explicit headers `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Methods: GET, POST, OPTIONS`.
5. **Other Pages Status:** All other local application pages (**Dashboard**, **Heat Risk**, **Recommendations**, **Risk History**, **Settings**, and **AWS Architecture Modal**) function properly on localhost.
6. **Test Suites:**
   - **Frontend Vitest:** **49/49 passed** (8 test suites).
   - **Backend Pytest:** **52/52 passed** (7 test suites).

---

## 2. Local Environment & Target Identification

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Local Frontend URL** | `http://localhost:5173` | Active Vite v8.3 dev server |
| **Local Port 5173** | Active / Listening | Tested via TCP connection |
| **Local Port 8000** | Inactive (`TcpTestSucceeded: False`) | Python `backend/server.py` not started |
| **Configuration File** | `.env.local` | Contains: `VITE_API_BASE_URL=https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod` |
| **Active Backend Target** | **Deployed AWS API Gateway** | `https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod` |

### Code Verification in `src/services/coolSpotService.ts`

Lines 240–255 define how the target endpoint is resolved:
```typescript
private getApiUrlsToTry(): string[] {
  const customBase = (import.meta.env?.VITE_API_BASE_URL as string) || (import.meta.env?.VITE_WEATHER_API_URL as string);
  if (customBase) {
    const cleanBase = customBase.replace(/\/+$/, '');
    if (cleanBase.endsWith('/api/coolspots')) {
      return [cleanBase];
    }
    const fullUrl = cleanBase.endsWith('/api') ? `${cleanBase}/coolspots` : `${cleanBase}/api/coolspots`;
    return [fullUrl];
  }
  const defaultProdEndpoint = 'https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots';
  if (import.meta.env?.DEV) {
    return [defaultProdEndpoint, 'http://127.0.0.1:8000/api/coolspots'];
  }
  return [defaultProdEndpoint];
}
```
Because `VITE_API_BASE_URL` is set in `.env.local`, `customBase` evaluates to truthy and immediately returns `https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots`. The local fallback URL `http://127.0.0.1:8000/api/coolspots` is not queried.

---

## 3. CoolSpots Failure Reproduction & Inspection

### 3.1 Step-by-Step Reproduction on Localhost

1. Navigated to `http://localhost:5173/app/coolspots`.
2. Initial State: Without user coordinates, the page displays Bengaluru sample cooling spots with the badge `Sample Data`.
3. Trigger Action:
   - User coordinates detected via GPS / "Use My Location", or
   - User sets a destination in Heat Risk (e.g., *Cubbon Park*, *Vidhana Soudha*) and selects the **Near Destination** or **Along Journey Route** search filter on the CoolSpots page.
4. The service switches from static sample fallback to live discovery: `fetchFromApi(lat, lon, radiusKm)`.
5. Network call initiates to the remote AWS API Gateway endpoint.
6. The request hangs for ~20–28 seconds while upstream Overpass queries run in Lambda.
7. The server responds with **HTTP 503**.
8. The frontend initiates backoff retry (Attempt 1/1) after ~1000–2500ms.
9. Second attempt also returns **HTTP 503**.
10. The UI catches `Error: CoolSpot API Discovery Failed (HTTP_503). Please click Retry.` and displays the error state banner.

### 3.2 Exact API Network Request Generated

```http
GET /prod/api/coolspots?lat=28.6139&lon=77.2090&radiusKm=5 HTTP/1.1
Host: ywxmdsz1re.execute-api.ap-south-1.amazonaws.com
User-Agent: Mozilla/5.0 ...
Accept: application/json
Origin: http://localhost:5173
Referer: http://localhost:5173/app/coolspots
```

### 3.3 Actual Network Response Details

```http
HTTP/1.1 503 Service Unavailable
Date: Fri, 30 Oct 2026 16:41:25 GMT
Content-Type: application/json
Content-Length: 221
Connection: keep-alive
x-amzn-RequestId: 8ee90f5b-76ee-4426-bf3f-f576d9c74ec0
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
x-amz-apigw-id: GERJrFMHBcwEZwQ=
Access-Control-Allow-Methods: GET, POST, OPTIONS
X-Amzn-Trace-Id: Root=1-6ae4c8a3-566aa3f828329e334454fbdb;Parent=0e0e2b1422c03ce2;Sampled=0;Lineage=1:1b511ffd:0

{
  "error": "Nearby cooling locations are temporarily unavailable.",
  "errorCode": "COOLSPOT_PROVIDER_UNAVAILABLE",
  "retryable": true,
  "details": "Network error connecting to Overpass provider: The read operation timed out"
}
```

### 3.4 CORS Inspection Results

Preflight `OPTIONS` request:
```http
OPTIONS /prod/api/coolspots HTTP/1.1
Host: ywxmdsz1re.execute-api.ap-south-1.amazonaws.com
Origin: http://localhost:5173
Access-Control-Request-Method: GET
```
Response:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token
Access-Control-Allow-Methods: GET,POST,OPTIONS
```
**Conclusion on CORS:** CORS preflight and actual responses are fully allowed for `http://localhost:5173`. No CORS errors are reported by the browser engine.

### 3.5 Browser Console Logs

```text
[CoolSpot API Diagnostic] HTTP 503 (HTTP_503) error from https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots (Duration: 27954ms)
[CoolSpot API Diagnostic] Retrying https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots [HTTP_503] in 1678ms (Attempt 1/1)...
[CoolSpot API Diagnostic] HTTP 503 (HTTP_503) error from https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/coolspots (Duration: 26140ms)
CoolSpot discovery failed: Error: CoolSpot API Discovery Failed (HTTP_503). Please click Retry.
```

---

## 4. Root Cause Tracing & Failure Origin Attribution

To establish whether the failure originates in local code, configuration, CORS, API Gateway, Lambda, or Overpass, each component was analyzed:

| Layer | Assessment | Evidence / Trace |
| :--- | :--- | :--- |
| **1. Local Frontend Code** | **Pass (Healthy)** | `src/services/coolSpotService.ts` correctly validates coordinates, adds query parameters, handles AbortController timeouts, parses response arrays, retries on 503, and renders error states with retry actions. |
| **2. Local Environment Config** | **Pass (Healthy)** | `.env.local` accurately points to the active API Gateway deployment. |
| **3. Browser CORS Policy** | **Pass (Healthy)** | Both preflight `OPTIONS` and response headers return `Access-Control-Allow-Origin: *`. No CORS rejection in browser. |
| **4. AWS API Gateway** | **Pass (Healthy)** | Routes incoming `/api/coolspots` to Lambda, preserves query strings, and proxies responses back without transformation errors. |
| **5. AWS Lambda Execution** | **Pass (Healthy)** | `lambda_handler.py` executes `coolspot_svc.get_nearby_coolspots()`. When an upstream error occurs, it catches `CoolSpotError` and safely returns an HTTP 503 JSON response. |
| **6. Upstream Overpass Provider** | **FAIL (ROOT CAUSE)** | In `backend/coolspot_adapter.py`: Calls `https://overpass-api.de/api/interpreter` and `https://overpass.private.coffee/api/interpreter`. The query runs a heavy 7-amenity union across a 5000m radius (`out center`). The public Overpass servers are heavily loaded and time out (`The read operation timed out`), returning no data within the socket timeout. |

### Upstream Query Analysis

The Overpass query executed by the backend adapter (`backend/coolspot_adapter.py:97-112`):
```text
[out:json][timeout:4];
(
  node["leisure"="park"](around:5000,12.9716,77.5946);
  way["leisure"="park"](around:5000,12.9716,77.5946);
  node["leisure"="garden"](around:5000,12.9716,77.5946);
  way["leisure"="garden"](around:5000,12.9716,77.5946);
  node["amenity"="library"](around:5000,12.9716,77.5946);
  way["amenity"="library"](around:5000,12.9716,77.5946);
  node["amenity"="community_centre"](around:5000,12.9716,77.5946);
  way["amenity"="community_centre"](around:5000,12.9716,77.5946);
  node["amenity"="drinking_water"](around:5000,12.9716,77.5946);
  node["amenity"="cooling_centre"](around:5000,12.9716,77.5946);
  node["amenity"="place_of_worship"](around:5000,12.9716,77.5946);
  way["amenity"="place_of_worship"](around:5000,12.9716,77.5946);
);
out center 60;
```
When submitted to free public Overpass endpoints, this query frequently queues or gets throttled. When the timeout expires in Python's `urllib.request.urlopen`, it raises `URLError(TimeoutError('The read operation timed out'))`, causing the Lambda to return HTTP 503.

---

## 5. Test Suite Execution Results

### 5.1 Frontend Tests (Vitest)

Command: `npm run test` (`vitest run`)  
Results: **8 test files passed (100%), 49 tests passed (100%)**

```
 ✓ src/services/__tests__/historyAndSettings.test.ts (1 test)
 ✓ src/services/__tests__/settingsNavigation.test.tsx (3 tests)
 ✓ src/services/__tests__/apiConfig.test.ts (4 tests)
 ✓ src/services/__tests__/userLocationIntegration.test.ts (4 tests)
 ✓ src/services/__tests__/recommendationService.test.ts (2 tests)
 ✓ src/services/__tests__/coolSpotService.test.ts (14 tests)
 ✓ src/services/__tests__/heatRiskService.test.ts (11 tests)
 ✓ src/services/__tests__/destinationAndRouting.test.ts (10 tests)

 Test Files  8 passed (8)
      Tests  49 passed (49)
   Duration  3.65s
```

All 14 tests in `coolSpotService.test.ts` pass, verifying:
- Coordinate validation and bounding.
- Haversine distance computations.
- Handling of HTTP 500, HTTP 429, and HTML error responses.
- In-memory caching and cache invalidation.
- Response normalization for arrays and wrapped object payloads.

### 5.2 Backend Tests (Pytest)

Command: `python -m pytest -v backend/tests`  
Results: **52 tests passed (100%), 0 failed**

```
backend/tests/test_coolspot_service.py: 7 PASSED
backend/tests/test_heat_risk_engine.py: 9 PASSED
backend/tests/test_lambda_handler.py: 11 PASSED
backend/tests/test_lambda_packaging.py: 1 PASSED
backend/tests/test_openweather_adapter.py: 9 PASSED
backend/tests/test_risk_history_service.py: 9 PASSED
backend/tests/test_weather_service.py: 6 PASSED

============================= 52 passed in 0.90s =============================
```

---

## 6. Audit of All Localhost Application Pages

All pages were tested in the local browser running against `http://localhost:5173`.

### 6.1 Dashboard (`/app`)
- **Status:** PASS
- **Visuals & UX:** Renders cleanly with "Heat & Safety Monitor", "Personal Heat Risk Assessment", and "Understand Your Heat Risk" modules.
- **Interactions:** "Check My Heat Risk" navigates directly to `/app/heat-risk`.
- **Console Errors:** None.

### 6.2 Heat Risk Page (`/app/heat-risk`)
- **Status:** PASS
- **Form Controls:** Location text input, GPS status indicator ("Use My GPS" / "Refresh GPS"), Destination search input with geocoding debounce, activity picker (Walking, Running, Cycling, Outdoor Work, etc.), planned departure time, duration slider (15–180 min), and shade selector.
- **Geocoding & Destination Selection:** Typing "Cubbon Park" or "Vidhana Soudha" queries OpenStreetMap Nominatim / internal fallback landmarks and populates the selection dropdown.
- **Calculation Execution:** Clicking "Calculate Heat Risk" invokes `heatRiskService.calculateRisk()`.
- **Results Rendered:** Displays deterministic numerical score (0–100), NOAA risk tier badge (Low/Moderate/High/Extreme), NOAA Heat Index values (°C and °F), contributing factors breakdown (Metabolic Exertion, Solar Exposure, Duration Load, Heat Index), journey route polyline summary, and action items.
- **Console Errors:** None.

### 6.3 Recommendations Page (`/app/recommendations`)
- **Status:** PASS
- **Dynamic Guidance:** Generates categorized action cards (Hydration, Clothing & Sun Protection, Activity Pacing, Emergency Signs) dynamically tuned to the user's latest computed risk score.
- **CoolSpot Fallback Integration:** When CoolSpot live discovery is unavailable, the recommendations page displays fallback hydration advice without crashing.
- **Console Errors:** None.

### 6.4 CoolSpots Page (`/app/coolspots`)
- **Status:** MIXED (Functional UI & Fallback / Remote Live Overpass Failure)
- **Sample Mode (Initial Load):** Displays 5 sample Bengaluru cooling spots (Cubbon Park, State Central Library AC Hall, Lalbagh Grove, KSR Metro Cooling Zone, MG Road Water Kiosk) with category filters, radius sliders, and interactive Leaflet map.
- **Live Mode (User Location / Destination Search):** Calls remote API Gateway endpoint -> receives HTTP 503 due to upstream Overpass timeout -> renders alert banner with retry button as designed.
- **Console Errors:** Captured expected diagnostic logs: `[CoolSpot API Diagnostic] HTTP 503 (HTTP_503)` and `CoolSpot discovery failed: Error: CoolSpot API Discovery Failed (HTTP_503). Please click Retry.`.

### 6.5 Risk History Page (`/app/risk-history`)
- **Status:** PASS
- **Data Persistence:** Automatically records assessments calculated in the Heat Risk engine to local storage.
- **UI Render:** Displays assessment cards with timestamp, location, destination, activity, calculated risk score, and risk tier badges. Supports clearing history.
- **Console Errors:** None.

### 6.6 Settings Page (`/app/settings`)
- **Status:** PASS
- **Controls Tested:**
  - Temperature Units: Celsius (°C) / Fahrenheit (°F) toggle.
  - Distance Units: Kilometers (km) / Miles (mi) toggle.
  - Push notification alerts toggle.
  - Sensitivity profile selection (Standard, Children/Elderly, Outdoor Worker, Athlete).
- **Save Action:** Saves settings into `localStorage`, displays green success confirmation message.
- **Console Errors:** None.

### 6.7 AWS Architecture Modal
- **Status:** PASS
- **Trigger:** Accessible via the "AWS Architecture" button in the sidebar or top navigation.
- **Modal Display:** Displays system architectural diagram showing:
  - AWS Amplify Hosting (Static React assets).
  - Amazon API Gateway (REST API routing).
  - AWS Lambda (Python serverless compute).
  - Amazon DynamoDB (Risk history persistence).
  - External Integrations (OpenWeather API v2.5 and OpenStreetMap Overpass).
  - Optional Amazon Bedrock generative insights.
- **Modal Controls:** Modal backdrop and close ("✕") button operate smoothly.
- **Console Errors:** None.

---

## 7. Remote API Gateway Endpoints Connectivity Matrix

The deployed AWS API Gateway backend was directly probed to assess the health of all endpoints consumed by the local application:

| Endpoint | Method | Status | Duration | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | **200 OK** | 120ms | `{"status": "healthy", "service": "HeatShield Backend API", "live_weather_configured": true}` |
| `/api/weather` | `GET` | **200 OK** | 380ms | Returns live weather for coordinates (temperature, humidity, condition) |
| `/api/forecast` | `GET` | **200 OK** | 410ms | Returns 8-point 24h weather forecast data |
| `/api/coolspots` (OPTIONS) | `OPTIONS` | **200 OK** | 80ms | Valid CORS preflight: `Access-Control-Allow-Origin: *` |
| `/api/coolspots` (Live) | `GET` | **503 Service Unavailable** | 27,954ms | `{"errorCode": "COOLSPOT_PROVIDER_UNAVAILABLE", "details": "The read operation timed out"}` |
| `/api/risk` | `POST` | **200 OK / 400 Validation** | 350ms | Accepts JSON payload and computes risk |

---

## 8. Summary of Findings & Non-Invasive Recommendations

### Finding 1: Local Application Code Integrity
The local frontend codebase is robust, fully typed, well-structured, and passes 100% of unit and integration tests (49/49 Vitest tests). The UI components correctly handle loading, success, and error states.

### Finding 2: Root Cause of CoolSpots Failure
The CoolSpots error on localhost is **not a local frontend bug**, **not a Vite build issue**, and **not a CORS failure**. It is caused by upstream timeouts from the public OpenStreetMap Overpass API servers when called by the deployed AWS Lambda function.

### Non-Invasive Recommendations for Future Consideration (No Changes Applied):
1. **Frontend Graceful Fallback on 503:** In `src/services/coolSpotService.ts`, when `fetchFromApi` returns a 503 / `COOLSPOT_PROVIDER_UNAVAILABLE`, rather than throwing an error that blocks the list, the service could return the local sample coolspots recalculated from the user's coordinates while displaying an informational toast ("Live cooling spots temporarily unreachable; showing verified landmark sanctuaries").
2. **Backend Overpass Optimization:** In `backend/coolspot_adapter.py`, simplify the query by reducing the search radius (e.g., from 5km to 2km in dense urban areas) and splitting the 7 amenity clauses into two smaller batches or querying pre-filtered tags.
3. **Overpass Server Selection:** Configure alternative reliable Overpass mirrors or self-hosted Overpass endpoints via Lambda environment variables (`OVERPASS_API_URL`).
4. **Caching Layer:** Cache Overpass geographic responses in DynamoDB or ElastiCache with a 24-hour TTL, since physical parks, water stations, and temples rarely move.
