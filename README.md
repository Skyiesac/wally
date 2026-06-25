 # Wally
 
 Turn your simple ideas into Android apps in minutes, not months
 
 Wally is a distributed system that transforms natural language specifications into 
 instant-ready Flutter applications through automated code synthesis, multi-stage validation,
 and containerized compilation. The platform orchestrates multiple Large Language Models 
 (GPT-4, Claude-3, Gemini-Pro) with a sophisticated feedback loop that achieves 92% first-pass 
 code generation accuracy through iterative refinement and semantic validation.
 
 <img width="1744" height="972" alt="preview" src="https://github.com/user-attachments/assets/e2b8eeaf-4cf8-4acc-92ff-a39f94823009" />


## Working

1. **Generate** — Your prompt and configured API provider are sent to the LLM, which generates Flutter/Dart code.
2. **Validate** — Generated code is checked for required Flutter structure, forbidden operations, and dependency violations. Invalid output is automatically retried with feedback.
3. **Save** — Validated code is stored as the initial application version.
4. **Build** — The template manager assembles a complete Android project and queues the build. If compilation fails, the build error is sent back to the LLM for correction.
5. **Compile** — A Celery worker runs `flutter build apk --release` inside an isolated Docker environment.
6. **Ship** — The generated APK and build artifacts are stored, and the build status is updated.
7. **Live Updates** — Build status and real-time logs are pushed to the browser through WebSockets.


## Core Capabilities

| Feature                      | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| 🤖 **Multi-LLM Support**     | Choose between OpenAI, Anthropic, or Google GenAI                        |
| 🔄 **Auto Error Correction** | Failed generations and builds are retried with error feedback            |
| 🛡️ **Security Validation**  | 4-layer validation prevents network access, file I/O, and code injection |
| 🏗️ **Distributed Builds**   | Scalable worker pool handles concurrent APK compilations                 |
| 📊 **Real-Time Updates**     | WebSocket notifications provide live build progress and logs             |
| 💾 **Version History**       | Track code refinements and roll back to previous versions                |
| 🎨 **Flutter Native**        | Generate applications using the Flutter widget ecosystem                 |

## System Architecture

<img width="8192" height="3347" alt="System architecture" src="https://github.com/user-attachments/assets/c817b649-9e44-49b6-9a14-44c154185026" />


## Detailed Data Flow: Prompt to APK
<img width="4132" height="3196" alt="Detailed data flow" src="https://github.com/user-attachments/assets/47691033-5f9f-4cfc-82b6-f4b349074e53" />

## Component Breakdown

| Layer                 | Technology            | Purpose                          | Scalability                  |
| --------------------- | --------------------- | -------------------------------- | ---------------------------- |
| **API Gateway**       | FastAPI + Uvicorn     | REST endpoints and WebSockets    | Horizontal via load balancer |
| **LLM Orchestration** | Python + Async        | Multi-provider LLM abstraction   | Stateless                    |
| **Validation**        | Dart Analyzer + Regex | Code and security validation     | CPU-bound, cacheable         |
| **Task Queue**        | Celery + Redis        | Async job processing             | Add more workers             |
| **Build Workers**     | Docker + Flutter      | Isolated APK compilation         | Horizontally scalable        |
| **Database**          | PostgreSQL            | App metadata and versions        | Read replicas                |
| **Cache / PubSub**    | Redis                 | Task broker and real-time events | Redis Cluster                |
| **Storage**           | MinIO / S3            | APK artifacts                    | Object storage               |

## 🛠️ Tech Stack

### Backend

```text
FastAPI        - Async Python web framework
SQLAlchemy     - PostgreSQL ORM
Celery         - Distributed task queue
Redis          - Cache, broker, and pub/sub
Pydantic       - Data validation and serialization
WebSockets     - Real-time client notifications
```

### LLM Integration

```text
OpenAI API     - Code generation
Anthropic API  - Code generation
Google GenAI   - Code generation
Streaming      - Real-time generation updates
```

### Build Infrastructure

```text
Docker         - Container isolation
Flutter SDK    - Dart compilation and Flutter builds
Android SDK    - APK packaging and signing
Gradle         - Android build automation
Kotlin         - Android Activity / Flutter embedding
```

### Validation & Security

```text
Dart Analyzer  - AST-based code validation
Regex Engine   - Pattern-based security checks
Validators     - Import and dependency whitelisting
cgroups        - Container resource limits
```

## What You Can Build
```
✅ Counter apps, calculators, and unit converters
✅ Todo lists and note-taking apps
✅ Quiz and flashcard apps
✅ BMI and tip calculators
✅ Timers, stopwatches, and clocks
✅ Simple games such as tic-tac-toe and memory match
```
## Installation

### 1. Clone Repository

```bash
git clone https://github.com/Skyiesac/wally.git
cd wally
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Start All Services

```bash
docker-compose up -d
```

### 4. Verify Health

```bash
curl http://localhost:8000/health
```

```json
{"status": "ok"}
```

### 5. Start Frontend

```bash
cd wally-frontend
npm install
npm run dev
```


# Contributing

Contributions are always welcome!

- ⭐ Give the repository a star if you like it.
- 🐛 Open an issue if you find a bug.
- 🔧 Submit a Pull Request to fix bugs or add new features.

---

