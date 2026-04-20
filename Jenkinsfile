pipeline {
    agent any

    environment {
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        RELEASE_VERSION = "v1.0.${BUILD_NUMBER}"
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

        stage('Code Quality') {
            tools {
                jdk 'JDK17'
            }
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQubeCloud') {
                        sh """
                        ${scannerHome}/bin/sonar-scanner \
                        -Dsonar.projectKey=Anshul4764_smart-expense-tracker \
                        -Dsonar.organization=anshul4764 \
                        -Dsonar.sources=backend,frontend/src \
                        -Dsonar.exclusions=**/node_modules/**,**/build/**,**/coverage/**,**/*.test.js \
                        -Dsonar.host.url=https://sonarcloud.io \
                        -Dsonar.login=${SONAR_AUTH_TOKEN}
                        """
                    }
                }
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

        stage('Monitoring') {
            steps {
                sh 'mkdir -p monitoring-reports'
                sh 'curl -s http://localhost:5001/health > monitoring-reports/backend-health.json'
                sh 'curl -I http://localhost:3000 > monitoring-reports/frontend-health.txt'
                sh 'docker compose ps > monitoring-reports/container-status.txt'
                archiveArtifacts artifacts: 'monitoring-reports/**', fingerprint: true
            }
        }

        stage('Release') {
            steps {
                sh 'mkdir -p release-reports'
                sh 'echo $RELEASE_VERSION > release-reports/release-version.txt'
                sh 'git rev-parse HEAD > release-reports/release-commit.txt'
                sh 'date > release-reports/release-date.txt'
                sh 'echo "Release prepared successfully: $RELEASE_VERSION" > release-reports/release-summary.txt'
                archiveArtifacts artifacts: 'release-reports/**', fingerprint: true
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