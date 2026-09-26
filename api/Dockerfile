FROM eclipse-temurin:25-jdk@sha256:97014c4b396021f9ddb7d592a7dbedb0c4e4215c29e03dc01c393558aefb71c2 AS builder

WORKDIR /app

RUN --mount=type=bind,source=gradlew,target=gradlew \
    --mount=type=bind,source=settings.gradle,target=settings.gradle \
    --mount=type=bind,source=build.gradle,target=build.gradle \
    --mount=type=bind,source=gradle,target=gradle \
    --mount=type=bind,source=api/build.gradle,target=api/build.gradle \
    --mount=type=bind,source=api/src,target=api/src \
    ./gradlew :api:build --no-daemon -x test

FROM eclipse-temurin:25-jre@sha256:bb036ed6cfdc57e3da7c22634d15f1b840d2caf76183861c80e81ca4b5104abb

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/false appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appuser /app/api/build/libs/*.jar app.jar

COPY --chown=appuser:appuser api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -sf http://localhost:8080/actuator/health || exit 1

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]

CMD [ "-jar", "app.jar" ]
