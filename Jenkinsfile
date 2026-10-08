pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    parameters {
        choice(name: 'DEPLOY_MODE', choices: ['remote-ssh', 'local-agent'], description: 'Deployment Target: remote-ssh (Deploy to AWS EC2 via SSH) or local-agent (Jenkins agent is running on EC2)')
        string(name: 'EC2_HOST', defaultValue: '', description: 'AWS EC2 Public IP or Hostname (Required if DEPLOY_MODE is remote-ssh)')
        string(name: 'EC2_USER', defaultValue: 'ubuntu', description: 'SSH Username for EC2 instance (Default: ubuntu)')
        string(name: 'DOCKERHUB_USERNAME', defaultValue: 'nishanthsaravanan503', description: 'Docker Hub Username / Organization')
        string(name: 'GOOGLE_CLIENT_ID', defaultValue: '315922735623-r9kc8d4jaau51e52up31vgg2e2ehq5g4.apps.googleusercontent.com', description: 'Google Client ID build-arg for Frontend SPA')
    }

    environment {
        // Jenkins Credentials IDs
        DOCKERHUB_CREDS_ID = 'dockerhub-credentials'
        SECRET_FILE_ID     = 'netflix-secret-file'
        SSH_KEY_ID         = 'ec2-ssh-key'

        // Application Repository & Configuration
        GIT_REPO_URL       = 'https://github.com/NishanthS23/Netflix.git'
        PROJECT_DIR_NAME   = 'netflix-clone'
        DH_USER            = "${params.DOCKERHUB_USERNAME}"
        BACKEND_IMAGE      = "${params.DOCKERHUB_USERNAME}/netflix-backend"
        FRONTEND_IMAGE     = "${params.DOCKERHUB_USERNAME}/netflix-frontend"
    }

    stages {
        stage('Checkout & Initialize') {
            steps {
                script {
                    echo "=== 1. Checking out Source Code ==="
                    checkout scm

                    // Extract Short Git Commit SHA for Docker image tagging
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    echo "Deploying Git Commit SHA: ${env.GIT_COMMIT_SHORT}"
                    echo "Target Docker Hub User: ${DH_USER}"
                    echo "Deploy Mode: ${params.DEPLOY_MODE}"
                }
            }
        }

        stage('Verify Docker Environment') {
            steps {
                echo "=== 2. Verifying Docker & Docker Compose on Agent ==="
                sh 'docker --version'
                sh 'docker compose version'
            }
        }

        stage('Docker Hub Login') {
            steps {
                echo "=== 3. Authenticating with Docker Hub ==="
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKERHUB_CREDS_ID,
                    usernameVariable: 'DH_LOGIN_USER',
                    passwordVariable: 'DH_LOGIN_TOKEN'
                )]) {
                    sh 'echo "$DH_LOGIN_TOKEN" | docker login -u "$DH_LOGIN_USER" --password-stdin'
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                echo "=== 4. Building & Pushing Backend Docker Image ==="
                sh """
                    docker build \
                        -t ${BACKEND_IMAGE}:latest \
                        -t ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT} \
                        ./backend

                    docker push ${BACKEND_IMAGE}:latest
                    docker push ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                """
            }
        }

        stage('Build & Push Frontend') {
            steps {
                echo "=== 5. Building & Pushing Frontend Docker Image ==="
                sh """
                    docker build \
                        --build-arg VITE_GOOGLE_CLIENT_ID="${params.GOOGLE_CLIENT_ID}" \
                        -t ${FRONTEND_IMAGE}:latest \
                        -t ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT} \
                        ./frontend

                    docker push ${FRONTEND_IMAGE}:latest
                    docker push ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                """
            }
        }

        stage('Deploy to EC2') {
            steps {
                script {
                    echo "=== 6. Deploying Application to Production ==="

                    withCredentials([
                        file(credentialsId: env.SECRET_FILE_ID, variable: 'SECRET_ENV_FILE'),
                        usernamePassword(
                            credentialsId: env.DOCKERHUB_CREDS_ID,
                            usernameVariable: 'DH_LOGIN_USER',
                            passwordVariable: 'DH_LOGIN_TOKEN'
                        )
                    ]) {
                        // Safely encode .env file to base64 to avoid multiline/whitespace SSH injection
                        def envB64 = sh(
                            script: "base64 < '${SECRET_ENV_FILE}' | tr -d '\\r\\n'",
                            returnStdout: true
                        ).trim()

                        if (params.DEPLOY_MODE == 'remote-ssh') {
                            if (!params.EC2_HOST) {
                                error("EC2_HOST parameter is required when DEPLOY_MODE is 'remote-ssh'")
                            }

                            withCredentials([file(credentialsId: env.SSH_KEY_ID, variable: 'SSH_KEY_FILE')]) {
                                sh """
                                    chmod 400 "${SSH_KEY_FILE}"

                                    ssh -i "${SSH_KEY_FILE}" -o StrictHostKeyChecking=no -o ConnectTimeout=60 "${params.EC2_USER}@${params.EC2_HOST}" "bash -s" << 'REMOTE_DEPLOY_EOF'
set -e

echo "=== [EC2] 1. Checking Project Directory ==="
PROJECT_DIR="\$HOME/${PROJECT_DIR_NAME}"
if [ ! -d "\$PROJECT_DIR" ]; then
    git clone "${GIT_REPO_URL}" "\$PROJECT_DIR"
fi
cd "\$PROJECT_DIR"

echo "=== [EC2] 2. Pulling Latest Repository Configuration ==="
git fetch --all
git reset --hard origin/main

echo "=== [EC2] 3. Writing .env from Jenkins Secret File ==="
echo "${envB64}" | base64 -d > .env
chmod 600 .env
echo "Production .env created successfully"

echo "=== [EC2] 4. Authenticating with Docker Hub on EC2 ==="
echo "${DH_LOGIN_TOKEN}" | docker login -u "${DH_LOGIN_USER}" --password-stdin

echo "=== [EC2] 5. Pulling Pre-built Docker Images ==="
docker compose --env-file .env pull

echo "=== [EC2] 6. Starting Application Containers ==="
docker volume create devops_video_uploads 2>/dev/null || true
docker rm -f netflix-frontend netflix-backend netflix-db 2>/dev/null || true
docker compose --env-file .env up -d --remove-orphans

echo "=== [EC2] 7. Running Production Health Check ==="
chmod +x scripts/healthcheck.sh
bash scripts/healthcheck.sh

echo "=== [EC2] 8. Cleaning up dangling Docker images ==="
docker image prune -af || true

echo "=== [EC2] Deployment Completed Successfully! ==="
REMOTE_DEPLOY_EOF
                                """
                            }
                        } else {
                            // Local agent deployment (Jenkins agent is running on EC2 instance itself)
                            sh """
                                set -e
                                echo "=== [Local] 1. Applying .env from Jenkins Secret File ==="
                                echo "${envB64}" | base64 -d > .env
                                chmod 600 .env

                                echo "=== [Local] 2. Pulling Docker Images ==="
                                docker compose --env-file .env pull

                                echo "=== [Local] 3. Restarting Application Containers ==="
                                docker volume create devops_video_uploads 2>/dev/null || true
                                docker rm -f netflix-frontend netflix-backend netflix-db 2>/dev/null || true
                                docker compose --env-file .env up -d --remove-orphans

                                echo "=== [Local] 4. Running Production Health Check ==="
                                chmod +x scripts/healthcheck.sh
                                bash scripts/healthcheck.sh

                                echo "=== [Local] 5. Cleaning up old images ==="
                                docker image prune -af || true
                            """
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "=== Cleaning up build workspace ==="
                sh 'docker logout || true'
            }
        }
        success {
            script {
                def targetUrl = params.EC2_HOST ? "http://${params.EC2_HOST}" : "http://localhost"
                echo "🎉 Netflix Clone deployed successfully via Jenkins! Access URL: ${targetUrl}"
            }
        }
        failure {
            echo "❌ Jenkins deployment failed. Check the stage console logs above for debugging."
        }
    }
}
