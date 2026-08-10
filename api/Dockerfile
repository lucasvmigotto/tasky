FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

RUN --mount=type=bind,source=gradlew,target=gradlew \
    --mount=type=bind,source=settings.gradle,target=settings.gradle \
    --mount=type=bind,source=build.gradle,target=build.gradle \
    --mount=type=bind,source=gradle,target=gradle \
    --mount=type=bind,source=api/build.gradle,target=api/build.gradle \
    --mount=type=bind,source=api/src,target=api/src \
    ./gradlew :api:build --no-daemon -x test

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /app/api/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT [ "java" ]

CMD [ "-jar", "app.jar" ]
