pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/NishanthS23/Netflix.git'
            }
        }

        stage('Verify Docker & Compose') {
            steps {
                sh 'docker --version'
                sh 'docker compose version'
            }
        }

        stage('Prepare Environment') {
            steps {
                sh '''
                    echo "NODE_ENV=production" > .env
                    echo "SERVER_PORT=8000" >> .env
                    echo "MONGO_URI=mongodb://db:27017/netflix" >> .env
                    echo "CLIENT_URL=http://localhost" >> .env
                    echo "JWT_SECRET=netflix_test_jwt_secret_key" >> .env
                    echo "TMDB_API_KEY=" >> .env
                '''
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh 'docker compose --env-file .env up -d --build --remove-orphans'
            }
        }

        stage('Health Check') {
            steps {
                sleep 15
                sh 'docker ps'
                sh 'curl -f http://localhost:80 || exit 1'
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        success {
            echo "Netflix Clone deployed successfully to EC2!"
        }
        failure {
            echo "Deployment failed. Docker container logs:"
            sh 'docker compose logs --tail=50'
        }
    }
}
