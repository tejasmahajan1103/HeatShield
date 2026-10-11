# HeatShield

## Heat-risk awareness and cooling-location assistance

**Track:** Heat and Water --- Bharat Builds Tour: Environmental Hacks\
**Repository:** https://github.com/tejasmahajan1103/HeatShield\
**Live demo:**
https://feature-route-aware-heat-risk.d3ysfyr1cozmt4.amplifyapp.com\
**Current reference commit:** `6ad8134` --- Add risk history and improve
cooling spot reliability

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

### AWS services used

-   **AWS Amplify Hosting:** serves the web frontend.
-   **Amazon API Gateway (REST API):** exposes backend routes.
-   **AWS Lambda (Python):** runs API handlers, weather/cooling-location
    integration, and risk-history logic.
-   **Amazon DynamoDB:** stores risk-history records.

The project uses third-party OpenWeather and OpenStreetMap/Overpass data
providers. AWS services are used for hosting, API execution, and
persistence.

## Technology stack

-   Frontend: React, TypeScript, Vite
-   Backend: Python, AWS Lambda
-   API: Amazon API Gateway REST API
-   Persistence: Amazon DynamoDB
-   External data: OpenWeather API, OpenStreetMap/Overpass API
-   Version control: Git and GitHub

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

## Demo and submission

The Environmental Hacks submission rules specify three items: a public
repository, a YouTube demo video of up to three minutes (public or
unlisted), and a short write-up explaining the problem, build, and AWS
usage. The submission form and deadline are on the official event page.

-   Repository: https://github.com/tejasmahajan1103/HeatShield
-   Live app:
    https://feature-route-aware-heat-risk.d3ysfyr1cozmt4.amplifyapp.com
-   Official event page: https://www.wemakedevs.org/aws/env
-   Official rules: https://www.wemakedevs.org/aws/rules

## Suggested three-minute demo script

**0:00--0:20 --- Problem and audience**\
"HeatShield helps people make more informed decisions during hot weather
by bringing heat-risk guidance and nearby cooling-location discovery
into one web experience."

**0:20--0:55 --- Assessment flow**\
Open the live app and demonstrate the implemented heat-risk assessment.
Explain the inputs and show the resulting estimate. Avoid calling it a
certified heat index or medical prediction.

**0:55--1:25 --- Nearby locations**\
Show the CoolSpots experience and explain that it uses
OpenStreetMap/Overpass data. Explicitly note that availability, opening
hours, and cooling amenities depend on source data and should be
verified.

**1:25--1:50 --- Risk History**\
Show the Risk History page and, if the live save/retrieve flow has been
verified, save an assessment and reload the history. If it has not been
verified, demonstrate only what is confirmed and do not imply successful
persistence.

**1:50--2:30 --- AWS architecture**\
Show a simple architecture slide: Amplify Hosting → API Gateway → Lambda
→ OpenWeather/Overpass and DynamoDB. Explain which services are actually
deployed.

**2:30--2:50 --- Testing and limitations**\
Mention 52 passing backend tests and a successful frontend production
build. Be transparent that third-party location data can be incomplete
and some live opening/amenity claims need correction.

**2:50--3:00 --- Impact**\
"HeatShield's goal is to help users move from weather information to
practical next steps. The next priorities are validating location
details and testing end-to-end reliability."

## Submission checklist

-   [ ] Confirm the official submission form is still open.
-   [ ] Confirm the repository is public and contains the intended code.
-   [ ] Record a demo of **less than three minutes**.
-   [ ] Upload the video to YouTube as public or unlisted.
-   [ ] Open the video link in a signed-out browser to test access.
-   [ ] Include the project problem, implementation, and AWS role in the
    write-up.
-   [ ] List AI coding tools used, as required by the event rules.
-   [ ] Credit third-party libraries, APIs, assets, and their licenses
    where required.
-   [ ] Never include API keys, credentials, or temporary test output
    files in the public repository.
