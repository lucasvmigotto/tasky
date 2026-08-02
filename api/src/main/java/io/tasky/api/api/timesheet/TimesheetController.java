package io.tasky.api.api.timesheet;

import io.tasky.api.domain.timesheet.TimesheetPeriod;
import io.tasky.api.domain.timesheet.TimesheetPeriodService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/timesheets")
@RequiredArgsConstructor
@Transactional
public class TimesheetController {

    private final TimesheetPeriodService timesheetPeriodService;

    @PostMapping("/periods")
    public ResponseEntity<TimesheetPeriodResponse> create(
            @Valid @RequestBody CreateTimesheetPeriodRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        TimesheetPeriod period = timesheetPeriodService.createPeriod(user, request.periodStart());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(period));
    }

    @GetMapping("/periods")
    public ResponseEntity<List<TimesheetPeriodResponse>> list(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @AuthenticationPrincipal SecurityUser user) {
        List<TimesheetPeriodResponse> periods = timesheetPeriodService
                .listOwn(user, from.orElse(null), to.orElse(null))
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(periods);
    }

    @PostMapping("/periods/{periodId}/submit")
    public ResponseEntity<TimesheetPeriodResponse> submit(
            @PathVariable UUID periodId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(toResponse(timesheetPeriodService.submitPeriod(user, periodId)));
    }

    @PostMapping("/periods/{periodId}/reopen")
    public ResponseEntity<TimesheetPeriodResponse> reopen(
            @PathVariable UUID periodId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(toResponse(timesheetPeriodService.reopenPeriod(user, periodId)));
    }

    @PostMapping("/periods/approve")
    public ResponseEntity<List<TimesheetPeriodResponse>> approve(
            @Valid @RequestBody ApproveTimesheetPeriodsRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        List<TimesheetPeriodResponse> periods = timesheetPeriodService
                .approvePeriods(user, request.periodIds())
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(periods);
    }

    @PostMapping("/periods/reject")
    public ResponseEntity<List<TimesheetPeriodResponse>> reject(
            @Valid @RequestBody RejectTimesheetPeriodsRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        List<TimesheetPeriodResponse> periods = timesheetPeriodService
                .rejectPeriods(user, request.periodIds(), request.comment())
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(periods);
    }

    @PostMapping("/periods/{periodId}/close")
    public ResponseEntity<TimesheetPeriodResponse> close(
            @PathVariable UUID periodId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(toResponse(timesheetPeriodService.closePeriod(user, periodId)));
    }

    @GetMapping("/periods/approval-queue")
    public ResponseEntity<List<TimesheetPeriodQueueItem>> approvalQueue(@AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(timesheetPeriodService.approvalQueue(user));
    }

    private TimesheetPeriodResponse toResponse(TimesheetPeriod period) {
        return new TimesheetPeriodResponse(
                period.getId(),
                period.getOrganization().getId(),
                period.getMembership().getId(),
                period.getPeriodStart(),
                period.getPeriodEnd(),
                period.getStatus(),
                period.getSubmittedAt(),
                period.getApprovedAt(),
                period.getApprovedBy() != null ? period.getApprovedBy().getId() : null,
                period.getRejectionComment(),
                period.getVersion(),
                period.getCreatedAt(),
                period.getUpdatedAt()
        );
    }
}
