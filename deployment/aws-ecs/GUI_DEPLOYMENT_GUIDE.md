# Netflix Clone - Streamlined AWS ECS (Fargate) & ECR GUI Guide
*(Zero AWS RDS & Zero AWS S3 Requirement - 100% Self-Contained Deployment)*

This guide walks you step-by-step through deploying the **Netflix Clone** on **AWS ECS Fargate** and **AWS ECR** using the **AWS Management Console (Web UI)**.

> **Key Feature of this Deployment**:
> - **No AWS RDS Database to configure or pay for**: An internal, zero-cost PostgreSQL container runs automatically inside the backend Fargate task.
> - **No AWS S3 Bucket or S3 IAM roles needed**: Media handling automatically uses local container storage.
> - **No SSM Parameter Store configuration needed**: All configuration is passed directly into the task definition.
> - **Zero Code Changes**: The application code is not modified.

---

## Table of Contents
1. [Step 1: Create Repositories in Amazon ECR](#step-1-create-repositories-in-amazon-ecr)
2. [Step 2: Build & Push Images using Console Push Commands](#step-2-build--push-images-using-console-push-commands)
3. [Step 3: Create the ECS Execution Role in IAM](#step-3-create-the-ecs-execution-role-in-iam)
4. [Step 4: Configure Security Groups in EC2](#step-4-configure-security-groups-in-ec2)
5. [Step 5: Create Target Groups & Application Load Balancer](#step-5-create-target-groups--application-load-balancer)
6. [Step 6: Register Task Definitions in ECS Console](#step-6-register-task-definitions-in-ecs-console)
7. [Step 7: Create ECS Cluster & Launch Services](#step-7-create-ecs-cluster--launch-services)
8. [Step 8: Verify in Browser](#step-8-verify-in-browser)

---

## Step 1: Create Repositories in Amazon ECR

1. Open the [AWS Management Console](https://console.aws.amazon.com/) and check your region in the top right (e.g., **US East (N. Virginia) `us-east-1`**).
2. In the top search bar, search for **ECR** and click **Elastic Container Registry**.
3. Click the orange **Create repository** button.
4. **Backend Repository**:
   - Visibility: **Private**
   - Repository name: `netflix-backend`
   - Image scan settings: Toggle **Scan on push** to **ON**
   - Click **Create repository**
5. **Frontend Repository**:
   - Click **Create repository** again
   - Visibility: **Private**
   - Repository name: `netflix-frontend`
   - Image scan settings: Toggle **Scan on push** to **ON**
   - Click **Create repository**

---

## Step 2: Build & Push Images using Console Push Commands

1. In the ECR Repositories list, click **`netflix-backend`**.
2. Click the **View push commands** button in the top right.
3. Open PowerShell or Terminal in your project directory and run the 4 commands shown in the popup.
4. Repeat for **`netflix-frontend`** (build context `./frontend`).

*(Quick One-Liner Alternative in Windows PowerShell)*:
```powershell
.\aws-ecs\ecr-build-and-push.ps1 -AwsAccountId "<YOUR_ACCOUNT_ID>" -AwsRegion "us-east-1"
```
Once pushed, refresh the ECR page to confirm both repositories have an image tagged `latest`.

---

## Step 3: Create the ECS Execution Role in IAM

Only one standard execution role is needed:

1. Search **IAM** in top search bar -> click **IAM**.
2. In the left navigation, click **Roles** -> click **Create role**.
3. **Select trusted entity**:
   - Trusted entity type: **AWS service**
   - Use case: **Elastic Container Service** -> select **Elastic Container Service Task** -> click **Next**.
4. **Add permissions**:
   - Search for `AmazonECSTaskExecutionRolePolicy` and check its checkbox.
   - Click **Next**.
5. **Name and create**:
   - Role name: `ecsTaskExecutionRole`
   - Click **Create role**.

---

## Step 4: Configure Security Groups in EC2

1. Search **EC2** in top search bar -> click **EC2**.
2. In left navigation under *Network & Security*, click **Security Groups**.

### 4.1 Create ALB Security Group (`netflix-alb-sg`)
1. Click **Create security group**.
2. Name: `netflix-alb-sg`.
3. Description: `Allows public HTTP traffic to ALB`.
4. VPC: Select default VPC.
5. Inbound rules:
   - Click **Add rule**: Type `HTTP`, Port `80`, Source `Anywhere-IPv4` (`0.0.0.0/0`).
6. Click **Create security group**.

### 4.2 Create ECS Tasks Security Group (`netflix-ecs-tasks-sg`)
1. Click **Create security group**.
2. Name: `netflix-ecs-tasks-sg`.
3. Description: `Allows traffic to containers strictly from ALB`.
4. Inbound rules:
   - Click **Add rule**: Type `Custom TCP`, Port `80`, Source: Select **Custom** -> choose `netflix-alb-sg`.
   - Click **Add rule**: Type `Custom TCP`, Port `8000`, Source: Select **Custom** -> choose `netflix-alb-sg`.
5. Click **Create security group**.

---

## Step 5: Create Target Groups & Application Load Balancer

### 5.1 Create Target Groups
In EC2 Console left sidebar under *Load Balancing*, click **Target Groups** -> click **Create target group**.

#### 1. Frontend Target Group (`netflix-frontend-tg`):
- Target type: **IP addresses** *(Required for Fargate)*.
- Target group name: `netflix-frontend-tg`.
- Protocol: `HTTP` | Port: `80`.
- Health check path: `/`.
- Click **Next**.
- **Important**: On the "Register targets" screen, **do NOT add any IP addresses**. Leave Targets empty! (ECS registers them automatically).
- Click **Create target group**.

#### 2. Backend Target Group (`netflix-backend-tg`):
- Click **Create target group** again.
- Target type: **IP addresses**.
- Target group name: `netflix-backend-tg`.
- Protocol: `HTTP` | Port: `8000`.
- Health check path: `/api/health`.
- Click **Next** -> Leave targets empty -> Click **Create target group**.

---

### 5.2 Create the Application Load Balancer (`netflix-alb`)
1. In EC2 Console left sidebar, click **Load Balancers** -> click **Create load balancer**.
2. Under **Application Load Balancer**, click **Create**.
3. **Basic configuration**:
   - Name: `netflix-alb`
   - Scheme: **Internet-facing** | IP address type: **IPv4**.
4. **Network mapping**:
   - VPC: Default VPC.
   - Mappings: Check at least 2 Availability Zones (e.g. `us-east-1a` and `us-east-1b`) and select a public subnet for each.
5. **Security groups**:
   - Remove `default` and select **`netflix-alb-sg`**.
6. **Listeners and routing**:
   - Protocol: `HTTP` | Port: `80`.
   - Default action: Forward to **`netflix-frontend-tg`**.
7. Click **Create load balancer** (bottom right).
8. Copy the **DNS name** from details (e.g. `netflix-alb-123456.us-east-1.elb.amazonaws.com`).

---

### 5.3 Configure Path-Based Routing Rule in ALB
1. Click on `netflix-alb` -> click the **Listeners and rules** tab.
2. Click on the `HTTP:80` listener link.
3. In the Rules tab, click **Add rule**:
   - Name: `RouteApiToBackend`
   - Add condition -> select **Path** -> enter `/api/*` -> click **Confirm**.
   - Add action -> select **Forward to target groups** -> choose **`netflix-backend-tg`** -> click **Confirm**.
   - Priority: `1`.
   - Click **Save**.

---

## Step 6: Register Task Definitions in ECS Console

1. Search **ECS** -> click **Elastic Container Service**.
2. In the left navigation, click **Task definitions** -> click **Create new task definition** -> choose **Create new task definition with JSON**.

### 6.1 Backend Task Definition
Replace the JSON in the editor with:
*(Replace `<AWS_ACCOUNT_ID>`, `<AWS_REGION>`, and `<YOUR_ALB_DNS_NAME>`)*

```json
{
  "family": "netflix-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "netflix-backend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/netflix-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp",
          "name": "backend-8000"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "SERVER_PORT", "value": "8000" },
        { "name": "CLIENT_URL", "value": "http://<YOUR_ALB_DNS_NAME>" },
        { "name": "DB_HOST", "value": "127.0.0.1" },
        { "name": "DB_PORT", "value": "5432" },
        { "name": "DB_USER", "value": "postgres" },
        { "name": "DB_PASSWORD", "value": "postgres" },
        { "name": "DB_NAME", "value": "netflix_db" },
        { "name": "DB_SSL", "value": "false" },
        { "name": "JWT_SECRET", "value": "netflix_production_jwt_secret_key_2026" },
        { "name": "TMDB_API_KEY", "value": "b96874a2b95b45ba0b1ba5a9da968036" },
        { "name": "SMTP_HOST", "value": "smtp.gmail.com" },
        { "name": "SMTP_PORT", "value": "587" },
        { "name": "SMTP_SECURE", "value": "false" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/netflix-backend",
          "awslogs-region": "<AWS_REGION>",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:8000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\""
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 15
      }
    },
    {
      "name": "postgres-db",
      "image": "postgres:16-alpine",
      "essential": true,
      "environment": [
        { "name": "POSTGRES_DB", "value": "netflix_db" },
        { "name": "POSTGRES_USER", "value": "postgres" },
        { "name": "POSTGRES_PASSWORD", "value": "postgres" }
      ],
      "portMappings": [
        {
          "containerPort": 5432,
          "hostPort": 5432,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/netflix-backend",
          "awslogs-region": "<AWS_REGION>",
          "awslogs-stream-prefix": "db",
          "awslogs-create-group": "true"
        }
      }
    }
  ]
}
```
Click **Create**.

---

### 6.2 Frontend Task Definition
Click **Task definitions** -> **Create new task definition** -> **Create new task definition with JSON**:

```json
{
  "family": "netflix-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "netflix-frontend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/netflix-frontend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "hostPort": 80,
          "protocol": "tcp",
          "name": "frontend-80"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/netflix-frontend",
          "awslogs-region": "<AWS_REGION>",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "wget -q --spider http://localhost/ || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
```
Click **Create**.

---

## Step 7: Create ECS Cluster & Launch Services

### 7.1 Create Cluster
1. In ECS left navigation, click **Clusters** -> click **Create cluster**.
2. Cluster name: `netflix-cluster`.
3. Infrastructure: Ensure **AWS Fargate (serverless)** is selected.
4. Click **Create**.

---

### 7.2 Launch Backend Service
1. Click into `netflix-cluster` -> in the **Services** tab, click **Create**.
2. **Environment**:
   - Compute options: **Launch type** -> **FARGATE** (Platform version: `LATEST`).
3. **Deployment configuration**:
   - Application type: **Service**.
   - Family: `netflix-backend` | Revision: `1 (LATEST)`.
   - Service name: `netflix-backend-service`.
   - Desired tasks: `1`.
4. **Networking**:
   - VPC: Default VPC.
   - Subnets: Select the 2 public subnets used for your ALB.
   - Security group: Choose **Use an existing security group** -> select `netflix-ecs-tasks-sg` (remove `default`).
   - Public IP: Toggle to **Turned ON**.
5. **Load balancing**:
   - Load balancer type: **Application Load Balancer**.
   - Container: `netflix-backend 8000:8000`.
   - Use an existing load balancer: Select `netflix-alb`.
   - Use an existing listener: Select `80:HTTP`.
   - Use an existing target group: Select `netflix-backend-tg`.
6. Click **Create** (bottom right).

---

### 7.3 Launch Frontend Service
1. Return to `netflix-cluster` -> in the **Services** tab, click **Create**.
2. **Environment**: Launch type -> **FARGATE**.
3. **Deployment configuration**:
   - Family: `netflix-frontend` | Revision: `1 (LATEST)`.
   - Service name: `netflix-frontend-service`.
   - Desired tasks: `1`.
4. **Networking**:
   - Select the same VPC and subnets.
   - Security group: `netflix-ecs-tasks-sg` | Public IP: **Turned ON**.
5. **Load balancing**:
   - Load balancer type: **Application Load Balancer**.
   - Container: `netflix-frontend 80:80`.
   - Use an existing load balancer: `netflix-alb`.
   - Use an existing listener: `80:HTTP`.
   - Use an existing target group: `netflix-frontend-tg`.
6. Click **Create**.

---

## Step 8: Verify in Browser

1. Go to **EC2** -> **Target Groups**.
   - Check `netflix-frontend-tg` and `netflix-backend-tg`: Within 1–2 minutes, targets will change from `Initial` to green **`Healthy`**.
2. Open your web browser and navigate to:
   ```
   http://<YOUR_ALB_DNS_NAME>
   ```
3. The Netflix Clone will load immediately! You can browse movies, watch trailers, and register/login without any external AWS RDS or S3 setup.
