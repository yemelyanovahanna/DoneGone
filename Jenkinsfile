pipeline {
    agent any
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }
    parameters {
        booleanParam(name: 'PUBLISH_IMAGES', defaultValue: true, description: 'Publish tested images to GHCR')
        booleanParam(name: 'DEPLOY_APP', defaultValue: true, description: 'Deploy the published build with Docker Compose')
        booleanParam(name: 'VERIFY_FAILURE_GATE', defaultValue: false, description: 'Deliberately fail one API assertion')
    }
    environment {
        GHCR_NAMESPACE = 'yemelyanovahanna'
        DOCKER_HOST = 'unix:///Users/yemelyaa/.docker/run/docker.sock'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script { env.IMAGE_TAG = "stage5-${env.BUILD_NUMBER}-${sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()}" }
                sh 'mkdir -p reports; rm -f reports/gate-passed.txt reports/published-images.txt reports/deployment.txt reports/newman.xml reports/summary.json'
            }
        }
        stage('Repository credentials check') {
            steps { sh 'node scripts/check-repository-secrets.js' }
        }
        stage('Prepare Docker client') {
            steps {
                sh '''
                    mkdir -p .local-docker
                    node -e 'require("fs").writeFileSync(".local-docker/config.json", JSON.stringify({auths:{"https://index.docker.io/v1/":{}},cliPluginsExtraDirs:["/Applications/Docker.app/Contents/Resources/cli-plugins"]}))'
                '''
                script { env.DOCKER_CONFIG = "${env.WORKSPACE}/.local-docker" }
            }
        }
        stage('Install dependencies') {
            steps {
                sh 'npm ci && npm ci --prefix backend && npm ci --prefix frontend'
            }
        }
        stage('Lint') {
            steps { sh 'npm run lint --prefix backend && npm run lint --prefix frontend' }
        }
        stage('Unit Tests') {
            steps { sh 'npm test --prefix backend' }
        }
        stage('Docker Build') {
            steps {
                sh '''
                    docker build --label org.opencontainers.image.source=https://github.com/yemelyanovahanna/DoneGone -t "donegone-backend:$IMAGE_TAG" ./backend
                    docker build --label org.opencontainers.image.source=https://github.com/yemelyanovahanna/DoneGone -t "donegone-frontend:$IMAGE_TAG" ./frontend
                '''
            }
        }
        stage('Compose and Newman') {
            steps {
                withCredentials([
                    string(credentialsId: 'donegone-ci-db-password', variable: 'CI_DB_PASSWORD'),
                    string(credentialsId: 'donegone-ci-jwt-secret', variable: 'CI_JWT_SECRET')
                ]) {
                    withEnv(["BACKEND_IMAGE_REF=donegone-backend:${env.IMAGE_TAG}",
                             "FRONTEND_IMAGE_REF=donegone-frontend:${env.IMAGE_TAG}",
                             "EXPECT_HEALTH_STATUS=${params.VERIFY_FAILURE_GATE ? '201' : '200'}"]) {
                        sh 'bash scripts/ci-api.sh'
                    }
                }
            }
            post {
                always {
                    junit testResults: 'reports/newman.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'reports/summary.json,reports/newman.xml,reports/compose.log', allowEmptyArchive: true
                }
            }
        }
        stage('API Gate Passed') {
            steps { sh 'echo "All API checks passed" > reports/gate-passed.txt' }
        }
        stage('Publish GHCR') {
            when { expression { params.PUBLISH_IMAGES } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-credentials', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_TOKEN')]) {
                    sh 'bash scripts/publish-images.sh'
                }
                archiveArtifacts artifacts: 'reports/published-images.txt'
            }
        }
        stage('Deploy Compose') {
            when { expression { params.PUBLISH_IMAGES && params.DEPLOY_APP } }
            steps {
                withCredentials([
                    string(credentialsId: 'donegone-stage5-db-password', variable: 'STAGE5_DB_PASSWORD'),
                    string(credentialsId: 'donegone-stage5-jwt-secret', variable: 'STAGE5_JWT_SECRET')
                ]) { sh 'bash scripts/deploy-stage5.sh' }
                archiveArtifacts artifacts: 'reports/deployment.txt'
            }
        }
    }
    post {
        success { echo 'DoneGone pipeline completed successfully. Check executed stages and archived evidence.' }
        failure { echo 'DoneGone pipeline failed; subsequent stages were blocked.' }
    }
}
