# Server Setup & Configuration Runbook

This document details the manual setup, environment provisioning, Systemd service configurations, and Nginx reverse proxy templates for the three nodes in the CI/CD pipeline:
1. **Monitoring Server**
2. **Jenkins CI/CD Server**
3. **Application Host Server**

---

## 1. Monitoring Server Setup (Observability Stack)

**SSH Command:**
```bash
ssh -i <PATH_TO_SSH_KEY>.pem ubuntu@<MONITORING_SERVER_PUBLIC_IP>
```

### Step 1.1: Install Docker & Docker Compose
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 1.2: Transfer Monitoring Configuration
From the **local machine terminal** (project root):
```bash
scp -i <PATH_TO_SSH_KEY>.pem -r ./monitoring ubuntu@<MONITORING_SERVER_PUBLIC_IP>:/home/ubuntu/
```

### Step 1.3: Start the Observability Stack
On the **Monitoring Server**:
```bash
cd /home/ubuntu/monitoring
docker compose down -v
docker compose up -d
```

### Step 1.4: Verify Containers
```bash
docker compose ps
```
The stack runs four services:
- `otel-collector` (port `4317` gRPC receiver, port `8889` Prometheus exporter)
- `prometheus` (port `9090` metrics store)
- `loki` (port `3100` log ingestion)
- `grafana` (port `3000` dashboard UI)

**Grafana Dashboard:** `http://<MONITORING_SERVER_PUBLIC_IP>:3000` (Default: `admin` / `admin`)

---

## 2. Jenkins Server Setup (CI/CD Orchestration)

**SSH Command:**
```bash
ssh -i <PATH_TO_SSH_KEY>.pem ubuntu@<JENKINS_SERVER_PUBLIC_IP>
```

### Step 2.1: Install OpenJDK 21, Node.js 20 LTS, pnpm, and Utilities
```bash
sudo apt update && sudo apt install -y fontconfig openjdk-21-jre zip unzip git curl

# Install Node.js 20 LTS & pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm
```

### Step 2.2: Install and Start Jenkins
```bash
# Ensure keyrings directory exists
sudo mkdir -p /etc/apt/keyrings

# Add official Jenkins repository signing key
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key

# Add Jenkins repository to apt sources
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install and start Jenkins service
sudo apt update && sudo apt install -y jenkins
sudo systemctl enable --now jenkins
```

### Step 2.3: Retrieve Initial Admin Password
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

---

## 3. Jenkins Web Console Configuration

Open `http://<JENKINS_SERVER_PUBLIC_IP>:8080` in a browser.

### Step 3.1: Unlock & Install Plugins
1. Enter the initial admin password.
2. Choose **"Install suggested plugins"**.
3. Create the admin user profile and save the Jenkins URL.

### Step 3.2: Install Required Plugins
1. Go to: **Manage Jenkins $\to$ Plugins $\to$ Available plugins**.
2. Install:
   - **SSH Agent Plugin** (`ssh-agent`)
   - **Pipeline: Stage View**
3. Restart Jenkins if prompted.

### Step 3.3: Configure Credentials
Navigate to: **Manage Jenkins $\to$ Credentials $\to$ System $\to$ Global credentials (unrestricted) $\to$ Add Credentials**

#### Credential 1: App Server SSH Key
- **Kind:** `SSH Username with private key`
- **ID:** `app-server-ssh-key`
- **Username:** `ubuntu`
- **Private Key:** Select **"Enter directly"** $\to$ **Add** $\to$ Paste the contents of `<PATH_TO_SSH_KEY>.pem`.
- Click **Create**.

#### Credential 2: Clerk Secret Key
- **Kind:** `Secret text`
- **ID:** `clerk-secret-key`
- **Secret:** `<YOUR_CLERK_SECRET_KEY>`
- Click **Create**.

---

### Step 3.4: Create the Pipeline Job
1. Click **"New Item"** on the Jenkins home page.
2. Name: `student-management-cd` $\to$ Select **Pipeline** $\to$ Click **OK**.
3. Under **Build Triggers**:
   - Check **"GitHub hook trigger for GITScm polling"**
4. Under **Pipeline**:
   - **Definition:** `Pipeline script from SCM`
   - **SCM:** `Git`
   - **Repository URL:** `https://github.com/<GITHUB_USERNAME>/<REPOSITORY_NAME>.git`
   - **Credentials:** `- none -` (for public repositories)
   - **Branches to build:** `*/main`
   - **Script Path:** `devops/jenkins/Jenkinsfile`
5. Click **Save**.

---

### Step 3.5: Configure GitHub Webhook for Automated Deployment

1. In the GitHub repository, go to: **Settings $\to$ Webhooks $\to$ Add webhook**.
2. Configure the webhook:
   - **Payload URL:** `http://<JENKINS_SERVER_PUBLIC_IP>:8080/github-webhook/` *(include the trailing slash `/`)*
   - **Content type:** `application/json`
   - **Secret:** *(leave empty)*
   - **Events:** Select **"Just the push event"**
   - **Active:** Checked
3. Click **"Add webhook"**.

---

## 4. App Server Setup (One-Time Preparation)

**SSH Command:**
```bash
ssh -i <PATH_TO_SSH_KEY>.pem ubuntu@<APP_SERVER_PUBLIC_IP>
```

### Step 4.1: Install Node.js 20, Nginx, and Utilities
```bash
sudo apt update && sudo apt install -y nginx unzip curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 4.2: Create Application Directories
```bash
sudo mkdir -p /var/www/student-management/blue /var/www/student-management/green
sudo chown -R ubuntu:ubuntu /var/www/student-management
```

### Step 4.3: Create the Shared Environment File
Create `/var/www/student-management/shared.env`:
```bash
sudo tee /var/www/student-management/shared.env << 'EOF'
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?sslmode=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<YOUR_CLERK_PUBLISHABLE_KEY>
CLERK_SECRET_KEY=sk_test_<YOUR_CLERK_SECRET_KEY>
CLERK_WEBHOOK_SECRET=whsec_<YOUR_CLERK_WEBHOOK_SECRET>
MONITORING_SERVER_PRIVATE_IP=<MONITORING_SERVER_PRIVATE_IP>
LOKI_HOST=http://<MONITORING_SERVER_PRIVATE_IP>:3100
LOG_LEVEL=info
EOF
```

### Step 4.4: Create Systemd Services (Blue & Green)

Create `/etc/systemd/system/student-blue.service` (Port 3000):
```bash
sudo tee /etc/systemd/system/student-blue.service << 'EOF'
[Unit]
Description=NextJS Student Management - Blue Node Engine
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/student-management/blue
EnvironmentFile=/var/www/student-management/shared.env
Environment=PORT=3000
Environment=APP_ENV=blue
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

Create `/etc/systemd/system/student-green.service` (Port 3001):
```bash
sudo tee /etc/systemd/system/student-green.service << 'EOF'
[Unit]
Description=NextJS Student Management - Green Node Engine
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/student-management/green
EnvironmentFile=/var/www/student-management/shared.env
Environment=PORT=3001
Environment=APP_ENV=green
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

Reload and enable both services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable student-blue student-green
```

### Step 4.5: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/blue.conf`:
```bash
sudo tee /etc/nginx/sites-available/blue.conf << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

Create `/etc/nginx/sites-available/green.conf`:
```bash
sudo tee /etc/nginx/sites-available/green.conf << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

Link the initial site configuration and restart Nginx:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/blue.conf /etc/nginx/sites-enabled/student-app
sudo nginx -t && sudo systemctl restart nginx
```

### Step 4.6: Clerk Webhook Endpoint Configuration
In the Clerk Dashboard ($\to$ **Configure** $\to$ **Webhooks** $\to$ **Add Endpoint**):
- **Endpoint URL:** `http://<APP_SERVER_PUBLIC_IP>/api/webhooks/clerk`
- **Subscribed Events:** `user.created`, `user.updated`, `user.deleted`
- **Signing Secret:** `whsec_<YOUR_CLERK_WEBHOOK_SECRET>`

---

## 5. Live Ports and Endpoints Summary

| Service | Target URL / Port | Notes |
| :--- | :--- | :--- |
| **Web Application** | `http://<APP_SERVER_PUBLIC_IP>/` | Student management application |
| **Health Check** | `http://<APP_SERVER_PUBLIC_IP>/api/health` | Health gate queried during deployment |
| **Jenkins Console** | `http://<JENKINS_SERVER_PUBLIC_IP>:8080` | Pipeline execution and logs |
| **Grafana Dashboard** | `http://<MONITORING_SERVER_PUBLIC_IP>:3000` | Observability dashboard for metrics and logs |
| **Prometheus** | `http://<MONITORING_SERVER_PUBLIC_IP>:9090` | Scraper and metrics database |
| **Loki** | `http://<MONITORING_SERVER_PRIVATE_IP>:3100` | Log ingestion stream (internal) |
