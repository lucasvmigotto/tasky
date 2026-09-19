package io.tasky.api.config;

import io.sentry.Sentry;
import io.sentry.SentryOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * PHASE 6: manual Sentry init (the Spring Boot starter's auto-configuration
 * targets Boot 3 and breaks Boot 4 startup). Empty DSN = no-op.
 */
@Configuration
public class SentryConfig {

    private static final Logger log = LoggerFactory.getLogger(SentryConfig.class);

    @Value("${sentry.dsn:}")
    private String dsn;

    @Value("${sentry.traces-sample-rate:0.1}")
    private double tracesSampleRate;

    @PostConstruct
    void init() {
        if (dsn == null || dsn.isBlank()) {
            return;
        }
        SentryOptions options = new SentryOptions();
        options.setDsn(dsn);
        options.setTracesSampleRate(tracesSampleRate);
        options.setSendDefaultPii(false);
        Sentry.init(options);
        log.info("Sentry initialized");
    }
}
