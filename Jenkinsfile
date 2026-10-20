pipeline {
    agent any

    environment {
        REGISTRY = 'ghcr.io'
        GHCR_NAMESPACE = 'yemelyanovahanna'

        BACKEND_IMAGE = 'donegone-backend'
        FRONTEND_IMAGE = 'donegone-frontend'
    }

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
    }

    parameters {
        booleanParam(name: 'PUBLISH_IMAGES', defaultValue: true, description: 'Publish tested images to GHCR')
        booleanParam(name: 'VERIFY_FAILURE_GATE', defaultValue: false, description: 'Demonstrate a deliberately failing API assertion')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            parallel {

                stage('Backend dependencies') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }

                stage('Frontend dependencies') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Install Newman') {
            steps { sh 'npm ci' }
        }

        stage('Lint') {
            parallel {

                stage('Backend lint') {
                    steps {
                        dir('backend') {
                            sh 'npm run lint'
                        }
                    }
                }

                stage('Frontend lint') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint'
                        }
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    docker build \
                      -t donegone-backend:${BUILD_NUMBER} \
                      ./backend

                    docker build \
                      -t donegone-frontend:${BUILD_NUMBER} \
                      ./frontend
                '''
            }
        }

        stage('API Tests with Newman') {
            steps {
                withEnv([
                    "BACKEND_IMAGE_REF=donegone-backend:${BUILD_NUMBER}",
                    "FRONTEND_IMAGE_REF=donegone-frontend:${BUILD_NUMBER}",
                    "EXPECT_HEALTH_STATUS=${params.VERIFY_FAILURE_GATE ? '201' : '200'}"
                ]) {
                    sh 'bash scripts/ci-api.sh'
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
            steps {
                sh 'echo "API tests passed; subsequent stages are allowed" > reports/gate-passed.txt'
                archiveArtifacts artifacts: 'reports/gate-passed.txt'
            }
        }

        stage('Push Docker Images') {
            when { expression { params.PUBLISH_IMAGES } }
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'ghcr-credentials',
                        usernameVariable: 'GHCR_USER',
                        passwordVariable: 'GHCR_TOKEN'
                    )
                ]) {

                    sh '''
                        echo "$GHCR_TOKEN" | \
                        docker login "$REGISTRY" \
                          -u "$GHCR_USER" \
                          --password-stdin

                        docker tag \
                          donegone-backend:${BUILD_NUMBER} \
                          "$REGISTRY/$GHCR_NAMESPACE/$BACKEND_IMAGE:${BUILD_NUMBER}"

                        docker tag \
                          donegone-backend:${BUILD_NUMBER} \
                          "$REGISTRY/$GHCR_NAMESPACE/$BACKEND_IMAGE:latest"

                        docker tag \
                          donegone-frontend:${BUILD_NUMBER} \
                          "$REGISTRY/$GHCR_NAMESPACE/$FRONTEND_IMAGE:${BUILD_NUMBER}"

                        docker tag \
                          donegone-frontend:${BUILD_NUMBER} \
                          "$REGISTRY/$GHCR_NAMESPACE/$FRONTEND_IMAGE:latest"

                        docker push \
                          "$REGISTRY/$GHCR_NAMESPACE/$BACKEND_IMAGE:${BUILD_NUMBER}"

                        docker push \
                          "$REGISTRY/$GHCR_NAMESPACE/$BACKEND_IMAGE:latest"

                        docker push \
                          "$REGISTRY/$GHCR_NAMESPACE/$FRONTEND_IMAGE:${BUILD_NUMBER}"

                        docker push \
                          "$REGISTRY/$GHCR_NAMESPACE/$FRONTEND_IMAGE:latest"

                        docker logout "$REGISTRY"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'DoneGone CI and automated API tests completed successfully.'
        }

        failure {
            echo 'DoneGone pipeline failed.'
        }
    }
}