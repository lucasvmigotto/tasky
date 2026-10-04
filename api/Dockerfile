FROM docker.io/library/eclipse-temurin:25-jdk@sha256:791193f8d46fe8afeb6360433dd057b88850a78ed440e3d57d2e6340994dd24b AS builder

WORKDIR /app

RUN --mount=type=bind,source=gradlew,target=gradlew \
    --mount=type=bind,source=settings.gradle,target=settings.gradle \
    --mount=type=bind,source=build.gradle,target=build.gradle \
    --mount=type=bind,source=gradle,target=gradle \
    --mount=type=bind,source=api/build.gradle,target=api/build.gradle \
    --mount=type=bind,source=api/src,target=api/src \
    ./gradlew :api:build --no-daemon -x test

FROM docker.io/library/eclipse-temurin:25-jre@sha256:bcc1a99b4bc676717bdc9841c363072ce10e3f34462c4017f7df08e730f485b0

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
