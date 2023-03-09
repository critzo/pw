# Piecewise

A customizable online survey tool for running NDT tests.

## Requirements

- [Node.js](https://nodejs.org) of version `>=12`
- `npm`

## Structure

Piecewise is composed of 2 different parts:

- A [React](https://reactjs.org/)-based **frontend**.
- A [Koa](https://koajs.com)-based **backend** that renders & serves the
  frontend and exposes an API used by the frontend.

These parts are located here in this repository:

```
src/backend  # The backend components
src/common   # Common code and assets
src/frontend # The React frontend
```

## Configuration

Piecewise is configured via variables either specified in the environment or
defined in a `.env` file (see `env.example` for an example configuration that
may be edited and copied to `.env`).

The backend parses the following configuration variables:

```
PIECEWISE_LOG_LEVEL       # Logging level (default: error)
PIECEWISE_HOST            # The host Piecewise runs on (default: localhost)
PIECEWISE_PORT            # The port to bind to (default: 3000)
PIECEWISE_ADMIN_USERNAME  # The administrative user (default: 'admin')
PIECEWISE_ADMIN_PASSWORD  # The administrative password
PIECEWISE_VIEWER_USERNAME # (Optional) A user for viewing the results (default: viewer)
PIECEWISE_VIEWER_PASSWORD # (Optional) A password for the viewer user
PIECEWISE_DB_HOST         # Postgres database host (default: localhost)
PIECEWISE_DB_PORT         # Postgres port (default: 5432)
PIECEWISE_DB_DATABASE     # Postgres database name (default: piecewise)
PIECEWISE_DB_USERNAME     # Postgres user (default: piecewise)
PIECEWISE_DB_PASSWORD     # Postgres password
PIECEWISE_DB_POOL_MIN     # Postgres minimum connections (default: 0)
PIECEWISE_DB_POOL_MAX     # Postgres max connections (default: 10)
PIECEWISE_DB_TIMEOUT      # Postgres connection timeout (default: 0)
PIECEWISE_MAPBOX_KEY      # Mapbox API key

# OAuth2 (Optional, see below)
PIECEWISE_OAUTH_AUTH_URL  # The OAuth2 authorization endpoint to connect to
PIECEWISE_OAUTH_TOKEN_URL # The OAuth2 token endpoint to connect to
PIECEWISE_OAUTH_CLIENT_ID # Identifier associated w/ this Piecewise instance (generally the domain)
PIECEWISE_OAUTH_CLIENT_SECRET # Secret authenticating this Piecewise instance
PIECEWISE_OAUTH_CALLBACK_URL  # URL at which this PIECEWISE instance can be reached (generally https://<domain>/api/v1/oauth2/callback)
```

All new deployments should at least provide a value for the variable
PIECEWISE_ADMIN_PASSWORD to allow initial login and post deployment
configuration.

Additionally, we use the semi-standard `NODE_ENV` variable for defining test,
staging, and production. In development mode Piecewise uses sqlite3, but uses
Postgres in production.

## OAuth2 Support

Piecewise has optional support for utilizing OAuth2 for authentication. This has
the effect of disabling the admin (and optionally, viewer) users as specified in
the environment and utilizing users created in the OAuth2 provider. **This
support was made and tested for use with
[Piecewise-SaaS](https://github.com/m-lab/piecewise-saas), YMMV when using a
different backend.**

Piecewise-SaaS takes care of configuring the OAuth2 parameters for the Piecewise
instances it manages, but here is an example configuration for development
purposes that can be used with an instance of Piecewise-SaaS running on the same
host in a development configuration. In this setup, Piecewise-SaaS is running on
port 3000, and Piecewise on port 3001:

```
PIECEWISE_PORT=3001 (both apps default to the same port, so we'll run on port 3001 instead)

PIECEWISE_OAUTH_AUTH_URL=http://localhost:3000/oauth2/authorize
PIECEWISE_OAUTH_TOKEN_URL=http://localhost:3000/oauth2/token
PIECEWISE_OAUTH_CLIENT_ID=piecewise1.localhost (matches a value in the development db seeds in the Piecewise-SaaS repo; would normally be the domain)
PIECEWISE_OAUTH_CLIENT_SECRET=secret (generally some random string generated by Piecewise-SaaS)
PIECEWISE_OAUTH_CALLBACK_URL=http://localhost:3001/api/v1/oauth2/callback
```

## Optional Qualtrics integration

To use optional integration with [Qualtrics](https://qualtrics.com), configure
the environment variables below:

```
PIECEWISE_QUALTRICS_ENV=The identifier for the region/environment your survey
is running in
PIECEWISE_QUALTRICS_API_TOKEN=The API token for authenticating to Qualtrics
```

In your Qualtrics survey, add the following built-in embedded data fields to
fetch data for Piecewise:

```
SessionID
SurveyID
Q_R
```

And the following custom values to hold data that Piecewise adds to the survey
results:

```
c2sRate
s2cRate
MinRTT
MaxRTT
latitude
longitude
address
```

Create a 'Text/Graphic' question block as the last question in your survey, and
in HTML editor mode paste the following code snippet:

```
<iframe allowfullscreen="" src="https://example.com/?redirect=geocoder&amp;surveyId=${e://Field/SurveyID}&amp;sessionId=${e://Field/SessionID}&amp;responseId=${e://Field/Q_R}" style="width:400px;height:400px;"></iframe>
```

Replace `example.com` with the URL of your Piecewise instance (it must be using
https), and the `?redirect=` parameter can be either `geocoder` (uses optional
google maps support to gather the latitude, longitude, and address data from the
user) or `test` (goes directly to the bandwidth test).

In order to hijack the end of survey message (which does not display correctly
because of issues with handling Qualtrics sessions, even though the survey data
is correctly submitted), you can hide the button to progress to the end of
survey message by adding Javascript to the iframe question block in the
`addOnReady` handler:

```
$('NextButton').hide();
```

## Deploy to Google Cloud Run

In order to install to Google Cloud Run, we need a few different components:

1. An Artifact Registry to store the Docker image we'll deploy (quickstart available [here](https://cloud.google.com/artifact-registry/docs/docker/quickstart))
2. A PostgreSQL instance for the database (quickstart available [here](https://cloud.google.com/sql/docs/postgres/quickstart))
3. A Cloud Run instance to actually run the Docker container (quickstart available [here](https://cloud.google.com/run/docs/quickstarts/prebuilt-deploy))

It's important that all of these are in the same region, so make sure that you **pick the same region throughout** (multi-region deployments are beyond the scope of these instructions). Follow the steps below to deploy on Google Cloud (we won't duplicate the instructions above, but will provide guidance on which options to select; many of the directions above are using the cli interface but it can also be accomplished via the web console):

1. Create an artifact registry repository for Docker, in the preferred region, using the default Google-managed encryption key. Note down the name that you select here for later.
2. Using the `gcloud` cli, run `gcloud auth configure-docker {region}-docker.pkg.dev` where `{region}` is the region you selected. This will configure Docker on your local system to be able to push images to the artifact registry.
3. Create a Postgres SQL instance using the instructions above. Select the same region, and under `connections` enable `Private IP` with the default network. Note down the instance ID and password you select, and note down the private `10.*` IP after the instance deploys.
4. Build the Docker image on your local machine, tagged appropriately: `docker build . -t {region}-docker.pkg.dev/{project}/{repository}/piecewise:latest` where`{region}` is the region, `{project}` is your Google Cloud project, and `{repository}` is your artifact registry repository.
5. Push the resulting image to your artifact registry with `docker push {region}-docker.pkg.dev/{project}/{repository}/piecewise:latest`
6. Create a new Google Cloud Run deployment with the instructions above. Select the image you just pushed to the repository, select the same region and the default resource allocations, and under `advanced settings -> connections` add a Cloud SQL connection to the Postgres instance you created above. In `advanced settings -> variables & secrets` set at least the following environment variables:
```
PIECEWISE_ADMIN_PASSWORD = <whateveryouwant>
PIECEWISE_DB_HOST = <the SQL IP you noted above>
PIECEWISE_DB_PASSWORD = <the SQL password you noted above>
PIECEWISE_DB_USERNAME = postgres
NODE_ENV = production
```

## Administration & Use

Documentation on how to deploy and administer Piecewise can be found in the
[wiki of this repository](https://github.com/m-lab/piecewise/wiki/).

## License

Piecewise is an open-source software project licensed under the Apache License
v2.0 by [Measurement Lab](https://measurementlab.net) and
[Throneless Tech](https://throneless.tech).
