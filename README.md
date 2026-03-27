# InvoiceHive

> SaaS Invoice & Payment Tool for Freelancers — built with microservices, Docker, Stripe, and full CI/CD.

## Architecture

```
Browser
   │
   ▼
Nginx (port 80/443) ← API Gateway
   ├── /auth/*          → Auth Service       (3001) → MongoDB + Redis
   ├── /clients/*       → Client Service     (3002) → MongoDB
   ├── /invoices/*      → Invoice Service    (3003) → MongoDB + MinIO + RabbitMQ
   ├── /payments/*      → Payment Service    (3004) → MongoDB + Stripe + RabbitMQ
   └── frontend/*       → Next.js App        (3000)
                                                  ↓
                                    Notification Service (3005)
                                    RabbitMQ consumer → Nodemailer
```

## Services

| Service | Port | Tech | Purpose |
|---|---|---|---|
| Auth | 3001 | Node + Redis | JWT, OAuth (Google, GitHub) |
| Client | 3002 | Node + MongoDB | Manage freelancer's clients |
| Invoice | 3003 | Node + Puppeteer + MinIO | Create invoices, generate PDFs |
| Payment | 3004 | Node + Stripe | Payment Links, webhook listener |
| Notification | 3005 | Node + Nodemailer | Email all events via RabbitMQ |
| Frontend | 3000 | Next.js | Dashboard UI |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/invoicehive.git
cd invoicehive

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env — add Stripe keys, SMTP credentials, OAuth secrets

# 3. Start everything
docker compose up --build

# 4. Visit
# Dashboard:        http://localhost:3000
# API Gateway:      http://localhost:80
# RabbitMQ UI:      http://localhost:15672 (guest/guest)
# MinIO Console:    http://localhost:9001  (minioadmin/minioadmin)
```

## GitHub Secrets (for CI/CD)

Add these in: GitHub repo → Settings → Secrets → Actions

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Your Docker Hub password |
| `EC2_HOST` | EC2 public IP or domain |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` private key file |
| `STRIPE_TEST_SECRET_KEY` | Stripe test secret key (for CI tests) |
| `STRIPE_TEST_WEBHOOK_SECRET` | Stripe test webhook secret |

## EC2 Deployment

```bash
# 1. SSH into fresh Ubuntu 22.04 EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Run setup script
chmod +x setup-ec2.sh && ./setup-ec2.sh

# 3. Copy .env to server
scp -i your-key.pem .env ubuntu@your-ec2-ip:~/invoicehive/.env

# 4. Set up SSL
sudo certbot certonly --standalone -d api.yourdomain.com -d yourdomain.com

# 5. Push to main → GitHub Actions deploys automatically
git push origin main
```

## CI/CD Pipeline

```
git push to main
      │
      ▼
ci.yml — Lint + Test (all services in parallel)
      │
      ▼ (on success)
deploy.yml
  ├── Build Docker images (matrix: 6 services)
  ├── Push to Docker Hub (with layer caching)
  ├── SSH into EC2
  │     ├── docker compose pull
  │     ├── docker compose up -d
  │     └── docker image prune -f
  └── Health check: GET /health → 200 OK
```

## Project Structure

```
invoicehive/
├── services/
│   ├── auth-service/
│   ├── client-service/
│   ├── invoice-service/
│   ├── payment-service/
│   └── notification-service/
├── client/                    ← Next.js frontend
├── gateway/
│   └── nginx/
│       ├── nginx.conf
│       └── Dockerfile
├── .github/
│   └── workflows/
│       ├── ci.yml             ← lint + test on every push
│       └── deploy.yml         ← build + push + deploy on main
├── docker-compose.yml         ← local dev
├── docker-compose.prod.yml    ← production (uses Docker Hub images)
├── .env.example
├── .gitignore
└── setup-ec2.sh               ← one-time server setup
```
