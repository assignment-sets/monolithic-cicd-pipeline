# Monolithic CI/CD Pipeline

A self-hosted CI/CD pipeline deployed on AWS featuring GitHub Actions quality gates, Jenkins-driven CD, Terraform-provisioned infrastructure, blue-green deployment strategies, and full observability via OpenTelemetry, Prometheus, Grafana, and Loki.

## Architecture & Workflow

This repository contains the infrastructure and deployment configurations for an automated software delivery pipeline. A Next.js application serves as the deployment workload to validate the pipeline functionality.

```
 Pull Request / Push to main
              │
              ▼
   ┌─────────────────────┐
   │ GitHub Actions (CI) │  Install Dependencies ➔ Generate Prisma Client ➔ Lint ➔ Unit Tests
   └──────────┬──────────┘
              │ Merge to Main
              ▼
   ┌─────────────────────┐
   │    Jenkins (CD)     │  Build Next.js ➔ Package Standalone Bundle ➔ Transfer via SSH
   └──────────┬──────────┘
              │ SSH Deployment Execution
              ▼
   ┌───────────────────────────────┐
   │  App Server (Blue ⇄ Green)    │  Deploy to Idle Target ➔ Health Check
   │  Nginx Reverse Proxy          │  Cutover: Update Symlink ➔ Reload Nginx
   └──────────┬────────────────────┘
              │ Metrics & Logs Export
              ▼
   ┌─────────────────────────────────┐
   │        Monitoring Server        │  OpenTelemetry Collector ➔ Prometheus & Loki ➔ Grafana
   └─────────────────────────────────┘
```

## Features

- **CI Quality Gate:** Automates dependency installation, Prisma client generation, linting, and unit execution via GitHub Actions on every push or pull request.
- **Automated CD Pipeline:** Orchestrates artifact builds, standalone packaging, and secure target transport via Jenkins pipelines.
- **Blue-Green Deployment:** Achieves zero-downtime cutovers utilizing dual target environments fronted by an Nginx reverse proxy with automated pre-cutover health checks and instant rollback capability.
- **Infrastructure as Code (IaC):** Provisions all cloud resources deterministically using Terraform.
- **Centralized Observability:** Aggregates system metrics and logs using an OpenTelemetry Collector routing to Prometheus (metrics) and Loki (logs), visualized through unified Grafana dashboards.

## Infrastructure Architecture

The infrastructure is provisioned via Terraform across three AWS EC2 instances within a dedicated VPC:

| Server         | Instance Type | Purpose                                                                |
| :------------- | :------------ | :--------------------------------------------------------------------- |
| **Jenkins**    | `t3a.medium`  | Orchestrates builds & deployment pipelines.                            |
| **App Server** | `t3a.small`   | Hosts active and idle application environments behind Nginx.           |
| **Monitoring** | `t3a.small`   | Runs the OpenTelemetry Collector, Prometheus, Grafana, and Loki stack. |

## Repository Structure

```text
.
├── .github/       # GitHub Actions workflow configurations (CI)
├── infra/         # Terraform configurations for AWS infrastructure
├── devops/        # Jenkinsfile pipelines and Nginx configurations
├── monitoring/    # Docker Compose stacks for Prometheus, Grafana, Loki, and OTel
└── config/        # Systemd unit files for active/idle application services
```

| Path                 | Component Description                                                                   |
| :------------------- | :-------------------------------------------------------------------------------------- |
| `.github/workflows/` | CI workflow definitions (linting, code generation, testing).                            |
| `infra/terraform/`   | Provisioning manifests for EC2 instances, security groups, networking, and key pairs.   |
| `devops/jenkins/`    | `Jenkinsfile` logic mapping environment detection, deployment, and cutover stages.      |
| `devops/nginx/`      | Reverse proxy routing and site configurations (`blue.conf` / `green.conf`).             |
| `monitoring/`        | Docker Compose files and configuration schemas for OTel, Prometheus, Loki, and Grafana. |
| `config/systemd/`    | Service unit configurations (`student-blue.service` / `student-green.service`).         |

## Technical Stack

- **CI/CD:** GitHub Actions, Jenkins
- **Infrastructure as Code:** Terraform, AWS (VPC, EC2, Security Groups)
- **Deployment & Web Server:** Nginx, Systemd
- **Deployment Strategy:** Blue-Green
- **Observability:** OpenTelemetry Collector, Prometheus, Grafana, Loki
- **Target Workload:** Next.js, Prisma, PostgreSQL

### Pipeline Speed & Deployment Duration

- **Cycle Duration:** *TBD / Pending benchmark measurement during live pipeline run.*

### Quality Gates & Test Coverage

- **Enforced Quality Gates:**
  - **Prisma Schema Validation:** `pnpm prisma generate`
  - **Static Code Analysis:** `pnpm run lint` (ESLint 9)
  - **Automated Unit & Integration Tests:** `pnpm run test:run` (Vitest test suites verifying UI components, role authorization middleware, and core utilities)
- **Code Coverage Target:** *TBD / Pending coverage threshold reporting.*

### Deployment Strategy & Uptime

- **Strategy:** Zero-Downtime Blue-Green Deployment using dual Systemd units (`student-blue.service` on port 3000 and `student-green.service` on port 3001) fronted by an Nginx reverse proxy.
- **Availability Target:** **100% Uptime (0s dropped requests)**.
- **Verification Gate:** Pre-cutover health check probe queries `/api/health` before updating traffic routing.
- **Cutover Mechanism:** Atomic symlink swap (`/etc/nginx/sites-enabled/student-app` $\to$ `/etc/nginx/sites-available/[blue|green].conf`) followed by a graceful `systemctl reload nginx` (no worker drops).

### Cloud Footprint & Provisioning

- **Cloud Provider & Region:** AWS (`ap-south-1`) provisioned entirely via Terraform.
- **Managed Compute Nodes (3 EC2 Instances):**
  - **Jenkins Server:** `t3a.medium` (20 GB gp3 volume) — Builds and orchestrates CD cutover.
  - **App Server:** `t3a.small` (10 GB gp3 volume) — Hosts Blue/Green application instances and Nginx reverse proxy.
  - **Monitoring Server:** `t3a.small` (20 GB gp3 volume) — Hosts the Docker Compose observability stack.
- **Network & Perimeter:** Custom security group (`pipeline-shared-security-group`) allowing open internal node-to-node communication, SSH restricted to deployer IP, and public access to ports 80 (App), 8080 (Jenkins UI), and 3000 (Grafana).
- **Key Management:** Auto-generated 4096-bit RSA key pair (`tls_private_key`) output as local `.pem` credential.

### Observability Scope

- **Metrics (Prometheus & OpenTelemetry Collector):**
  - Request throughput (requests/sec)
  - Latency distributions ($p95$ and $p99$ response times)
  - Error rate tracking (HTTP 4xx and 5xx response codes)
  - Node process and runtime health
- **Logs (Loki & Pino):**
  - Structured JSON application logs streamed in real-time via `pino-loki`
  - Request paths, HTTP methods, and status codes
  - Exception and database transaction failure stack traces
- **Visualization (Grafana):**
  - Unified dashboards combining Prometheus time-series metrics with synchronized Loki log panels for correlated root-cause analysis.

