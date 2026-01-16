# Deployment Guide

## Overview

Target Tracker is deployed on Vercel with MongoDB Atlas as the database backend. This guide covers the full deployment process from scratch.

**Live Production URL**: https://target-tracker-rho.vercel.app

## Prerequisites

- Vercel account (free tier works)
- MongoDB Atlas account (M0 free tier)
- Node.js 18+ installed locally
- Git repository on GitHub

## Initial Setup

### 1. MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com and sign up/login
2. Create a new cluster:
   - Click "Build a Database"
   - Select **M0 FREE** tier
   - Choose a cloud provider (AWS recommended)
   - Select region closest to your Vercel deployment region
   - Name: `target-tracker-cluster`

3. Create Database User:
   - Navigate to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Authentication Method: Password
   - Create username and secure password (save these!)
   - Privileges: "Read and write to any database"

4. Configure Network Access:
   - Navigate to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
   - This is required for Vercel's serverless functions

5. Get Connection String:
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: Node.js
   - Copy the connection string
   - Replace `<username>` and `<password>` with your credentials
   - Add database name: `mongodb+srv://user:pass@cluster.mongodb.net/target-tracker?retryWrites=true&w=majority`

### 2. Vercel Setup

#### Install Vercel CLI

```bash
npm install -g vercel
```

#### Authenticate

```bash
vercel login
```

Follow the browser prompt to authenticate.

#### Link Project

```bash
cd /path/to/target-tracker
vercel link
```

- When prompted about existing project: **No** (create new)
- Project name: `target-tracker` (or your choice)
- Code directory: `./`

This creates a `.vercel` directory with project config.

#### Add Environment Variables

```bash
# Add to production
echo "your-mongodb-connection-string" | vercel env add MONGODB_URI production

# Add to preview (for branch deployments)
echo "your-mongodb-connection-string" | vercel env add MONGODB_URI preview

# Add to development (optional, for vercel dev)
echo "your-mongodb-connection-string" | vercel env add MONGODB_URI development
```

Verify:
```bash
vercel env ls
```

### 3. Deploy

```bash
vercel --prod
```

This will:
- Build your Next.js app
- Run TypeScript checks
- Upload to Vercel
- Deploy to production
- Output your live URL

## GitHub Integration

### Automatic Deployments

Once linked to GitHub (done automatically during `vercel link` if repo exists):

- **Push to `main`** → Automatic production deployment
- **Push to other branches** → Automatic preview deployment
- **Pull requests** → Preview deployment with URL in PR comments

### Manual GitHub Connection

If not auto-connected:

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Git
4. Click "Connect Git Repository"
5. Select GitHub → Choose `rustafied/target-tracker` repo

## Database Migration

### Migrate Local Data to Atlas

If you have existing local MongoDB data:

```bash
# Export from local
mongodump --uri="mongodb://localhost:27017/target-tracker" --out=./backup

# Import to Atlas
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/target-tracker" --drop ./backup/target-tracker

# Cleanup
rm -rf ./backup
```

Verify migration:
```bash
mongosh "your-atlas-connection-string" --eval "db.getCollectionNames()"
```

## Local Development with Atlas

Update your `.env.local`:

```bash
# Use Atlas for development too
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/target-tracker?retryWrites=true&w=majority
```

Or keep local MongoDB for dev:
```bash
# Local development
MONGODB_URI=mongodb://localhost:27017/target-tracker
```

## Deployment Commands

### Deploy to Production

```bash
vercel --prod
```

### Deploy to Preview

```bash
vercel
```

### View Logs

```bash
vercel logs https://your-deployment-url.vercel.app
```

### Redeploy

```bash
vercel redeploy https://your-deployment-url.vercel.app --prod
```

### Inspect Deployment

```bash
vercel inspect https://your-deployment-url.vercel.app
```

### List Deployments

```bash
vercel ls
```

## Environment Variables

### Add New Variable

```bash
vercel env add VARIABLE_NAME production
```

### Pull Variables to Local

```bash
vercel env pull .env.local
```

This syncs Vercel environment variables to your local `.env.local`.

### Update Variable

Remove and re-add:
```bash
vercel env rm MONGODB_URI production
vercel env add MONGODB_URI production
```

## Troubleshooting

### Build Failures

**TypeScript Errors:**
```bash
# Test build locally first
npm run build
```

Fix any TypeScript errors before deploying.

**View Build Logs:**
```bash
vercel logs https://your-deployment-url.vercel.app
```

### MongoDB Connection Issues

**Check Environment Variables:**
```bash
vercel env ls
```

**Common Issues:**
- IP not whitelisted (use 0.0.0.0/0 for Vercel)
- Wrong credentials in connection string
- Database name missing from connection string
- Network Access not configured in Atlas

**Test Connection Locally:**
```bash
mongosh "your-connection-string"
```

### Deployment Not Updating

**Force Redeploy:**
```bash
# Trigger empty commit
git commit --allow-empty -m "trigger deploy"
git push origin main
```

**Clear Build Cache:**
```bash
vercel --prod --force
```

## Production Best Practices

### Security
- ✅ Use environment variables for secrets (never commit connection strings)
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use strong database passwords
- ✅ Consider restricting MongoDB IP whitelist in production

### Performance
- ✅ MongoDB connection pooling is handled automatically by Mongoose
- ✅ Vercel Edge Network provides global CDN
- ✅ Static pages are pre-rendered at build time
- ✅ API routes run as serverless functions

### Monitoring
- View deployment logs in Vercel dashboard
- Monitor MongoDB Atlas metrics for database performance
- Set up Vercel Analytics for traffic insights (optional)

## Updating the App

### Standard Workflow

1. Make changes locally
2. Test locally: `npm run dev`
3. Test build: `npm run build`
4. Commit changes: `git commit -am "your message"`
5. Push to GitHub: `git push origin main`
6. Vercel automatically deploys

### Manual Deploy

If you need to deploy without pushing to GitHub:

```bash
vercel --prod
```

## Rollback

If a deployment breaks something:

1. Go to Vercel dashboard
2. Find the previous working deployment
3. Click "Promote to Production"

Or via CLI:
```bash
# List deployments
vercel ls

# Promote a specific deployment
vercel promote https://target-tracker-abc123.vercel.app
```

## Custom Domain (Optional)

Add a custom domain in Vercel dashboard:

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

## Cost

- **Vercel Pro Plan**: $20/month (included in your plan)
  - Unlimited bandwidth
  - Commercial use
  - Advanced analytics
  
- **MongoDB Atlas M0**: Free
  - 512 MB storage
  - Shared CPU
  - Perfect for MVP/small apps

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Next.js Deployment**: https://nextjs.org/docs/deployment

