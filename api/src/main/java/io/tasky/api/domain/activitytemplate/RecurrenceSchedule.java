package io.tasky.api.domain.activitytemplate;

import java.time.Instant;
import java.time.ZoneId;

public final class RecurrenceSchedule {
    private RecurrenceSchedule() {}

    public static Instant next(Instant occurrence, RecurrenceFrequency frequency, int interval, String timezone) {
        var localOccurrence = occurrence.atZone(ZoneId.of(timezone));
        return switch (frequency) {
            case DAILY -> localOccurrence.plusDays(interval).toInstant();
            case WEEKLY -> localOccurrence.plusWeeks(interval).toInstant();
        };
    }
}
