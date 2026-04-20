pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Backend Dependencies') {
      steps {
        dir('backend') {
          sh 'npm install'
        }
      }
    }

    stage('Backend Smoke Test') {
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

    stage('Build Frontend') {
      steps {
        dir('frontend') {
          sh 'cp .env.example .env'
          sh 'npm run build'
        }
      }
    }

    stage('Archive Build') {
      steps {
        archiveArtifacts artifacts: 'frontend/build/**', fingerprint: true
      }
    }

    stage('Deploy Placeholder') {
      steps {
        echo 'Add your deployment command here, for example Docker, PM2, or cloud deployment.'
      }
    }
  }
}
stage('Code Quality') {
    steps {
        script {
            def scannerHome = tool 'SonarScanner'
            withSonarQubeEnv('SonarQubeCloud') {
                sh """
                ${scannerHome}/bin/sonar-scanner \
                -Dsonar.projectKey=YOUR_PROJECT_KEY \
                -Dsonar.organization=YOUR_ORG \
                -Dsonar.sources=backend,frontend/src \
                -Dsonar.exclusions=**/node_modules/**,**/build/**,**/coverage/**,**/*.test.js
                """
            }
        }
    }
}