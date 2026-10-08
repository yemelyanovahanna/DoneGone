pipeline {
    agent any

    environment {
        REGISTRY = 'ghcr.io'
        GHCR_NAMESPACE = 'yemelyanovahanna'

        BACKEND_IMAGE = 'donegone-backend'
        FRONTEND_IMAGE = 'donegone-frontend'
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

        stage('Push Docker Images') {
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
            echo 'DoneGone CI and Docker publish completed successfully.'
        }

        failure {
            echo 'DoneGone pipeline failed.'
        }
    }
}