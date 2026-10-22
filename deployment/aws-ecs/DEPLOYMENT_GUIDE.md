# Netflix Clone - Complete AWS ECS (Fargate) & ECR Deployment Guide

This guide provides end-to-end instructions for deploying the **Netflix Clone** application to **Amazon Web Services (AWS)** using **Amazon Elastic Container Registry (ECR)** and **Amazon Elastic Container Service (ECS)** on **AWS Fargate** (serverless containers).

---

## Architecture Overview

```
                      Internet
                         │
                         ▼
           ┌───────────────────────────┐
           │ Application Load Balancer │
           │          (ALB)            │
           │        Port 80/443        │
           └──────┬─────────────┬──────┘
                  │             │
   Path: /api/*   │             │ Path: /* (default)
                  ▼             ▼
      ┌────────────────┐   ┌─────────────────┐
      │ Backend Target │   │ Frontend Target │
      │  Group (8000)  │   │   Group (80)    │
      └───────┬────────┘   └────────┬────────┘
              │                     │
              ▼                     ▼
      ┌────────────────┐   ┌─────────────────┐
      │  ECS Service   │   │   ECS Service   │
      │netflix-backend │   │netflix-frontend │
      │ (Fargate Task) │   │ (Fargate Task)  │
      └───────┬────────┘   └─────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
AWS RDS PostgreSQL   AWS S3 Bucket
  (Database)        (Video Uploads)
```

- **Frontend Service**: React SPA built with Vite and served by Nginx on port 80.
- **Backend Service**: Node.js & Express REST API server running on port 8000.
- **Application Load Balancer (ALB)**: Provides a single DNS endpoint, handles SSL termination, and routes `/api/*` directly to the Backend and `/*` to the Frontend (eliminating CORS and extra proxy hops).
- **AWS S3**: Stores and streams custom uploaded video files with HTTP 206 range request support.
- **AWS RDS PostgreSQL**: Stores user accounts, watch history, bookmarks, and video metadata.

---

## Prerequisites

1. **AWS Account & IAM Permissions**: Full access to ECS, ECR, EC2/VPC, IAM, and Systems Manager.
2. **AWS CLI v2 installed & configured**:
   ```bash
   aws configure
   # Enter AWS Access Key, Secret Key, default region (e.g., us-east-1), output json
   ```
3. **Docker Engine / Docker Desktop** installed and running on your local machine.
4. **Existing AWS Resources** (from previous setup):
   - **AWS RDS PostgreSQL** database instance and connection details.
   - **AWS S3 Bucket** for video storage.

---

## Step 1: Create Amazon ECR Repositories

Create two repositories in Amazon ECR—one for the backend and one for the frontend:

```bash
# Set your AWS variables
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR Repositories
aws ecr create-repository \
  --repository-name netflix-backend \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION

aws ecr create-repository \
  --repository-name netflix-frontend \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION
```

*(On Windows PowerShell):*
```powershell
$AWS_REGION = "us-east-1"
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text).Trim()

aws ecr create-repository --repository-name netflix-backend --image-scanning-configuration scanOnPush=true --region $AWS_REGION
aws ecr create-repository --repository-name netflix-frontend --image-scanning-configuration scanOnPush=true --region $AWS_REGION
```

---

## Step 2: Build & Push Docker Images to ECR

You can use the automated script in this repo:

### On Windows PowerShell:
```powershell
.\aws-ecs\ecr-build-and-push.ps1 -AwsAccountId $AWS_ACCOUNT_ID -AwsRegion $AWS_REGION
```

### On Linux / macOS / WSL:
```bash
chmod +x ./aws-ecs/ecr-build-and-push.sh
./aws-ecs/ecr-build-and-push.sh $AWS_ACCOUNT_ID $AWS_REGION
```

### Or manually step-by-step:
```bash
# 1. Log in to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 2. Build and push backend
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/netflix-backend:latest ./backend
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/netflix-backend:latest

# 3. Build and push frontend (Pass VITE_GOOGLE_CLIENT_ID if using Google Login)
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/netflix-frontend:latest ./frontend
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/netflix-frontend:latest
```

---

## Step 3: Configure IAM Roles

ECS Fargate tasks need two distinct IAM roles:

### 1. ECS Task Execution Role (`ecsTaskExecutionRole`)
Allows ECS agent to pull images from ECR, push container logs to CloudWatch, and retrieve secrets from AWS Systems Manager Parameter Store.

```bash
# 1. Create Trust Policy
cat << 'EOF' > /tmp/ecs-trust.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# 2. Create the Execution Role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-trust.json

# 3. Attach default managed execution policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# 4. Attach SSM Parameter Store access policy (allows container to fetch secrets)
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ECSSecretsAccess \
  --policy-document file://aws-ecs/iam-task-execution-role-policy.json
```

### 2. ECS Task Role (`netflixTaskRole`)
Allows the application code running inside the container to interact with AWS S3 without hardcoding static AWS Access Keys.

```bash
# 1. Create the Task Role
aws iam create-role \
  --role-name netflixTaskRole \
  --assume-role-policy-document file:///tmp/ecs-trust.json

# 2. Attach S3 access policy
aws iam put-role-policy \
  --role-name netflixTaskRole \
  --policy-name NetflixS3Access \
  --policy-document file://aws-ecs/iam-task-role-policy.json
```

---

## Step 4: Store Secrets in AWS Systems Manager Parameter Store

Store sensitive application credentials securely in AWS SSM Parameter Store:

```bash
aws ssm put-parameter --name "/netflix/JWT_SECRET" --type "SecureString" --value "your_jwt_secret_key" --overwrite
aws ssm put-parameter --name "/netflix/DATABASE_URL" --type "SecureString" --value "postgresql://user:password@rds-host:5432/netflix_db?sslmode=require" --overwrite
aws ssm put-parameter --name "/netflix/DB_HOST" --type "String" --value "your-rds-endpoint.rds.amazonaws.com" --overwrite
aws ssm put-parameter --name "/netflix/DB_USER" --type "String" --value "postgres" --overwrite
aws ssm put-parameter --name "/netflix/DB_PASSWORD" --type "SecureString" --value "your_db_password" --overwrite
aws ssm put-parameter --name "/netflix/DB_NAME" --type "String" --value "netflix_db" --overwrite
aws ssm put-parameter --name "/netflix/TMDB_API_KEY" --type "SecureString" --value "your_tmdb_api_key" --overwrite
aws ssm put-parameter --name "/netflix/SMTP_PASS" --type "SecureString" --value "your_smtp_app_password" --overwrite
```

---

## Step 5: Networking & Security Groups (VPC)

Identify your VPC and public subnets:
```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Get Subnet IDs (need at least 2 in different AZs for ALB)
SUBNET_1=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[0].SubnetId" --output text)
SUBNET_2=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[1].SubnetId" --output text)
```

### 1. ALB Security Group (`alb-sg`)
Allows inbound HTTP (port 80) and HTTPS (port 443) from anywhere (`0.0.0.0/0`):
```bash
ALB_SG=$(aws ec2 create-security-group \
  --group-name netflix-alb-sg \
  --description "Security Group for Netflix ALB" \
  --vpc-id $VPC_ID --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 2. ECS Tasks Security Group (`ecs-tasks-sg`)
Allows inbound traffic on port 80 (Frontend) and port 8000 (Backend) **only from the ALB Security Group**:
```bash
ECS_SG=$(aws ec2 create-security-group \
  --group-name netflix-ecs-tasks-sg \
  --description "Security Group for Netflix ECS Tasks" \
  --vpc-id $VPC_ID --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 80 --source-group $ALB_SG
aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 8000 --source-group $ALB_SG
```

### 3. Update RDS PostgreSQL Security Group
Ensure your RDS PostgreSQL security group allows inbound traffic on port 5432 from `$ECS_SG`:
```bash
# Add rule to your RDS security group (replace RDS_SG_ID with your RDS security group ID)
aws ec2 authorize-security-group-ingress --group-id <RDS_SG_ID> --protocol tcp --port 5432 --source-group $ECS_SG
```

---

## Step 6: Application Load Balancer (ALB) & Target Groups

### 1. Create Target Groups
```bash
# Frontend Target Group (Port 80, Health Check path /)
FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
  --name netflix-frontend-tg \
  --protocol HTTP \
  --port 80 \
  --target-type ip \
  --vpc-id $VPC_ID \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query "TargetGroups[0].TargetGroupArn" --output text)

# Backend Target Group (Port 8000, Health Check path /api/health)
BACKEND_TG_ARN=$(aws elbv2 create-target-group \
  --name netflix-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --target-type ip \
  --vpc-id $VPC_ID \
  --health-check-path "/api/health" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query "TargetGroups[0].TargetGroupArn" --output text)
```

### 2. Create Application Load Balancer
```bash
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name netflix-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query "LoadBalancers[0].DNSName" --output text)
echo "ALB DNS: http://$ALB_DNS"
```

### 3. Create HTTP Listener & Routing Rules
```bash
# Default Listener Rule: Forwards everything (/*) to Frontend
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
  --query "Listeners[0].ListenerArn" --output text)

# Path Rule: Forwards /api/* to Backend Target Group
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN
```

---

## Step 7: Register ECS Task Definitions

1. Update the placeholder values (`<AWS_ACCOUNT_ID>`, `<AWS_REGION>`, `<YOUR_S3_BUCKET_NAME>`, `<YOUR_ALB_DNS_NAME>`) in:
   - `aws-ecs/task-def-backend.json`
   - `aws-ecs/task-def-frontend.json`

2. Register the Task Definitions:
```bash
aws ecs register-task-definition --cli-input-json file://aws-ecs/task-def-backend.json
aws ecs register-task-definition --cli-input-json file://aws-ecs/task-def-frontend.json
```

---

## Step 8: Create ECS Cluster & Services

### 1. Create ECS Cluster
```bash
aws ecs create-cluster --cluster-name netflix-cluster
```

### 2. Create Backend Service
```bash
aws ecs create-service \
  --cluster netflix-cluster \
  --service-name netflix-backend-service \
  --task-definition netflix-backend \
  --launch-type FARGATE \
  --desired-count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$BACKEND_TG_ARN,containerName=netflix-backend,containerPort=8000"
```

### 3. Create Frontend Service
```bash
aws ecs create-service \
  --cluster netflix-cluster \
  --service-name netflix-frontend-service \
  --task-definition netflix-frontend \
  --launch-type FARGATE \
  --desired-count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$FRONTEND_TG_ARN,containerName=netflix-frontend,containerPort=80"
```

---

## Step 9: Verification & Smoke Testing

Wait 1–2 minutes for Fargate tasks to initialize and pass ALB health checks:

1. **Verify Backend Health**:
   ```bash
   curl -I http://$ALB_DNS/api/health
   # Expected: HTTP/1.1 200 OK
   # Content: {"status":"ok","uptime":...}
   ```

2. **Verify Database Connectivity**:
   ```bash
   curl http://$ALB_DNS/api/v1/custom-videos
   # Expected: HTTP/1.1 200 OK with list of videos from PostgreSQL
   ```

3. **Verify Frontend SPA in Browser**:
   Open `http://<ALB-DNS-NAME>` in your browser:
   - Check Netflix landing page loads.
   - Test user login / signup.
   - Test custom video upload and streaming (verifying S3 presigned / Range streams).

---

## Maintenance & Continuous Deployment (CI/CD)

Whenever you push code updates, deploy new versions with zero downtime:

```bash
# 1. Build and push new image to ECR
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/netflix-backend:latest ./backend
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/netflix-backend:latest

# 2. Trigger ECS rolling update
aws ecs update-service \
  --cluster netflix-cluster \
  --service netflix-backend-service \
  --force-new-deployment
```
ECS will automatically launch new healthy tasks before terminating old ones.
