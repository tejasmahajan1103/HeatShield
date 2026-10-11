# HeatShield

## Heat-risk awareness and cooling-location assistance

**Track:** Heat and Water --- Bharat Builds Tour: Environmental Hacks\
**Repository:** https://github.com/tejasmahajan1103/HeatShield\
**Live project:**
https://feature-route-aware-heat-risk.d3ysfyr1cozmt4.amplifyapp.com\


## The problem

Extreme heat can make everyday travel and outdoor activity risky. People
need understandable, locally relevant information about heat exposure
and nearby places that may offer relief. A weather reading alone does
not tell a user what to do next.

## The solution

HeatShield is a web application that combines a heat-risk assessment
experience with nearby cooling-location discovery and assessment
history. It aims to turn weather and location information into practical
guidance. Risk outputs are estimates, not medical advice or official
emergency warnings.

## What is implemented

-   **Heat-risk assessment UI:** users can view an assessment based on
    the application's configured inputs and risk engine.
-   **Weather integration:** the backend uses the OpenWeather API.
-   **Nearby cooling locations:** the backend queries
    OpenStreetMap/Overpass data for potentially useful places and
    amenities.
-   **Risk History:** the frontend can save and retrieve assessments
    through the risk-history API backed by DynamoDB.
-   **AWS-hosted frontend and API:** the frontend is deployed through
    AWS Amplify Hosting; API Gateway routes requests to AWS Lambda.
-   **Automated checks:** the current backend test suite completed with
    52 tests passing; `npm run build` completed successfully.

## AWS architecture

``` text
Browser
  |
  v
React + TypeScript + Vite frontend
  |                         \
  v                          v
AWS Amplify Hosting       API Gateway (REST, prod)
                              |
                              v
                      AWS Lambda: HeatShield-RiskEngine
                        |         |          |
                        v         v          v
                   OpenWeather  Overpass   DynamoDB
                    weather     / OSM      RiskHistory
```

## Technology Stack and Services

HeatShield combines a React-based frontend with AWS serverless services and external weather and map data providers.

### Frontend

| Technology | Purpose |
|---|---|
| React | Builds the user interface and interactive pages. |
| TypeScript | Adds static typing to frontend code. |
| Vite | Provides the development server and production build tooling. |

### AWS Cloud Services

| Service | What it does in HeatShield |
|---|---|
| AWS Amplify Hosting | Hosts and deploys the web frontend. |
| Amazon API Gateway (REST API) | Exposes API endpoints and routes requests to the backend. |
| AWS Lambda (Python) | Executes backend logic for heat-risk assessments, weather and cooling-location integrations, and risk-history endpoints. |
| Amazon DynamoDB | Stores and retrieves risk-assessment history. |

### External Data Providers

| Service | What it does in HeatShield |
|---|---|
| OpenWeather API | Supplies weather data used by the backend. |
| OpenStreetMap (OSM) | Provides community-maintained map data. |
| Overpass API | Queries mapped locations near a user's selected coordinates, including potentially useful public places and amenities. |

### Backend and Development Tools

- **Python:** Implements backend handlers and services.
- **Python `unittest`:** Runs automated backend tests.
- **Git and GitHub:** Track source-code changes and maintain project history.

### Architecture Overview

1. The user accesses the web application hosted on AWS Amplify.
2. The frontend sends requests to Amazon API Gateway.
3. API Gateway routes supported requests to the AWS Lambda backend.
4. Lambda retrieves weather or nearby-location data from the configured external providers.
5. Lambda reads or writes assessment history in Amazon DynamoDB.
6. The API returns results to the frontend for display.

### Verification and Limitations

- Backend tests: 52 tests passed at the referenced development checkpoint.
- Frontend production build: completed successfully.
- Heat-risk results are estimates, not medical advice or official emergency warnings.
- OpenStreetMap and Overpass data may be incomplete or outdated. Opening hours, accessibility, and air-conditioning availability must not be assumed without verification.
- Amazon Bedrock model invocation was previously blocked by account authorization; a working Bedrock integration is not claimed.

## Run locally

Requirements: Node.js/npm, Python 3, and AWS credentials only if testing
AWS-backed routes directly.

1.  Clone the repository:

    ``` bash
    git clone https://github.com/tejasmahajan1103/HeatShield.git
    cd HeatShield
    ```

2.  Install frontend dependencies:

    ``` bash
    npm install
    ```

3.  Configure required environment variables using the repository's
    `.env.example` and the project documentation. Do not commit real API
    keys.

4.  Start the frontend:

    ``` bash
    npm run dev
    ```

5.  Run backend tests:

    ``` bash
    python -m unittest discover -s backend/tests -q
    ```

6.  Build the frontend:

    ``` bash
    npm run build
    ```

Exact local backend setup may depend on the AWS/Lambda deployment
configuration and environment variables.

## Verification status

At the current reference commit: - Backend unit tests: **52 passed**. -
Frontend production build: **successful**. - AWS Lambda deployment: a
deployment was reported as successful in the project workflow. - Live
CoolSpots API: a live response was observed from the deployed API.

## Known limitations and responsible-use notes

-   **Heat-risk estimates:** the result is an estimate produced by the
    project's configured risk logic. It is not a medical diagnosis, a
    certified heat index, or an official emergency alert.
-   **Cooling-location data:** OpenStreetMap data can be incomplete or
    stale. A mapped location is not proof that it is open, accessible,
    staffed, or suitable for cooling.
-   **Opening status and air conditioning:** previous live responses
    showed an `isOpenNow` value of `true` while `openStatusVerified` was
    `false`, and some locations were labelled `Air Conditioned` without
    verified evidence. These claims require correction and retesting
    before describing the cooling-location feature as fully reliable.
-   **AI/Bedrock:** Amazon Bedrock model invocation was previously
    blocked by account authorization. Do not claim Bedrock or a
    generative AI model is integrated unless it is subsequently enabled
    and verified. Describe the current risk logic as
    rule-based/heuristic where applicable.
-   **Production readiness:** passing unit tests and building the
    frontend do not by themselves establish full end-to-end production
    reliability. Risk-history live flows and all displayed live-data
    claims should be verified.
-   **Privacy:** the browser's anonymous session identifier is not user
    authentication. Do not store sensitive personal information in the
    app.
-   **Credentials:** API keys and AWS secrets must be kept out of GitHub
    and rotated if exposed.

  ## Development History

HeatShield is developed incrementally using Git and GitHub. The commit history records project checkpoints, feature development, reliability improvements, and deployment-related fixes.

### Key Development Milestones

| Commit | Development milestone |
|---|---|
| `1e37593` | Initial checkpoint before Phase 1 code audit |
| `bd18be6` | Checkpoint before route-aware risk implementation |
| `285f95f` | Prepare frontend and route-aware risk features |
| `b8f2a04` | Fix production Cool Spots API endpoint |
| `e1f70f6` | Fix production Cool Spots API endpoint |
| `2944330` | Add environment variable example |
| `733196f` | Update project documentation |
| `08be74d` | Improve heat risk and cooling spot reliability |
| `cb816fc` | Remove unsupported Bedrock readiness badge |
| `6ad8134` | Add risk history and improve cooling spot reliability |

### Commit History

Explore the complete development timeline, including commit details and code changes:

[View HeatShield Git Commit History](https://github.com/tejasmahajan1103/HeatShield/commits/feature/route-aware-heat-risk/)



