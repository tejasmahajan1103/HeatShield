# HeatShield — AI-Powered Heat Safety & Cooling Intelligence

> **Know the heat. Find the cool. Stay safer.**

Built for the **Bharat Builds Tour — Environmental Hacks** hackathon.

HeatShield is a heat-safety web application designed to help people understand environmental heat exposure, discover nearby cooling locations, and plan outdoor activities with more awareness of heat conditions.

## Key Features

### 1. Environmental Dashboard (`/app`)
- Presents weather and heat-safety information.
- Provides entry points to heat-risk assessment and nearby cooling locations.
- Includes assessment history and application settings where available.
- Uses the source-status fields returned by the backend to distinguish live weather from demo/fallback data.

### 2. Heat-Risk Assessment (`/app/heat-risk`)
- Accepts a location and activity/exposure details.
- Returns a risk score, risk category, contributing factors, uncertainty information, and a weather snapshot.
- The backend uses the NOAA National Weather Service heat-index equation as part of its environmental heat assessment.
- Activity intensity, exposure duration, and shade are represented as additional risk factors.
- **Safety note:** HeatShield's score and categories are application-level guidance. They are not an official medical diagnosis or a probability of illness. Follow local heat warnings and seek professional or emergency help when appropriate.

### 3. Cool Spots Discovery (`/app/coolspots`)
- Finds nearby cooling locations using OpenStreetMap-based data services.
- Displays results on an interactive Leaflet map and in a list.
- Supports available category, search, distance, and location-related filters.
- Provides route/directions features and handles unavailable results or API errors.
- Location availability and details depend on the external map-data provider; verify opening hours and access before travelling.

### 4. Safety Recommendations (`/app/recommendations`)
- Presents heat-safety recommendations associated with assessment results.
- May include hydration guidance, rest breaks, warning signs, and lower-risk activity timing where supported by the application.
- The recommendations are informational and should not replace official public-health advice.

### 5. History and Settings (`/app/history`, `/app/settings`)
- Stores assessment history in browser LocalStorage.
- Provides supported preferences such as temperature units, distance units, and default activity.
- Because history is stored locally, it is tied to the browser/device and is not a cloud-synced account history.

## Technology Stack

### Frontend
- React 19 and TypeScript
- Vite
- Tailwind CSS v4
- React Router v7
- Leaflet and React-Leaflet with OpenStreetMap
- Lucide React
- Vitest for tests and Oxlint for linting

### Backend and external services
- Python backend with a shared request router for local HTTP-server and AWS Lambda execution
- Amazon API Gateway
- AWS Lambda (`HeatShield-RiskEngine`)
- OpenWeather API for live weather data
- OpenStreetMap-based services for nearby cooling-location discovery
- NOAA National Weather Service heat-index equation

### Hosting and version control
- AWS Amplify for frontend hosting
- Amazon CloudWatch for Lambda monitoring and alarms
- Git and GitHub

## Architecture

```text
                       User's Browser
                             |
                             v
                 React + TypeScript Frontend
                       AWS Amplify
                             |
                             v
                      Amazon API Gateway
                             |
                             v
                 AWS Lambda: HeatShield-RiskEngine
                      /              \
                     v                v
              Weather Service    Heat-Risk Engine
                     |                |
                     v                v
               OpenWeather API   NOAA NWS heat-index method
                             \
                              v
                       Cool Spots Service
                              |
                              v
                 OpenStreetMap-based data services
```

The frontend communicates with the backend through HTTP endpoints. The same Python request-routing logic is used by AWS Lambda and the local development HTTP server. Some UI preferences/history are stored in the browser. Cognito, Bedrock, DynamoDB, and AI-chat features are not listed as deployed components here because their integration has not been confirmed as part of the current working application.

## Production API

**API base URL:**

```text
https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod
```

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health status and weather-provider configuration |
| `GET` | `/api/weather?location=Pune` | Current weather for a named location |
| `GET` | `/api/forecast?location=Pune` | Weather forecast for a named location |
| `POST` | `/api/risk` | Calculate a heat-risk assessment |
| `GET` | `/api/coolspots?lat=18.5204&lon=73.8567&radiusKm=5` | Discover nearby cooling locations |

### Example: heat-risk request

```json
{
  "location": "Pune"
}
```

PowerShell example:

```powershell
$body = @{ location = "Pune" } | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod/api/risk" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python (Python 3.12 is the Lambda runtime; a compatible local Python installation is recommended)
- Git
- An OpenWeather API key for local live-weather testing

### 1. Clone the repository

```bash
git clone https://github.com/tejasmahajan1103/HeatShield.git
cd HeatShield
git checkout feature/route-aware-heat-risk
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the frontend

Create a root `.env.local` file. Use `.env.example` as a reference and set the API base URL:

```dotenv
VITE_API_BASE_URL=https://ywxmdsz1re.execute-api.ap-south-1.amazonaws.com/prod
```

For local end-to-end testing, set this value to the local backend URL instead, if that is the environment being tested. Vite variables prefixed with `VITE_` are bundled into client-side code; never put secret keys in them.

### 4. Run the frontend

```bash
npm run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

### 5. Configure and run the local backend (optional)

The local HTTP server entry point is `backend/server.py`, and the example backend settings are in `backend/.env.example`. The example file documents the `OPENWEATHER_API_KEY`, `OPENWEATHER_BASE_URL`, `HOST`, `PORT`, and timeout settings. Configure the variables in your local shell/environment; do not commit actual credentials.

PowerShell example for the current terminal session:

```powershell
$env:OPENWEATHER_API_KEY = "your_openweather_api_key_here"
$env:OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
python backend/server.py
```

The default local server address is `http://127.0.0.1:8000`. Ensure the frontend's API base URL points to that local server when testing the full application locally. Install any required Python dependencies in your chosen environment if an import error identifies a missing package. The repository currently does not include a `requirements.txt` or `pyproject.toml` dependency manifest.

### 6. Build the frontend for production

```bash
npm run build
```

Vite writes the production assets to `dist/`.

## Testing and Validation

### Frontend

```bash
npm test
npm run lint
npm run build
```

### Backend

Install pytest in your chosen Python environment if it is not present:

```bash
python -m pip install pytest
```

Run the backend tests from the repository root:

```bash
python -m pytest backend/tests -v
```

### Verification results observed on October 11, 2026

- Frontend tests: **49 passed** across 8 test files.
- Backend tests: **38 passed**.
- Production build: **successful**; Vite reported a JavaScript chunk-size warning.
- Lint: **0 errors and 7 warnings**.
- Production health, live weather, and heat-risk endpoints: **responded successfully** during manual verification.
- Main production UI flows: reported working during manual verification.
- AWS Amplify deployment: **successful** for commit `2944330` (`Add environment variable example`) during this verification session.

Rerun the checks after code changes; these results describe the tested state at that time.

## Deployment

- **Frontend hosting:** AWS Amplify
- **Backend:** AWS Lambda behind Amazon API Gateway
- **AWS Region:** `ap-south-1` (Mumbai)
- **GitHub repository:** https://github.com/tejasmahajan1103/HeatShield
- **Working branch:** `feature/route-aware-heat-risk`
- **Amplify build command:** `npm run build`
- **Build output directory:** `dist`

## Security and Privacy

- Never commit real API keys, AWS credentials, or private environment files.
- Keep `.env.local` and backend local secret files out of Git.
- Treat all `VITE_` variables as public client-side configuration.
- Request location access only when location-based features need it.
- Avoid exposing personal location data or secrets in screenshots and logs.

## Limitations

- Weather and nearby-place results depend on external providers, network availability, and API limits.
- Some services may return fallback/demo data when supported; check the data-source status before relying on a reading.
- Route estimates and risk scores are informational, not guarantees of safety.
- Assessment history is stored in browser LocalStorage, not a cloud account.
- An AI assistant and other future AWS integrations should be described as planned until implemented and verified.

## License

No license is currently documented in this README. Add a license if you intend to permit reuse or redistribution.
