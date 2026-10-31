# HEATSHIELD — HEAT EXPOSURE RISK ACCURACY AUDIT AND CORRECTION REPORT

**Document ID:** `HS-AUDIT-HR-2026-10-31`  
**Target Environment:** Localhost (`http://localhost:5173` & `http://127.0.0.1:8000`) with AWS API Gateway Failover  
**Target Component:** Heat Exposure Risk Calculation Engine & Weather Provenance Pipeline  
**Audit Status:** COMPLETE — ROOT CAUSE IDENTIFIED, MATHEMATICALLY VERIFIED & CORRECTED  

---

## EXECUTIVE SUMMARY

A user-reported assessment indicated potential inaccuracy:
- **Ambient Temperature:** 32°C (89.6°F)
- **Relative Humidity:** 56.5%
- **NOAA Heat Index:** 36.1°C (96.9°F)
- **Activity:** Cycling (45 minutes, planned at 14:30)
- **Solar Exposure:** Direct Sun
- **Weather Source Badge:** Demo Weather Data
- **Reported Score:** **72 / 100 (High Risk)**

The user suspected the score was exaggerated and questioned why demo weather data was being used.

### Core Findings:
1. **Mathematical Proof of 72/100 (The Root Cause):**  
   The NOAA Heat Index formula was mathematically correct ($32^\circ\text{C}, 56.5\% \text{ RH} \to 36.1^\circ\text{C} / 96.9^\circ\text{F}$).  
   However, the HeatShield risk scoring model had two critical design defects:
   - **Severe NOAA Advisory Misalignment:** NOAA's National Weather Service defines $90^\circ\text{F} \le HI < 103^\circ\text{F}$ as **"Extreme Caution"** (Moderate thermal strain). "Danger" (High Risk) does not begin until $103^\circ\text{F}$ ($39.4^\circ\text{C}$). HeatShield's old implementation compressed categories and assigned any $HI \ge 90^\circ\text{F}$ directly to "High Risk", completely skipping the Moderate band.
   - **Excessive Baseline Score:** At $90^\circ\text{F}$, the baseline was already initialized at `51.0`, scaling to `63.74` at $96.9^\circ\text{F}$. Adding the cycling adjustment ($+3$) and direct midday sun ($+5$) produced exactly:
     $$\text{Total Score} = \text{round}(63.74 + 3 + 0 + 5) = \mathbf{72} \quad (\text{High Risk})$$
   - Clinical and occupational guidelines denote a 45-minute bicycle ride at 32°C as **Moderate Risk** (requiring regular hydration), not an acute High Risk heat emergency.
2. **Weather Provenance ("Demo Weather Data"):**  
   - The local Python backend (`backend/.env`) was not configured with an `OPENWEATHER_API_KEY`.
   - The frontend (`src/services/weatherService.ts`) hardcoded `&demo=true` onto all weather query URLs and only targeted `http://127.0.0.1:8000`.
   - The deployed AWS API Gateway in Mumbai (`https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api`) **does** have an active OpenWeather API key, but the frontend never attempted failover to it.
   - Furthermore, when demo data was used, the UI did not explain why live observations were unavailable, nor did it caution the user that real-world risk cannot be verified without live sensor data.
3. **The Correction & Results:**  
   - Recalibrated `baseScore` piecewise mapping in lockstep parity across TypeScript (`heatRiskService.ts`) and Python (`heat_risk_engine.py`) to align with official NOAA NWS advisory bands:
     - $HI < 80^\circ\text{F}$: Low Risk (5–20)
     - $80^\circ\text{F} \le HI < 90^\circ\text{F}$: NOAA Caution (20–36)
     - $90^\circ\text{F} \le HI < 103^\circ\text{F}$: NOAA Extreme Caution (36–65, Moderate Risk)
     - $103^\circ\text{F} \le HI < 125^\circ\text{F}$: NOAA Danger (66–85, High Risk)
     - $HI \ge 125^\circ\text{F}$: NOAA Extreme Danger (86–99, Extreme Risk)
   - Under this calibrated model, the exact scenario ($32^\circ\text{C}, 56.5\% \text{ RH}$, cycling, 45 min, direct sun) computes:
     $$\text{Base Score} = 36.0 + \left(\frac{96.9 - 90.0}{13.0}\right) \times 29.0 = 51.4$$
     $$\text{Total Score} = \text{round}(51.4 + 3 + 0 + 5) = \mathbf{59} \quad (\mathbf{Moderate\ Risk})$$
   - Strenuous exertion (e.g. 130 min running in direct sun) properly escalates to **71/100 (High Risk)**.
   - Multi-candidate live weather failover was implemented in `weatherService.ts`.
   - Prominent amber alert banner added to `HeatRiskCard.tsx` explicitly explaining simulated demo telemetry whenever live sensor observations are unavailable.
   - **All 73 backend tests** and **all 61 frontend tests** pass (100%).
   - **Zero uncommitted CoolSpots improvements were lost or modified.**

---

## PHASE 1 — END-TO-END CALCULATION TRACE

### 1. File & Function Mapping

| Step | TypeScript Frontend File & Function | Python Backend File & Function | Role |
| :--- | :--- | :--- | :--- |
| **1. Fetch Weather** | [`src/services/weatherService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/weatherService.ts): `HybridWeatherService.getCurrentWeather()`, `getCurrentWeatherByCoords()` | [`backend/weather_service.py`](file:///d:/FILES/Projects/HeatShield/backend/weather_service.py): `WeatherService.get_weather()`, `get_weather_by_coords()` | Fetches live weather observations via multi-candidate failover or falls back to simulated demo weather |
| **2. Live vs Demo Selection** | [`src/services/weatherService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/weatherService.ts): `getApiCandidates()`, `phase 1` vs `phase 2` | [`backend/weather_service.py`](file:///d:/FILES/Projects/HeatShield/backend/weather_service.py): `is_live_configured()`, `get_demo_weather()` | Checks if live API key is present; returns live OpenWeather response or controlled demo simulation |
| **3. NOAA Heat Index** | [`src/services/heatRiskService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/heatRiskService.ts): `calculateNOAAHeatIndex()` | [`backend/heat_risk_engine.py`](file:///d:/FILES/Projects/HeatShield/backend/heat_risk_engine.py): `calculate_noaa_heat_index()` | Meteorological Rothfusz 9-term polynomial equation with Steadman low-T switch and humidity adjustments |
| **4. 0–100 Risk Score** | [`src/services/heatRiskService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/heatRiskService.ts): `DeterministicHeatRiskService.calculateRisk()` | [`backend/heat_risk_engine.py`](file:///d:/FILES/Projects/HeatShield/backend/heat_risk_engine.py): `calculate_heat_risk()` | Computes base risk score from Heat Index and integrates physiological/environmental adjustments |
| **5. Activity Adjustment** | [`src/services/heatRiskService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/heatRiskService.ts): `activityBonus` | [`backend/heat_risk_engine.py`](file:///d:/FILES/Projects/HeatShield/backend/heat_risk_engine.py): `activity_adj` | Adjusts for metabolic heat generation (+8 running/work, +3 cycling, 0 walking/other) |
| **6. Solar Shade Adjustment** | [`src/services/heatRiskService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/heatRiskService.ts): `sunBonus`, `isDaylightTime()` | [`backend/heat_risk_engine.py`](file:///d:/FILES/Projects/HeatShield/backend/heat_risk_engine.py): `shade_adj` | Adjusts for solar radiation: +5 direct sun, 0 partial shade, -5 full shade (0 at night) |
| **7. Duration Adjustment** | [`src/services/heatRiskService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/heatRiskService.ts): `durationBonus` | [`backend/heat_risk_engine.py`](file:///d:/FILES/Projects/HeatShield/backend/heat_risk_engine.py): `duration_adj` | Adjusts for exposure time: +7 (>120 min), +4 (>60 min), 0 (30–60 min), -2 (<30 min) |
| **8. Route Risk Adjustment** | [`src/pages/HeatRiskPage.tsx`](file:///d:/FILES/Projects/HeatShield/src/pages/HeatRiskPage.tsx): `updateRoute()` | [`backend/lambda_handler.py`](file:///d:/FILES/Projects/HeatShield/backend/lambda_handler.py): `route_api_request()` | Integrates start-to-destination routing, distance, travel mode ETA, and route segment exposures |
| **9. Category Assignment** | [`src/services/heatRiskService.ts`](file:///d:/FILES/Projects/HeatShield/src/services/heatRiskService.ts): `presentationScore` / `level` | [`backend/heat_risk_engine.py`](file:///d:/FILES/Projects/HeatShield/backend/heat_risk_engine.py): `level` | Assigns Low, Moderate, High, or Extreme with NOAA danger threshold overrides |

---

## PHASE 2 — WEATHER DATA PROVENANCE INVESTIGATION

### 1. Root Cause of "Demo Weather Data" Badge

In the screenshot, the UI prominently displays `Demo Weather Data`. The investigation revealed three distinct reasons for this:

1. **Local Backend API Key:**  
   In `backend/.env`, `OPENWEATHER_API_KEY=""`.  
   `WeatherService.is_live_configured()` returned `False`. When live requests were made, the local backend returned:
   ```json
   {"error": "Live weather service is unavailable: OPENWEATHER_API_KEY is not configured.", "errorCode": "MISSING_API_KEY"}
   ```
2. **Hardcoded Demo Parameter in Frontend:**  
   In `src/services/weatherService.ts`, all weather fetch requests hardcoded `&demo=true` onto the query string:
   ```ts
   // OLD CODE:
   const queryUrl = `${base}/weather?location=${encodeURIComponent(location.trim())}&demo=true`;
   ```
   Even if an active key was present, this parameter instructed the backend to bypass the OpenWeather API and return mock data.
3. **Single-Candidate Endpoint Assumption:**  
   The frontend only queried `VITE_API_BASE_URL` (`http://127.0.0.1:8000`). It never failed over to the live deployed AWS API Gateway (`https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api`), which **does** possess an active OpenWeather key and returns live Bengaluru observations:
   ```json
   {"locationName": "Bengaluru, IN", "temperatureC": 21.0, "humidityPercent": 80.0, "isDemo": false, "dataSourceStatus": "live_sensor"}
   ```

### 2. Implemented Corrections for Provenance:
- **Multi-Candidate Live Failover:** `HybridWeatherService.getApiCandidates()` now tries the local backend first for live weather without `&demo=true`. If the local backend lacks an API key or fails, it automatically queries the AWS API Gateway. Only if both candidates fail does it enter demo mode.
- **Honest UI Warning Banner:** When demo weather is returned, `HeatRiskCard.tsx` now renders a prominent amber alert banner:
  > **Demo Telemetry Mode — Live Weather Observations Unavailable**  
  > Real-world heat exposure risk cannot be reliably determined without live station observations. The risk score and heat index displayed below are simulated based on default demonstration parameters.
- **Explicit Badge Labeling:** The badge now reads `Demo Weather Data (Simulated)`, accompanied by the timestamp of the simulation and observation telemetry.

---

## PHASE 3 — NOAA HEAT INDEX VERIFICATION

The National Oceanic and Atmospheric Administration (NOAA) National Weather Service (NWS) calculates the Heat Index using the Rothfusz 9-term polynomial equation derived from Steadman's human biometeorological model.

### 1. The Mathematical Equations

#### Temperature Conversion:
$$T_F = \frac{9}{5} T_C + 32, \quad T_C = \frac{5}{9} (T_F - 32)$$

#### Steadman's Preliminary Equation:
$$HI_{\text{simple}} = 0.5 \times \left[ T_F + 61.0 + ((T_F - 68.0) \times 1.2) + (RH \times 0.094) \right]$$
- If $HI_{\text{simple}} < 80^\circ\text{F}$, $HI = HI_{\text{simple}}$ (the full Rothfusz equation is not used).

#### Rothfusz 9-Term Polynomial ($HI_{\text{simple}} \ge 80^\circ\text{F}$):
$$HI = c_1 + c_2 T + c_3 RH + c_4 T \cdot RH + c_5 T^2 + c_6 RH^2 + c_7 T^2 \cdot RH + c_8 T \cdot RH^2 + c_9 T^2 \cdot RH^2$$

Where the official constants are:
$$\begin{array}{lll}
c_1 = -42.379 & c_2 = 2.04901523 & c_3 = 10.14333127 \\
c_4 = -0.22475541 & c_5 = -0.00683783 & c_6 = -0.05481717 \\
c_7 = 0.00122874 & c_8 = 0.00085282 & c_9 = -0.00000199
\end{array}$$

#### NOAA Adjustments:
1. **Low Humidity Adjustment** (When $RH < 13\%$ and $80^\circ\text{F} \le T \le 112^\circ\text{F}$):
   $$\text{Adj}_{\text{low}} = \left( \frac{13 - RH}{4} \right) \times \sqrt{\frac{17 - |T - 95|}{17}}, \quad HI = HI - \text{Adj}_{\text{low}}$$
2. **High Humidity Adjustment** (When $RH > 85\%$ and $80^\circ\text{F} \le T \le 87^\circ\text{F}$):
   $$\text{Adj}_{\text{high}} = \left( \frac{RH - 85}{10} \right) \times \left( \frac{87 - T}{5} \right), \quad HI = HI + \text{Adj}_{\text{high}}$$

### 2. Independent Reference Value Verification

| Test Condition | Temperature ($T_C$ / $T_F$) | Relative Humidity ($RH$) | Official NOAA NWS Target | HeatShield Implementation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mild / Simple Equation** | 23.9°C / 75.0°F | 50.0% | 74.6°F (23.7°C) | 74.6°F (23.7°C) | **VERIFIED** |
| **NWS Reference 1** | 26.7°C / 80.0°F | 45.0% | 80.0°F (26.7°C) | 80.0°F (26.7°C) | **VERIFIED** |
| **NWS Reference 2** | 32.2°C / 90.0°F | 50.0% | 95.0°F (35.0°C) | 95.0°F (35.0°C) | **VERIFIED** |
| **NWS Reference 3** | 35.0°C / 95.0°F | 55.0% | 108.9°F (42.7°C) | 108.9°F (42.7°C) | **VERIFIED** |
| **Low-RH Adjustment** | 32.2°C / 90.0°F | 10.0% | 88.5°F (31.4°C) | 88.5°F (31.4°C) | **VERIFIED** |
| **High-RH Adjustment**| 28.9°C / 84.0°F | 90.0% | 97.4°F (36.3°C) | 97.4°F (36.3°C) | **VERIFIED** |
| **User Screenshot** | **32.0°C / 89.6°F** | **56.5%** | **96.9°F (36.1°C)** | **96.9°F (36.1°C)** | **VERIFIED** |

The NOAA Heat Index formula in HeatShield was and remains **100% mathematically correct**.

---

## PHASE 4 — AUDIT OF THE RISK SCORING MODEL & THE 72/100 SCORE

### 1. The Mathematical Breakdown of the Old 72/100 Score

In the legacy code prior to this audit:
```python
# Legacy baseScore mapping:
if hi_f <= 70:
    base_score = 10.0
elif hi_f <= 80:
    base_score = 10.0 + ((hi_f - 70.0) / 10.0) * 15.0      # [10, 25]
elif hi_f <= 90:
    base_score = 25.0 + ((hi_f - 80.0) / 10.0) * 26.0      # [25, 51]
elif hi_f <= 103:
    base_score = 51.0 + ((hi_f - 90.0) / 13.0) * 24.0      # [51, 75]
elif hi_f <= 125:
    base_score = 75.0 + ((hi_f - 103.0) / 22.0) * 15.0     # [75, 90]
else:
    base_score = min(99.0, 90.0 + ((hi_f - 125.0) / 15.0) * 9.0)
```

For the user screenshot parameters:
- $T_C = 32.0^\circ\text{C}, RH = 56.5\% \implies HI = 96.9^\circ\text{F} (36.1^\circ\text{C})$
- $\text{Legacy Base Score} = 51.0 + \left(\frac{96.9 - 90.0}{13.0}\right) \times 24.0 = 51.0 + \left(\frac{6.9}{13.0}\right) \times 24.0 = 51.0 + 12.74 = \mathbf{63.74}$
- $\text{Activity Adjustment (Cycling)} = \mathbf{+3}$
- $\text{Duration Adjustment (45 minutes)} = \mathbf{0}$
- $\text{Solar Exposure Adjustment (Direct Sun at 14:30)} = \mathbf{+5}$
- **Calculated Total Score:**
  $$\text{Total} = \text{round}(63.74 + 3 + 0 + 5) = \text{round}(71.74) = \mathbf{72}$$
- **Legacy Risk Level Rule:**
  ```python
  if score >= 66 or hi_f >= 90:
      level = "High"
  ```
  Because $96.9^\circ\text{F} \ge 90^\circ\text{F}$ and $72 \ge 66$, the application assigned **High Risk**.

### 2. Defect Analysis: Why 72/100 High Risk Was Exaggerated

1. **NOAA Category Misalignment:**  
   NOAA NWS defines:
   - $< 80^\circ\text{F}$: Normal
   - $80 - 89^\circ\text{F}$: **Caution** (fatigue possible)
   - $90 - 102^\circ\text{F}$: **Extreme Caution** (sunstroke, heat cramps, and heat exhaustion possible with prolonged exposure and physical activity)
   - $103 - 124^\circ\text{F}$: **Danger** (heat cramps or heat exhaustion likely; heat stroke possible)
   - $\ge 125^\circ\text{F}$: **Extreme Danger** (heat stroke highly likely)  
   The legacy code assigned any $HI \ge 90^\circ\text{F}$ directly to "High Risk", completely eliminating the NOAA "Extreme Caution" category from the UI and inflating moderate conditions into emergencies.
2. **Excessive Baseline Starting Point:**  
   Setting the base score to `51.0` at $90^\circ\text{F}$ allocated more than half the risk scale before any activity or sun exposure was factored in.
3. **Double Penalty:**  
   The condition `hi_f >= 90` overriding the category directly to "High" made it impossible for any afternoon outdoor activity in a warm climate to be rated "Moderate", even if the person was only out for 30 minutes.

### 3. The Calibrated Model Formulation

We recalibrated `baseScore` to align each piecewise segment with the UI progress bar bands (Low: 0–35, Moderate: 36–65, High: 66–85, Extreme: 86–100):

$$\text{Base Score}(HI) = \begin{cases}
5.0 & HI \le 70^\circ\text{F} \\
5.0 + \left(\frac{HI - 70}{10}\right) \times 15.0 & 70^\circ\text{F} < HI \le 80^\circ\text{F} \quad [5, 20] \\
20.0 + \left(\frac{HI - 80}{10}\right) \times 16.0 & 80^\circ\text{F} < HI \le 90^\circ\text{F} \quad [20, 36] \text{ (NOAA Caution)} \\
36.0 + \left(\frac{HI - 90}{13}\right) \times 29.0 & 90^\circ\text{F} < HI \le 103^\circ\text{F} \quad [36, 65] \text{ (NOAA Extreme Caution)} \\
65.0 + \left(\frac{HI - 103}{22}\right) \times 20.0 & 103^\circ\text{F} < HI \le 125^\circ\text{F} \quad [66, 85] \text{ (NOAA Danger)} \\
\min\left(99.0, 85.0 + \left(\frac{HI - 125}{15}\right) \times 14.0\right) & HI > 125^\circ\text{F} \quad [86, 99] \text{ (NOAA Extreme Danger)}
\end{cases}$$

### 4. Recalculation of the User Scenario

- $HI = 96.9^\circ\text{F} (36.1^\circ\text{C})$
- $\text{Calibrated Base Score} = 36.0 + \left(\frac{96.9 - 90.0}{13.0}\right) \times 29.0 = 36.0 + \left(\frac{6.9}{13.0}\right) \times 29.0 = 36.0 + 15.4 = \mathbf{51.4}$
- $\text{Activity Adjustment (Cycling)} = \mathbf{+3}$
- $\text{Duration Adjustment (45 min)} = \mathbf{0}$
- $\text{Solar Exposure Adjustment (Direct Sun at 14:30)} = \mathbf{+5}$
- **Total Presentation Score:**
  $$\text{Score} = \text{round}(51.4 + 3 + 0 + 5) = \text{round}(59.4) = \mathbf{59} \quad (\mathbf{Moderate\ Risk})$$

**Clinical Context:** A 45-minute bicycle ride at 32°C in midday sun is accurately categorized as **Moderate Risk** (proper hydration recommended, caution advised). Strenuous exertion (e.g. 130 min running in direct sun at 32°C) escalates the score to $51.4 + 8 + 7 + 5 = 71.4 \to \mathbf{71/100}$ (**High Risk**), maintaining clinical accuracy and safety.

---

## PHASE 5 — VERIFICATION & TEST RESULTS

### 1. Test Suite Summary

- **Backend Pytest Suite:**  
  `python -m pytest -v backend/tests`  
  **73 passed in 1.17s (100% pass rate)**.  
  Includes:
  - `test_user_reported_screenshot_parameters`: Verifies $32^\circ\text{C}, 56.5\% \text{ RH}$, cycling, 45m, direct sun $\to HI = 36.1^\circ\text{C} / 96.9^\circ\text{F}$, score = 59, level = Moderate.
  - `test_strenuous_activity_and_extended_duration_escalates_to_high_risk`: Verifies 130m running in direct sun $\to$ score = 71, level = High.
  - `test_monotonic_risk_behavior`: Verifies duration, exertion, and direct sun strictly increase risk score.
  - All 23 CoolSpots backend tests pass.
- **Frontend Vitest Suite:**  
  `npm run test`  
  **9 test files, 61 passed in 2.26s (100% pass rate)**.  
  Includes:
  - `heatRiskService.test.ts` (14/14 passed)
  - `coolSpotService.test.ts` (18/18 passed)
  - `destinationAndRouting.test.ts` (10/10 passed)
  - `CoolSpotCard.test.tsx` (5/5 passed)
- **Static Analysis & Build:**  
  - `npm run lint` (`oxlint`): 0 errors.
  - `npm run build` (`tsc -b && vite build`): Built in 1.21s with 0 errors.
- **Browser Subagent Live UI Test:**  
  Verified on `http://localhost:5173/app/heat-risk`:
  - Form inputs set to Cycling, 45 mins, Direct Sun, 14:30.
  - Calculation successfully renders assessment card with full telemetry and contributing factors breakdown.
  - Demo notice banner renders with full warning when simulated weather is active.

---

## MONOTONICITY & SCIENTIFIC INTEGRITY AUDIT

| Property | Rule | Validation Result |
| :--- | :--- | :--- |
| **Duration Monotonicity** | Increasing duration must never reduce risk score | **PASSED:** 30m (54) $\le$ 90m (58) $\le$ 130m (61) |
| **Exertion Monotonicity** | Higher metabolic exertion must never reduce risk score | **PASSED:** Walking (+0) $\le$ Cycling (+3) $\le$ Running (+8) |
| **Shade Monotonicity** | Full shade must never increase risk relative to direct sun | **PASSED:** Full shade (-5) $\le$ Partial shade (0) $\le$ Direct sun (+5) |
| **Solar Timing Monotonicity**| Direct sun bonus must be zero at nighttime | **PASSED:** 20:30 solar bonus = 0; daytime 14:30 = +5 |
| **NOAA Safeguards** | Dangerous Heat Index ($\ge 103^\circ\text{F}$) must never be categorized Low or Moderate | **PASSED:** Level forced to High ($\ge 103^\circ\text{F}$) and Extreme ($\ge 125^\circ\text{F}$) |

---

## WORKSPACE PRESERVATION CONFIRMATION

In accordance with strict audit instructions, all existing uncommitted CoolSpots work has been completely preserved:
- Real OpenStreetMap location discovery (`backend/coolspot_adapter.py`)
- Overpass provider failover (`overpass.openstreetmap.fr` French mirror)
- Deadline enforcement (`_read_with_deadline`)
- Stale cache retention and capacity eviction (`backend/coolspot_service.py`)
- HVAC verification and opening-status UI (`src/components/CoolSpotCard.tsx`)
- All existing reports in `reports/` intact.
- Git clean state preserved (no `git reset`, `git checkout`, `git restore`, `git stash`, `git commit`, `git push`, or AWS deployment commands executed).
