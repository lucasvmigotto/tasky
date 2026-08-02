package io.tasky.api.domain.report;

import io.tasky.api.api.report.ReportDetailedRow;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.label.LabelRepository;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {
    @Mock private TimeEntryRepository timeEntryRepository;
    @Mock private ActivityRepository activityRepository;
    @Mock private OrganizationMembershipRepository membershipRepository;
    @Mock private LabelRepository labelRepository;
    @Mock private OrganizationRepository organizationRepository;
    @InjectMocks private ReportService service;

    @Test
    void buildCsv_prefixesFormulaCapableTextCells() {
        ReportDetailedRow row = new ReportDetailedRow(
                UUID.randomUUID(), "=HYPERLINK(\"https://evil.example\")", "+cmd", "  @SUM(1,1)",
                Instant.parse("2026-01-01T08:00:00Z"), Instant.parse("2026-01-01T09:00:00Z"),
                1, "DRAFT", 0, 0, 0, false, List.of("-danger"));

        String csv = service.buildCsv(List.of(row));

        assertTrue(csv.contains("\"'=HYPERLINK(\"\"https://evil.example\"\")\""));
        assertTrue(csv.contains("\"'+cmd\""));
        assertTrue(csv.contains("\"'  @SUM(1,1)\""));
        assertTrue(csv.contains("\"'-danger\""));
    }

    @Test
    void requireSupportedExportFormat_rejectsUnsupportedFormat() {
        assertThrows(IllegalArgumentException.class, () -> service.requireSupportedExportFormat("json"));
    }
}
