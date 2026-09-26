package io.tasky.api.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * PHASE 6 (T-19b): domain counters behind the RED dashboards.
 * Export latency histograms land with the async worker (Phase 7).
 */
@Component
public class TaskyMetrics {

    private final Counter timersStarted;
    private final Counter overlapsRejected;
    private final Counter refreshReused;
    private final Counter exportsCreated;
    private final Counter exportsDownloaded;

    public TaskyMetrics(MeterRegistry registry) {
        this.timersStarted = Counter.builder("tasky.timers.started")
                .description("Timers started").register(registry);
        this.overlapsRejected = Counter.builder("tasky.overlap.rejected")
                .description("Time entries rejected for overlap").register(registry);
        this.refreshReused = Counter.builder("tasky.refresh.reused")
                .description("Refresh token reuse detections (family revoked)").register(registry);
        this.exportsCreated = Counter.builder("tasky.exports.created")
                .description("Report export jobs created").register(registry);
        this.exportsDownloaded = Counter.builder("tasky.exports.downloaded")
                .description("Report export downloads served").register(registry);
    }

    public void timerStarted() {
        timersStarted.increment();
    }

    public void overlapRejected() {
        overlapsRejected.increment();
    }

    public void refreshReused() {
        refreshReused.increment();
    }

    public void exportCreated() {
        exportsCreated.increment();
    }

    public void exportDownloaded() {
        exportsDownloaded.increment();
    }
}
