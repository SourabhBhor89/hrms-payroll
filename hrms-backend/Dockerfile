# Use OpenJDK 21 as the base image
FROM eclipse-temurin:21-jdk-alpine

# Set working directory
WORKDIR /app

# Copy Maven wrapper files
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Cache dependencies to speed up build
RUN chmod +x mvnw && ./mvnw dependency:go-offline

# Copy the project source
COPY src ./src

# Build the application
RUN ./mvnw clean package -DskipTests

# Expose application port
EXPOSE 8080

# Production environment variables for Cross-Site Cookie Policy
ENV COOKIE_SECURE=true
ENV COOKIE_SAME_SITE=None

# Run the Spring Boot application
CMD ["java", "-jar", "target/hrms-backend-0.0.1-SNAPSHOT.jar"]