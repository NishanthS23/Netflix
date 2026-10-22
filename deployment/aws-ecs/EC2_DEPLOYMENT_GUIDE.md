# AWS ECS Self-Managed EC2 Instances (Amazon EC2 Launch Type) Deployment Guide

This guide provides a comprehensive, step-by-step walkthrough to deploy the Netflix Clone microservice architecture onto **Self-Managed EC2 Container Instances** (Amazon EC2 launch type) in Amazon ECS, replacing AWS Fargate serverless containers.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Internet Users / Browsers       |
                      +---------------------------------------+
                                          |
                                          v  Port 80 (HTTP)
                      +---------------------------------------+
                      | Application Load Balancer (netflix-alb) |
                      |    (Path Routing: /api/* and /*)      |
                      +---------------------------------------+
                           /                             \
     Path: /api/*         /                               \  Path: /*
                         v                                 v
        +--------------------------------+   +---------------------------------+
        | Backend Target Group (Port 8000)|   | Frontend Target Group (Port 80) |
        |      netflix-backend-tg        |   |       netflix-frontend-tg       |
        +--------------------------------+   +---------------------------------+
                         \                                 /
                          \                               /
                           v                             v
+-----------------------------------------------------------------------------------+
|                         AWS ECS Cluster (netflix-cluster)                         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                 Self-Managed EC2 Instance (t3.medium / t3.small)            |  |
|  |             Amazon Linux 2023 ECS-Optimized AMI (Amazon ECS Agent)           |  |
|  |                     IAM Role: ecsInstanceRole                               |  |
|  |                                                                             |  |
|  |   +-----------------------------+     +-------------------------------+     |  |
|  |   |   netflix-backend Task      |     |     netflix-frontend Task     |     |  |
|  |   |  Node.js API (Port 8000)    |     |  React + Nginx (Port 80)      |     |  |
|  |   |   Task Role: netflixTaskRole|     |                               |     |  |
|  |   +-----------------------------+     +-------------------------------+     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
            |                                                      |
            v  Port 5432 (SSL)                                     v  HTTPS S3 API
+------------------------------+                       +-----------------------------+
|    AWS RDS PostgreSQL DB     |                       |    AWS S3 Storage Bucket    |
|         (netflix-db)         |                       | netflix-media-storage-...   |
+------------------------------+                       +-----------------------------+
```

---

## Active Environment Reference

| Resource | Value |
| :--- | :--- |
| **AWS Region** | `ap-south-1` (Mumbai) |
| **AWS Account ID** | `530700193656` |
| **VPC ID** | Default VPC (`vpc-091da536f04d98e50`) |
| **ALB DNS Name** | `netflix-alb-266432265.ap-south-1.elb.amazonaws.com` |
| **ALB Security Group** | `netflix-alb-sg` (`sg-05b1e06fa5bbbbd80`) |
| **Target Groups** | `netflix-backend-tg` (Port 8000), `netflix-frontend-tg` (Port 80) |
| **RDS Endpoint** | `netflix-db.c3mgw0c6gmgt.ap-south-1.rds.amazonaws.com` |
| **RDS Security Group** | `netflix-rds-sg` (`sg-08a24e19b6ce9e326`) |
| **S3 Bucket** | `netflix-media-storage-530700193656` |
| **Recommended AMI** | `ami-0a542a5751301f539` (Amazon Linux 2023 ECS-Optimized x86_64) |

---

## Step 1: Create the EC2 IAM Role (`ecsInstanceRole`)

The ECS container agent running on your EC2 instance needs an IAM role to authenticate with the ECS control plane, register the container instance, poll tasks, pull images from ECR, and stream logs to CloudWatch.

1. Open the [AWS IAM Console - Roles](https://console.aws.amazon.com/iam/home#/roles).
2. Click **Create role**.
3. **Select trusted entity**:
   - Trusted entity type: Select **AWS service**.
   - Use case: Under Common use cases, select **EC2**.
   - Click **Next**.
4. **Add permissions**:
   - In the search bar, search for and check the box next to:
     - `AmazonEC2ContainerServiceforEC2Role` (AWS managed policy)
     - `AmazonSSMManagedInstanceCore` (AWS managed policy — allows connecting to the EC2 instance via AWS Systems Manager Session Manager without needing open SSH ports or key pairs).
   - Click **Next**.
5. **Name, review, and create**:
   - Role name: Enter `ecsInstanceRole`.
   - Description: `Allows EC2 instances to communicate with Amazon ECS and AWS Systems Manager`.
   - Click **Create role**.

---

## Step 2: Create EC2 Security Group (`netflix-ecs-ec2-sg`)

Your EC2 container instance requires inbound access from the Application Load Balancer and outbound access to ECR, S3, RDS, and CloudWatch.

1. Open the [AWS EC2 Console - Security Groups](https://console.aws.amazon.com/ec2/home#SecurityGroups:).
2. Click **Create security group**.
3. **Basic details**:
   - Security group name: `netflix-ecs-ec2-sg`
   - Description: `Security group for ECS self-managed EC2 container instances`
   - VPC: Select your default VPC (`vpc-091da536f04d98e50`).
4. **Inbound rules**:
   - **Rule 1 (Backend traffic)**:
     - Type: `Custom TCP`
     - Port range: `8000`
     - Source: Select **Custom** > Click the search box > Select `netflix-alb-sg` (`sg-05b1e06fa5bbbbd80`).
   - **Rule 2 (Frontend traffic)**:
     - Type: `HTTP`
     - Port range: `80`
     - Source: Select **Custom** > Click the search box > Select `netflix-alb-sg` (`sg-05b1e06fa5bbbbd80`).
   - **Rule 3 (Optional - SSH access)**:
     - Type: `SSH`
     - Port range: `22`
     - Source: Select **My IP**.
5. **Outbound rules**:
   - Leave default: `All traffic` to `0.0.0.0/0`.
6. Click **Create security group**.
7. **Authorize EC2 Ingress to RDS**:
   - In the Security Groups list, click on `netflix-rds-sg` (`sg-08a24e19b6ce9e326`).
   - Select the **Inbound rules** tab and click **Edit inbound rules**.
   - Click **Add rule**:
     - Type: `PostgreSQL` (Port 5432)
     - Source: Select **Custom** > Choose `netflix-ecs-ec2-sg`.
     - Description: `PostgreSQL access from ECS EC2 container instances`.
   - Click **Save rules**.

---

## Step 3: Create the ECS Cluster with EC2 Capacity

You can create the cluster and attach the EC2 instance using either the **Built-in ECS Cluster Wizard (Recommended)** or by **Launching an EC2 instance manually**.

### Method A: ECS Cluster Wizard (Recommended & Automated)

1. Open the [Amazon ECS Console - Clusters](https://console.aws.amazon.com/ecs/v2/clusters).
2. Click **Create cluster**.
3. **Cluster configuration**:
   - Cluster name: `netflix-cluster`
4. **Infrastructure**:
   - Check the box: **Amazon EC2 instances**.
   - Operating system / Architecture: **Amazon Linux 2023 (x86_64)**.
   - EC2 instance type: Select `t3.medium` (2 vCPU, 4 GiB RAM — ideal for running both backend and frontend containers comfortably) or `t3.small`.
   - Desired capacity:
     - Minimum: `1`
     - Maximum: `1`
   - SSH key pair: Select an existing key pair or leave as `None` (SSM Session Manager can connect without a key).
5. **Networking**:
   - VPC: Default VPC (`vpc-091da536f04d98e50`).
   - Subnets: Select all public subnets in your VPC (e.g., `ap-south-1a`, `ap-south-1b`, `ap-south-1c`).
   - Security group: Select `netflix-ecs-ec2-sg`.
   - Auto-assign public IP: **Turn on**.
6. Click **Create**.
*AWS automatically provisions the Auto Scaling Group, applies the ECS-optimized AMI, attaches `ecsInstanceRole`, and injects the cluster registration configuration.*

---

### Method B: Launch a Standalone EC2 Instance Manually

If you prefer full manual control over the EC2 instance:

1. Open the [AWS EC2 Console - Launch an instance](https://console.aws.amazon.com/ec2/home#LaunchInstances:).
2. **Name and tags**:
   - Name: `netflix-ecs-instance`
3. **Application and OS Images (Amazon Machine Image)**:
   - Click **Browse more AMIs**.
   - Click the **Community AMIs** tab or search bar.
   - Search for: `amazon-linux-2023-ecs-optimized` or AMI ID `ami-0a542a5751301f539`.
   - Select **Amazon Linux 2023 ECS-Optimized AMI**.
4. **Instance type**:
   - Select `t3.medium` (or `t3.small`).
5. **Key pair**:
   - Choose a key pair or select `Proceed without a key pair`.
6. **Network settings**:
   - Click **Edit**.
   - VPC: Default VPC (`vpc-091da536f04d98e50`).
   - Subnet: Choose any public subnet (e.g. `ap-south-1a`).
   - Auto-assign public IP: **Enable**.
   - Firewall: Select **Select existing security group** > choose `netflix-ecs-ec2-sg`.
7. **Advanced details**:
   - **IAM instance profile**: Select `ecsInstanceRole`.
   - Scroll down to the **User data** box at the bottom and paste:
     ```bash
     #!/bin/bash
     echo "ECS_CLUSTER=netflix-cluster" >> /etc/ecs/ecs.config
     ```
8. Click **Launch instance**.
9. In the ECS Console, navigate to `netflix-cluster` > **Infrastructure** tab > **Container instances**. Within 1–2 minutes, your EC2 instance will appear with status `ACTIVE` and agent connected.

---

## Step 4: Create Task Definitions for EC2

We have generated production-ready task definitions tailored for EC2:
- Backend: [`task-def-backend-ec2.json`](./task-def-backend-ec2.json)
- Frontend: [`task-def-frontend-ec2.json`](./task-def-frontend-ec2.json)

### Backend Task Definition (`netflix-backend`)

1. Open [Amazon ECS Console - Task definitions](https://console.aws.amazon.com/ecs/v2/task-definitions).
2. Click **Create new task definition** > click the dropdown arrow > **Create new task definition with JSON**.
3. Replace the placeholder JSON with the contents of [`task-def-backend-ec2.json`](./task-def-backend-ec2.json):
   ```json
   {
     "family": "netflix-backend",
     "networkMode": "awsvpc",
     "requiresCompatibilities": [
       "EC2"
     ],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::530700193656:role/ecsTaskExecutionRole",
     "taskRoleArn": "arn:aws:iam::530700193656:role/netflixTaskRole",
     "containerDefinitions": [
       {
         "name": "netflix-backend",
         "image": "530700193656.dkr.ecr.ap-south-1.amazonaws.com/netflix-backend:latest",
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
           { "name": "CLIENT_URL", "value": "http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com" },
           { "name": "DB_HOST", "value": "netflix-db.c3mgw0c6gmgt.ap-south-1.rds.amazonaws.com" },
           { "name": "DB_PORT", "value": "5432" },
           { "name": "DB_USER", "value": "postgres" },
           { "name": "DB_PASSWORD", "value": "NetflixSecure2026!" },
           { "name": "DB_NAME", "value": "netflix_db" },
           { "name": "DB_SSL", "value": "true" },
           { "name": "AWS_REGION", "value": "ap-south-1" },
           { "name": "AWS_S3_BUCKET_NAME", "value": "netflix-media-storage-530700193656" },
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
             "awslogs-region": "ap-south-1",
             "awslogs-stream-prefix": "ecs",
             "awslogs-create-group": "true"
           }
         },
         "healthCheck": {
           "command": [
             "CMD-SHELL",
             "wget -q --spider http://127.0.0.1:8000/api/health || exit 1"
           ],
           "interval": 30,
           "timeout": 5,
           "retries": 3,
           "startPeriod": 15
         }
       }
     ]
   }
   ```
4. Click **Create**.

---

### Frontend Task Definition (`netflix-frontend`)

1. In the Task definitions menu, click **Create new task definition** > **Create new task definition with JSON**.
2. Paste the contents of [`task-def-frontend-ec2.json`](./task-def-frontend-ec2.json):
   ```json
   {
     "family": "netflix-frontend",
     "networkMode": "awsvpc",
     "requiresCompatibilities": [
       "EC2"
     ],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::530700193656:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "netflix-frontend",
         "image": "530700193656.dkr.ecr.ap-south-1.amazonaws.com/netflix-frontend:latest",
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
             "awslogs-region": "ap-south-1",
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
3. Click **Create**.

---

## Step 5: Launch ECS Services on EC2

Now create the two ECS services inside `netflix-cluster` and attach them to your Application Load Balancer.

### 1. Launch Backend Service (`netflix-backend-service`)

1. Open **Amazon ECS Console** > **Clusters** > Click `netflix-cluster`.
2. Under the **Services** tab, click **Create**.
3. **Environment**:
   - Compute options: Select **Launch type**.
   - Launch type: Select **EC2**.
4. **Deployment configuration**:
   - Application type: Select **Service**.
   - Family: Select `netflix-backend`.
   - Revision: Select `1 (latest)`.
   - Service name: Enter `netflix-backend-service`.
   - Desired tasks: Enter `1`.
5. **Networking (awsvpc)**:
   - VPC: Default VPC (`vpc-091da536f04d98e50`).
   - Subnets: Select all public subnets.
   - Security group: Select `netflix-ecs-ec2-sg`.
   - Public IP: Select **Turn on**.
6. **Load balancing**:
   - Load balancer type: Select **Application Load Balancer**.
   - Load balancer: Select `netflix-alb`.
   - Container to load balance: Select `netflix-backend 8000:8000`.
   - Target group: Select **Use an existing target group**.
   - Target group name: Select `netflix-backend-tg`.
7. Click **Create**.

---

### 2. Launch Frontend Service (`netflix-frontend-service`)

1. In `netflix-cluster` > **Services** tab, click **Create**.
2. **Environment**:
   - Compute options: **Launch type**.
   - Launch type: **EC2**.
3. **Deployment configuration**:
   - Application type: **Service**.
   - Family: Select `netflix-frontend`.
   - Revision: Select `1 (latest)`.
   - Service name: Enter `netflix-frontend-service`.
   - Desired tasks: Enter `1`.
4. **Networking (awsvpc)**:
   - VPC: Default VPC.
   - Subnets: Select all public subnets.
   - Security group: Select `netflix-ecs-ec2-sg`.
   - Public IP: Select **Turn on**.
5. **Load balancing**:
   - Load balancer type: Select **Application Load Balancer**.
   - Load balancer: Select `netflix-alb`.
   - Container to load balance: Select `netflix-frontend 80:80`.
   - Target group: Select **Use an existing target group**.
   - Target group name: Select `netflix-frontend-tg`.
6. Click **Create**.

---

## Step 6: Verification & Troubleshooting

### 1. Check Container Instance Status
- In ECS Console > `netflix-cluster` > **Infrastructure** tab.
- Check **Container instances**: You should see `1` registered instance with CPU and Memory available.

### 2. Check Task Placement
- In `netflix-cluster` > **Tasks** tab.
- Both `netflix-backend` and `netflix-frontend` tasks should be in `RUNNING` status with `Last status: RUNNING` and `Desired status: RUNNING`.

### 3. Check Target Group Health
- Open [EC2 Console - Target Groups](https://console.aws.amazon.com/ec2/home#TargetGroups:).
- Click on `netflix-backend-tg` > **Targets** tab: Status should show `healthy`.
- Click on `netflix-frontend-tg` > **Targets** tab: Status should show `healthy`.

### 4. Verify Live Application
Open your browser and test the endpoints:
- **Web App**: [http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com](http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com)
- **Health Check**: [http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com/api/health](http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com/api/health)
- **Custom Videos API**: [http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com/api/v1/custom-videos](http://netflix-alb-266432265.ap-south-1.elb.amazonaws.com/api/v1/custom-videos)

### 5. Common Troubleshooting Tips
- **Instance does not register with ECS cluster**: Verify that the instance's IAM instance profile is set to `ecsInstanceRole` (contains `AmazonEC2ContainerServiceforEC2Role`) and the user data has `echo "ECS_CLUSTER=netflix-cluster" >> /etc/ecs/ecs.config`. You can inspect `/var/log/ecs/ecs-agent.log` on the EC2 instance.
- **Tasks cannot pull image from ECR**: Ensure the EC2 instance has a public IP and its subnet has a route to the Internet Gateway (`0.0.0.0/0 -> igw-...`), or VPC endpoints for ECR/S3 exist.
- **Backend cannot connect to RDS**: Verify that `netflix-rds-sg` has an inbound rule allowing port `5432` from `netflix-ecs-ec2-sg`.
