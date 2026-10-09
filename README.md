# HeatShield — AI-Powered Heat Safety & Cooling Intelligence

> **Tagline:** Know the heat. Find the cool. Stay safer.

Built for the **Bharat Builds Tour — Environmental Hacks** hackathon.

**HeatShield** is an environmental safety web application designed to assess personal heat-exposure risks for outdoor activities and guide users to nearby cooling sanctuaries (**CoolSpot**).

---

## 🌟 Key Features

### 1. Environmental Telemetry Dashboard (`/app`)
- Live preview of ambient temperature, wet bulb globe temperature (WBGT) proxy, relative humidity, UV index, and wind vector.
- Clearly labeled **Demo Data** badge indicating non-live prototype values.
- Prominent **"Check My Heat Risk"** call to action.
- Nearby CoolSpot preview cards and recent assessment history widget.

### 2. Preliminary Heat-Risk Assessment Engine (`/app/heat-risk`)
- Interactive form: location, activity type (walking, cycling, running, outdoor work, other), planned time, duration (5 - 600 mins), and solar shade coverage.
- **Deterministic Heuristic Model**: Calculates a 0-100 risk score combining WBGT proxy, metabolic activity intensity multiplier, duration factor, and solar radiation penalties.
- Documented in a decoupled TypeScript service module (`src/services/heatRiskService.ts`) for easy future replacement with AWS Lambda backend algorithms.
- Explicit non-medical disclaimer, breakdown of contributing factors, and uncertainty rating (14%).

### 3. CoolSpot Cooling Discovery (`/app/coolspots`)
- Filter cooling locations by category:
  - 🏞️ Parks & Shaded Canopy
  - 🏛️ Indoor Air-Conditioned Public Spaces
  - 🚰 Refill & Hydration Stations
  - ❄️ Official Municipal Cooling Centers
- Search bar, distance slider (1-10 km), verified shade and water toggles.
- Dual layout mode: Side-by-side split view, Map-only, or Card List-only.
- Interactive OpenStreetMap (Leaflet) rendering with custom SVG markers.
- Verified status tags, last verified timestamps, operating hours, and one-click directions via OpenStreetMap routing.

### 4. Personalized Safety Recommendations (`/app/recommendations`)
- Actionable hydration schedule (ml/hour), rest-break intervals, and heat exhaustion warning sign matrix.
- **Optimal Time Window**: Suggests lower-risk alternative times (e.g., early morning 06:30 - 08:30 AM) when thermal stress is minimal.
- **Amazon Bedrock Ready**: Interface prepared for future Bedrock generative AI prompt/response contracts.

### 5. History & Settings (`/app/history` & `/app/settings`)
- **History**: LocalStorage persistence of past assessments with explicit `Demo Record` tags and detailed modal viewer.
- **Settings**: Preferred temperature scale (°C / °F), distance unit (km / miles), default activity, and privacy notice.

---

## 🏗️ Technical Architecture & AWS Readiness

HeatShield is built with a zero-credentials frontend architecture, fully prepared to plug into AWS serverless infrastructure:

```
                  ┌────────────────────────────────────────┐
                  │          HeatShield Frontend           │
                  │   (React 19 + Vite + Tailwind CSS)    │
                  └──────────────────┬─────────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
      ┌─────────────────────────────┐ ┌─────────────────────────────┐
      │     REST API Integration    │ │     Amazon Cognito Auth     │
      │   (AWS API Gateway + IAM)   │ │  (User Identity & Session)  │
      └──────────────┬──────────────┘ └─────────────────────────────┘
                     │
       ┌─────────────┼──────────────────────────────┐
       ▼             ▼                              ▼
┌──────────────┐ ┌──────────────────────────┐ ┌────────────────────┐
│ AWS Lambda   │ │     Amazon Bedrock       │ │  Amazon DynamoDB   │
│ (Risk Engine)│ │ (GenAI Recommendations)  │ │ (GeoSpatial Store) │
└──────────────┘ └──────────────────────────┘ └────────────────────┘
```

- **Cognito**: User authentication and authorization.
- **API Gateway + Lambda**: Microservice routing and heat risk calculations.
- **Amazon Bedrock**: Generative AI personalized safety coaching.
- **DynamoDB**: Scalable GeoJSON query store for verified CoolSpots.
- **Amazon SNS & EventBridge**: Push notification alerts during extreme heat warnings.

---

## 🛠️ Technology Stack

- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Routing**: React Router v7
- **Mapping**: Leaflet, React-Leaflet with OpenStreetMap
- **State/Storage**: TypeScript Services + LocalStorage

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   cd HeatShield
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📋 Hackathon Verification Summary

- **Routes Verified**: `/`, `/app`, `/app/heat-risk`, `/app/coolspots`, `/app/recommendations`, `/app/history`, `/app/settings`.
- **Validation**: Form inputs validate required fields and ranges before risk calculation.
- **Heuristics**: Deterministic WBGT approximation module isolated in `src/services/heatRiskService.ts`.
- **Zero Third-Party API Keys**: Requires no AWS credentials to run locally.
