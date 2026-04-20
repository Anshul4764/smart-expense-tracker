pipeline {
    agent any

    environment {
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check Node Setup') {
            steps {
                sh 'echo "Current PATH: $PATH"'
                sh 'which node'
                sh 'which npm'
                sh 'node -v'
                sh 'npm -v'
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Test') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
                archiveArtifacts artifacts: 'frontend/build/**', fingerprint: true
            }
        }

        stage('Security') {
            steps {
                sh 'mkdir -p security-reports'

                dir('backend') {
                    sh 'npm audit --json > ../security-reports/backend-audit.json || true'
                    sh 'npm audit > ../security-reports/backend-audit.txt || true'
                }

                dir('frontend') {
                    sh 'npm audit --json > ../security-reports/frontend-audit.json || true'
                    sh 'npm audit > ../security-reports/frontend-audit.txt || true'
                }

                archiveArtifacts artifacts: 'security-reports/**', fingerprint: true
            }
        }

        stage('Deploy to Staging') {
            steps {
                sh 'docker compose down -v || true'
                sh 'docker compose build'
                sh 'docker compose up -d'
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'sleep 20'
                sh 'curl -f http://localhost:5001/health'
                sh 'curl -I http://localhost:3000'
                sh 'docker compose ps'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check console output.'
            sh 'docker compose logs --no-color || true'
        }
        always {
            archiveArtifacts artifacts: 'frontend/build/**', fingerprint: true
        }
    }
}