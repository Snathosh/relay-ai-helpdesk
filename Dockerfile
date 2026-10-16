FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /workspace/backend
COPY backend/pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline
COPY backend/src ./src
COPY --from=frontend-build /workspace/frontend/dist ./src/main/resources/static
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=backend-build /workspace/backend/target/helpdesk-api-0.1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60.0", "-XX:ActiveProcessorCount=2", "-jar", "/app/app.jar"]