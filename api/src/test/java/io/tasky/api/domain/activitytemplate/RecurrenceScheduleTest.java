package io.tasky.api.domain.activitytemplate;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RecurrenceScheduleTest {
    @Test
    void dailyRecurrencePreservesLocalTimeAcrossDstChange() {
        Instant beforeDstChange = Instant.parse("2026-03-07T14:00:00Z"); // 09:00 America/New_York

        Instant next = RecurrenceSchedule.next(
                beforeDstChange, RecurrenceFrequency.DAILY, 1, "America/New_York");

        assertEquals(Instant.parse("2026-03-08T13:00:00Z"), next);
    }

    @Test
    void weeklyRecurrenceAppliesConfiguredInterval() {
        Instant occurrence = Instant.parse("2026-01-05T12:00:00Z");

        Instant next = RecurrenceSchedule.next(
                occurrence, RecurrenceFrequency.WEEKLY, 2, "UTC");

        assertEquals(Instant.parse("2026-01-19T12:00:00Z"), next);
    }
}
