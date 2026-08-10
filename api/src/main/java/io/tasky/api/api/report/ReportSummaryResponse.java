package io.tasky.api.api.report;

import java.util.List;

public record ReportSummaryResponse(
        List<WeeklyHoursPoint> weeklyHours,
        List<ProjectHoursPoint> projectHours,
        List<MemberProductivityPoint> memberProductivity,
        double dailyAverage,
        double totalHours,
        long totalActivities,
        double billableHours,
        double nonBillableHours,
        long estimatedSeconds,
        long actualSeconds,
        long remainingSeconds,
        double progressPercent,
        double revenue,
        double cost,
        double margin
) {
    public record WeeklyHoursPoint(String day, double hours) {}
    public record ProjectHoursPoint(java.util.UUID projectId, String project, String color, double hours) {}
    public record MemberProductivityPoint(String name, double hours, long activities) {}
}
