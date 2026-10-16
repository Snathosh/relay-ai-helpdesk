# Relay AI Helpdesk

A full-stack helpdesk starter with a React/TypeScript client and Spring Boot API. It includes AI chat with PDF-grounded retrieval, PostgreSQL-backed support tickets, and ticket tools exposed to the Spring AI chat model.

## Requirements

- Node.js 20.19+ and npm
- Java 17+
- Maven 3.9+ for the local API, or Docker Desktop for Compose
- Docker Compose for the containerized setup
- An OpenAI API key for AI answers

## Run locally

1. Start PostgreSQL with pgvector:

   ```sh
   docker compose up -d db
   ```

2. Start the API in a terminal (this local profile uses a file-backed H2 database, so Docker/PostgreSQL are not required):

   ```sh
   cd backend
   mvn spring-boot:run -Dspring-boot.run.profiles=local
   ```

   Registration, login, and tickets work without an AI key. To enable AI chat and PDF answers, set `OPENAI_API_KEY` and `SPRING_AI_MODEL_CHAT=openai` in the API environment before starting it. Local account and ticket data persist in `backend/helpdesk-local.mv.db`.

3. Install and run the client in another terminal:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Open http://localhost:5173. Vite forwards `/api` requests to the API on port 8080. Without the API, chat and ticket creation remain available in a session-local demo mode.

## Run with Docker Compose

Set `OPENAI_API_KEY` in your environment, then run:

```sh
docker compose up --build
```

Open http://localhost:8081. PostgreSQL data is stored in the `postgres_data` volume. The Compose database password is for local development only; change it before any shared or deployed environment.

## Zero-cost public demo (Render + Neon)

The repository includes a Render Blueprint at `render.yaml`. It deploys the root Dockerfile as a free web service; Neon Free supplies persistent PostgreSQL. Register/login and per-account tickets work without paid AI credentials.

1. Create a Neon Free project and database. Copy its host, database name, username, and password from the connection details.
2. In Render, create a Blueprint from this repository and select the Hobby workspace plan. The service itself is configured with `plan: free`.
3. Enter the Neon values in the Render service variables: `PGHOST`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`. Keep the database password in the Render secret field.
4. Wait for `/actuator/health` to pass. Render provides a public HTTPS URL for the web service.

Free-tier limitations: Render sleeps after 15 minutes idle and can take about a minute to wake. Neon Free includes 1 GB database storage, 100 compute-hours per month, and 5 GB network transfer; it scales to zero after inactivity. The `free` profile disables paid AI inference, so chat and PDF requests explain that AI is not configured. OpenAI usage is billed separately and is not included in a zero-cost deployment.

## Paid Railway deployment with AI

The root `Dockerfile` builds the frontend into the Spring Boot app, so the public UI and API share one HTTPS domain. Railway's standard PostgreSQL service does not include pgvector; add the Railway pgvector template as a separate private database service.

1. Create a Railway project and add the [pgvector template](https://railway.com/deploy/3jJFCA). This template creates a public TCP proxy by default; after it is deployed, disable that proxy with `railway tcp-proxy delete --service pgvector --yes`. The app connects through the private `PGHOST_PRIVATE` address.
2. Add this repository as a Railway service from the repository root. Railway detects the root `Dockerfile` and builds the single web service.
3. Set these variables on the web service, replacing `pgvector` with the exact database service name:

   ```text
   SPRING_PROFILES_ACTIVE=prod
   SPRING_AI_MODEL_CHAT=openai
   PGHOST_PRIVATE=${{pgvector.PGHOST_PRIVATE}}
   PGPORT_PRIVATE=${{pgvector.PGPORT_PRIVATE}}
   PGDATABASE=${{pgvector.PGDATABASE}}
   PGUSER=${{pgvector.PGUSER}}
   PGPASSWORD=${{pgvector.PGPASSWORD}}
   OPENAI_API_KEY=<set as a sealed Railway secret>
   ```

   Enter `OPENAI_API_KEY` directly in Railway's Variables UI and seal it; do not commit it or paste it into chat.
4. Wait for the deployment health check at `/actuator/health` to pass, then open the service's Settings → Networking and generate a Railway domain. Railway provisions HTTPS automatically.

The local H2 profile is not used in production. Railway's database service must provide the private PG host/port and `PGDATABASE`, `PGUSER`, and `PGPASSWORD` variables, and the pgvector extension must be available for the Spring AI schema initializer. Enable database backups before using real customer data. This Railway path is not zero-cost.

## API surface

- `POST /api/chat/ask` with JSON `{ "question": "..." }` returns an AI answer using PGVector retrieval.
- `POST /api/chat/ask` with multipart fields `question` and `file` indexes a PDF, then answers using the retrieved content.
- `GET /api/tickets` and `GET /api/tickets/{id}` list and check tickets.
- `POST /api/tickets` with `{ "title": "...", "description": "..." }` creates a ticket.
- `/actuator/health` is exposed for container health checks.

The app supports account registration/login, per-account ticket access, AI chat with authenticated ticket tools, and PDF-grounded answers when an AI model is configured. In the local/free profiles, PDF text is used only for the current request; in the `prod` profile, PDF pages are indexed in PGVector with account-scoped retrieval. PDF deletion and retention controls, an MCP server, and a LangChain4j integration are not included. Change the development database password and configure HTTPS/session-cookie settings before deployment.
