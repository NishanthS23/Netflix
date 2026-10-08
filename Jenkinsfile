pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    parameters {
        choice(name: 'DEPLOY_MODE', choices: ['remote-ssh', 'local-agent'], description: 'Deployment Target: remote-ssh (Deploy to AWS EC2 via SSH) or local-agent (Jenkins agent running on EC2)')
        string(name: 'EC2_HOST', defaultValue: '18.221.229.239', description: 'AWS EC2 Public IP or Hostname (Required if DEPLOY_MODE is remote-ssh)')
        string(name: 'EC2_USER', defaultValue: 'ubuntu', description: 'SSH Username for EC2 instance (Default: ubuntu)')
        string(name: 'DOCKERHUB_USERNAME', defaultValue: 'nishanthsaravanan503', description: 'Docker Hub Username / Organization')
        string(name: 'GOOGLE_CLIENT_ID', defaultValue: '315922735623-r9kc8d4jaau51e52up31vgg2e2ehq5g4.apps.googleusercontent.com', description: 'Google Client ID build-arg for Frontend SPA')
    }

    environment {
        // Ensure Docker & Git CLI directories are on PATH for Windows Service agents
        PATH               = "C:\\Users\\Work\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Docker\\Docker\\resources\\bin;C:\\Program Files\\Git\\bin;C:\\Program Files\\Git\\cmd;${env.PATH}"

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

                    // Extract Short Git Commit SHA (cross-platform for Windows & Linux)
                    if (isUnix()) {
                        env.GIT_COMMIT_SHORT = sh(
                            script: 'git rev-parse --short HEAD',
                            returnStdout: true
                        ).trim()
                    } else {
                        env.GIT_COMMIT_SHORT = powershell(
                            script: '''
                                $env:PATH = "C:\\Program Files\\Git\\cmd;C:\\Program Files\\Git\\bin;$env:PATH"
                                git rev-parse --short HEAD
                            ''',
                            returnStdout: true
                        ).trim()
                    }

                    echo "Operating System: ${isUnix() ? 'Linux / Unix' : 'Windows'}"
                    echo "Deploying Git Commit SHA: ${env.GIT_COMMIT_SHORT}"
                    echo "Target Docker Hub User: ${DH_USER}"
                    echo "Deploy Mode: ${params.DEPLOY_MODE}"
                }
            }
        }

        stage('Verify Docker Environment') {
            steps {
                script {
                    echo "=== 2. Verifying Docker & Docker Compose on Agent ==="
                    if (isUnix()) {
                        sh 'docker --version'
                        sh 'docker compose version || docker-compose --version || true'
                    } else {
                        powershell '''
                            docker --version
                            if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
                                docker-compose --version
                            } else {
                                Write-Host "Docker CLI verified (Docker Compose used on target host)"
                            }
                        '''
                    }
                }
            }
        }

        stage('Docker Hub Login') {
            steps {
                script {
                    echo "=== 3. Authenticating with Docker Hub ==="
                    withCredentials([usernamePassword(
                        credentialsId: env.DOCKERHUB_CREDS_ID,
                        usernameVariable: 'DH_LOGIN_USER',
                        passwordVariable: 'DH_LOGIN_TOKEN'
                    )]) {
                        if (isUnix()) {
                            sh 'echo "$DH_LOGIN_TOKEN" | docker login -u "$DH_LOGIN_USER" --password-stdin'
                        } else {
                            powershell '''
                                $env:PATH = "C:\\Users\\Work\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Docker\\Docker\\resources\\bin;$env:PATH"
                                echo $env:DH_LOGIN_TOKEN | docker login -u $env:DH_LOGIN_USER --password-stdin
                            '''
                        }
                    }
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                script {
                    echo "=== 4. Building & Pushing Backend Docker Image ==="
                    if (isUnix()) {
                        sh """
                            docker build \
                                -t ${BACKEND_IMAGE}:latest \
                                -t ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT} \
                                ./backend

                            docker push ${BACKEND_IMAGE}:latest
                            docker push ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        """
                    } else {
                        powershell """
                            \$env:PATH = "C:\\Users\\Work\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Docker\\Docker\\resources\\bin;\$env:PATH"
                            docker build -t ${BACKEND_IMAGE}:latest -t ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT} ./backend
                            docker push ${BACKEND_IMAGE}:latest
                            docker push ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        """
                    }
                }
            }
        }

        stage('Build & Push Frontend') {
            steps {
                script {
                    echo "=== 5. Building & Pushing Frontend Docker Image ==="
                    if (isUnix()) {
                        sh """
                            docker build \
                                --build-arg VITE_GOOGLE_CLIENT_ID="${params.GOOGLE_CLIENT_ID}" \
                                -t ${FRONTEND_IMAGE}:latest \
                                -t ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT} \
                                ./frontend

                            docker push ${FRONTEND_IMAGE}:latest
                            docker push ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        """
                    } else {
                        powershell """
                            \$env:PATH = "C:\\Users\\Work\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Docker\\Docker\\resources\\bin;\$env:PATH"
                            docker build --build-arg VITE_GOOGLE_CLIENT_ID="${params.GOOGLE_CLIENT_ID}" -t ${FRONTEND_IMAGE}:latest -t ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT} ./frontend
                            docker push ${FRONTEND_IMAGE}:latest
                            docker push ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}
                        """
                    }
                }
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
                        def envB64 = ''
                        if (isUnix()) {
                            envB64 = sh(
                                script: "base64 < '${SECRET_ENV_FILE}' | tr -d '\\r\\n'",
                                returnStdout: true
                            ).trim()
                        } else {
                            def cleanPath = SECRET_ENV_FILE.replace('\\', '/')
                            envB64 = powershell(
                                script: "[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('${cleanPath}'))",
                                returnStdout: true
                            ).trim()
                        }

                        if (params.DEPLOY_MODE == 'remote-ssh') {
                            if (!params.EC2_HOST) {
                                error("EC2_HOST parameter is required when DEPLOY_MODE is 'remote-ssh'")
                            }

                            withCredentials([file(credentialsId: env.SSH_KEY_ID, variable: 'SSH_KEY_FILE')]) {
                                if (isUnix()) {
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
                                } else {
                                    // Windows Agent Deploying to EC2 via SSH
                                    def cleanKeyPath = SSH_KEY_FILE.replace('\\', '/')
                                    powershell """
                                        \$deployScript = @'
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
'@

                                        \$deployScript | ssh -i "${cleanKeyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=60 "${params.EC2_USER}@${params.EC2_HOST}" "bash -s"
                                    """
                                }
                            }
                        } else {
                            // Local agent deployment
                            if (isUnix()) {
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
                            } else {
                                powershell """
                                    echo "=== [Local] 1. Applying .env from Jenkins Secret File ==="
                                    [System.IO.File]::WriteAllBytes('.env', [Convert]::FromBase64String('${envB64}'))

                                    echo "=== [Local] 2. Pulling Docker Images ==="
                                    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
                                        docker-compose --env-file .env pull
                                        echo "=== [Local] 3. Restarting Application Containers ==="
                                        docker volume create devops_video_uploads 2>\$null
                                        docker rm -f netflix-frontend netflix-backend netflix-db 2>\$null
                                        docker-compose --env-file .env up -d --remove-orphans
                                    } else {
                                        docker compose --env-file .env pull
                                        echo "=== [Local] 3. Restarting Application Containers ==="
                                        docker volume create devops_video_uploads 2>\$null
                                        docker rm -f netflix-frontend netflix-backend netflix-db 2>\$null
                                        docker compose --env-file .env up -d --remove-orphans
                                    }

                                    echo "=== [Local] 4. Running Production Health Check ==="
                                    bash scripts/healthcheck.sh

                                    echo "=== [Local] 5. Cleaning up old images ==="
                                    docker image prune -af
                                """
                            }
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
                if (isUnix()) {
                    sh 'docker logout || true'
                } else {
                    powershell '''
                        $env:PATH = "C:\\Users\\Work\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Docker\\Docker\\resources\\bin;$env:PATH"
                        docker logout | Out-Null
                    '''
                }
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
