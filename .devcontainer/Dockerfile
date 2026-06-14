FROM mcr.microsoft.com/devcontainers/java:21

RUN curl -fsSL https://bun.sh/install | bash

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
