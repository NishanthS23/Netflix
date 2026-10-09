pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    parameters {
        choice(name: 'DEPLOY_MODE', choices: ['remote-ssh', 'local-agent'], description: 'Deployment Target: remote-ssh (Deploy to Target Server via SSH) or local-agent (Deploy on local Jenkins host)')
        string(name: 'TARGET_HOST', defaultValue: '192.168.1.46', description: 'Target Server IP or Hostname (Default: 192.168.1.46)')
        string(name: 'TARGET_USER', defaultValue: 'demo', description: 'SSH Username for target server (Default: demo)')
        string(name: 'EC2_HOST', defaultValue: '192.168.1.46', description: 'Target Server IP (Legacy EC2_HOST alias)')
        string(name: 'EC2_USER', defaultValue: 'demo', description: 'Target Server SSH User (Legacy EC2_USER alias)')
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
                            sh """
                                echo "${DH_LOGIN_TOKEN.trim()}" | docker login -u "${DH_LOGIN_USER.trim()}" --password-stdin
                            """
                        } else {
                            powershell """
                                \$env:PATH = "C:\\Users\\Work\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;C:\\Program Files\\Docker\\Docker\\resources\\bin;\$env:PATH"
                                docker login -u '${DH_LOGIN_USER.trim()}' -p '${DH_LOGIN_TOKEN.trim()}'
                            """
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

        stage('Deploy to Target Server') {
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
                            // Resolve target host (default to 192.168.1.46)
                            def targetHost = '192.168.1.46'
                            if (params.TARGET_HOST && params.TARGET_HOST != '18.221.229.239') {
                                targetHost = params.TARGET_HOST.trim()
                            } else if (params.EC2_HOST && params.EC2_HOST != '18.221.229.239') {
                                targetHost = params.EC2_HOST.trim()
                            }

                            echo "Target deployment host: ${targetHost}"

                            def executeRemoteDeploy = { String sshKeyPath, String sshUserFromCreds ->
                                def targetUser = 'demo'
                                if (params.TARGET_USER && params.TARGET_USER != 'ubuntu') {
                                    targetUser = params.TARGET_USER.trim()
                                } else if (sshUserFromCreds) {
                                    targetUser = sshUserFromCreds.trim()
                                } else if (params.EC2_USER && params.EC2_USER != 'ubuntu') {
                                    targetUser = params.EC2_USER.trim()
                                }

                                echo "Deploying via SSH to ${targetUser}@${targetHost} using key: ${sshKeyPath}..."

                                if (isUnix()) {
                                    sh """
                                        chmod 400 "${sshKeyPath}"

                                        ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=60 "${targetUser}@${targetHost}" "bash -s" << 'REMOTE_DEPLOY_EOF'
set -e

echo "=== [Deploy] 1. Checking Project Directory ==="
PROJECT_DIR="\$HOME/${PROJECT_DIR_NAME}"
if [ ! -d "\$PROJECT_DIR" ]; then
    git clone "${GIT_REPO_URL}" "\$PROJECT_DIR"
fi
cd "\$PROJECT_DIR"

echo "=== [Deploy] 2. Pulling Latest Repository Configuration ==="
git fetch --all
git reset --hard origin/main

echo "=== [Deploy] 3. Writing .env from Jenkins Secret File ==="
echo "${envB64}" | base64 -d > .env
chmod 600 .env
echo "Production .env created successfully"

echo "=== [Deploy] 4. Authenticating with Docker Hub on Target Server ==="
echo "${DH_LOGIN_TOKEN.trim()}" | docker login -u "${DH_LOGIN_USER.trim()}" --password-stdin

echo "=== [Deploy] 5. Pulling Pre-built Docker Images ==="
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' found on target server!"
    exit 1
fi

\$DOCKER_COMPOSE --env-file .env pull

echo "=== [Deploy] 6. Starting Application Containers ==="
docker volume create devops_video_uploads 2>/dev/null || true
docker rm -f netflix-frontend netflix-backend netflix-db 2>/dev/null || true
\$DOCKER_COMPOSE --env-file .env up -d --remove-orphans

echo "=== [Deploy] 7. Running Production Health Check ==="
chmod +x scripts/healthcheck.sh
bash scripts/healthcheck.sh

echo "=== [Deploy] 8. Cleaning up dangling Docker images ==="
docker image prune -af || true

echo "=== [Deploy] Deployment Completed Successfully! ==="
REMOTE_DEPLOY_EOF
                                    """
                                } else {
                                    // Windows Agent Deploying to Server via SSH
                                    def winKeyPath = sshKeyPath.replace('/', '\\')
                                    powershell """
                                        # Set strict permissions on private key for Windows OpenSSH (chmod 400 equivalent)
                                        \$u = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
                                        icacls.exe "${winKeyPath}" /reset | Out-Null
                                        icacls.exe "${winKeyPath}" /inheritance:r | Out-Null
                                        icacls.exe "${winKeyPath}" /grant:r "*S-1-5-32-544:R" | Out-Null
                                        icacls.exe "${winKeyPath}" /grant:r "*S-1-5-18:R" | Out-Null
                                        icacls.exe "${winKeyPath}" /grant:r "\${u}:R" | Out-Null
                                        icacls.exe "${winKeyPath}" /remove "BUILTIN\\Users" | Out-Null
                                        icacls.exe "${winKeyPath}" /remove "Authenticated Users" | Out-Null

                                        \$deployScript = @'
set -e

echo "=== [Deploy] 1. Checking Project Directory ==="
PROJECT_DIR="\$HOME/${PROJECT_DIR_NAME}"
if [ ! -d "\$PROJECT_DIR" ]; then
    git clone "${GIT_REPO_URL}" "\$PROJECT_DIR"
fi
cd "\$PROJECT_DIR"

echo "=== [Deploy] 2. Pulling Latest Repository Configuration ==="
git fetch --all
git reset --hard origin/main

echo "=== [Deploy] 3. Writing .env from Jenkins Secret File ==="
echo "${envB64}" | base64 -d > .env
chmod 600 .env
echo "Production .env created successfully"

echo "=== [Deploy] 4. Authenticating with Docker Hub on Target Server ==="
echo "${DH_LOGIN_TOKEN.trim()}" | docker login -u "${DH_LOGIN_USER.trim()}" --password-stdin

echo "=== [Deploy] 5. Pulling Pre-built Docker Images ==="
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' found on target server!"
    exit 1
fi

\$DOCKER_COMPOSE --env-file .env pull

echo "=== [Deploy] 6. Starting Application Containers ==="
docker volume create devops_video_uploads 2>/dev/null || true
docker rm -f netflix-frontend netflix-backend netflix-db 2>/dev/null || true
\$DOCKER_COMPOSE --env-file .env up -d --remove-orphans

echo "=== [Deploy] 7. Running Production Health Check ==="
chmod +x scripts/healthcheck.sh
bash scripts/healthcheck.sh

echo "=== [Deploy] 8. Cleaning up dangling Docker images ==="
docker image prune -af || true

echo "=== [Deploy] Deployment Completed Successfully! ==="
'@

                                        \$deployScript | ssh -i "${winKeyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=60 -o LogLevel=ERROR "${targetUser}@${targetHost}" "bash -s"
                                    """
                                }
                            }

                            // Support both 'SSH Username with private key' and 'Secret file' credential kinds
                            try {
                                echo "Attempting SSH credential binding using 'sshUserPrivateKey'..."
                                withCredentials([sshUserPrivateKey(credentialsId: env.SSH_KEY_ID, keyFileVariable: 'SSH_KEY_FILE', usernameVariable: 'SSH_KEY_USER')]) {
                                    executeRemoteDeploy(SSH_KEY_FILE, SSH_KEY_USER)
                                }
                            } catch (Throwable credErr) {
                                if (credErr.message?.contains('FileCredentials') || credErr.message?.contains('SSH Username with private key') || credErr.message?.contains('where') || credErr.message?.contains('plaincredentials')) {
                                    echo "Falling back to 'file' credential binding for ${env.SSH_KEY_ID}..."
                                    withCredentials([file(credentialsId: env.SSH_KEY_ID, variable: 'SSH_KEY_FILE')]) {
                                        executeRemoteDeploy(SSH_KEY_FILE, null)
                                    }
                                } else {
                                    throw credErr
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
