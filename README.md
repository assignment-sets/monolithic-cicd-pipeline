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
| **App Server** | `t3a.micro`   | Hosts active and idle application environments behind Nginx.           |
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
