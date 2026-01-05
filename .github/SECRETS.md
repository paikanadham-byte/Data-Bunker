# GitHub Secrets Configuration Guide

This document describes the required GitHub Secrets for CI/CD workflows.

## Required Secrets

### API Keys (Required for Backend)
- `COMPANIES_HOUSE_API_KEY` - Companies House API key
- `OPENCORPORATES_API_KEY` - OpenCorporates API key (optional)

### Database (Required if using PostgreSQL)
- `DATABASE_URL` - Full PostgreSQL connection string
- `DATABASE_PASSWORD` - PostgreSQL password

### Backend Configuration
- `BACKEND_PORT` - Backend port (default: 5000)
- `BACKEND_URL` - Full backend URL for health checks
- `CORS_ORIGIN` - Allowed CORS origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window

### Frontend Configuration
- `REACT_APP_API_URL` - Backend API URL for frontend

## Deployment Secrets (Choose your platform)

### Option 1: SSH Deployment
- `SSH_HOST` - Server hostname/IP
- `SSH_USERNAME` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key
- `SSH_PORT` - SSH port (default: 22)
- `DEPLOY_PATH` - Deployment path on server

### Option 2: Docker Hub
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password/token

### Option 3: Vercel
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Option 4: Netlify
- `NETLIFY_AUTH_TOKEN` - Netlify authentication token
- `NETLIFY_SITE_ID` - Netlify site ID

### Option 5: AWS S3
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)

## Optional Secrets

### Notifications
- `SLACK_WEBHOOK` - Slack webhook URL for deployment notifications

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

## Environment-Specific Secrets

For production deployments, you can also configure environment-specific secrets:

1. Go to **Settings** → **Environments**
2. Create a new environment named `production`
3. Add protection rules (require reviewers, wait timer, etc.)
4. Add environment-specific secrets

## Security Best Practices

✅ **DO:**
- Rotate secrets regularly
- Use environment-specific secrets for production
- Enable environment protection rules
- Use least privilege access
- Monitor secret usage in workflow logs

❌ **DON'T:**
- Commit secrets to repository
- Share secrets in plain text
- Use same secrets across environments
- Log secret values in workflows
- Use weak or default passwords

## Testing Secrets Locally

For local testing, create a `.env` file (never commit this):

```bash
# Backend
PORT=5000
NODE_ENV=development
COMPANIES_HOUSE_API_KEY=your_key_here
OPENCORPORATES_API_KEY=your_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/databunker

# Frontend
REACT_APP_API_URL=http://localhost:5000
```

## Verification

After adding secrets, test them by:
1. Creating a pull request
2. Checking CI workflow runs successfully
3. Merging to main
4. Verifying production deployment works

## Need Help?

- [GitHub Encrypted Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
