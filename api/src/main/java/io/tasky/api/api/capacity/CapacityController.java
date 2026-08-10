package io.tasky.api.api.capacity;

import io.tasky.api.domain.capacity.CapacityService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/capacity")
@RequiredArgsConstructor
public class CapacityController {

    private final CapacityService capacityService;

    @PostMapping("/schedules")
    public ResponseEntity<WorkScheduleResponse> createSchedule(
            @Valid @RequestBody CreateWorkScheduleRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(capacityService.createWorkSchedule(user, request));
    }

    @GetMapping("/schedules")
    public ResponseEntity<List<WorkScheduleResponse>> listSchedules(@AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getWorkSchedules(user));
    }

    @GetMapping("/schedules/{scheduleId}")
    public ResponseEntity<WorkScheduleResponse> getSchedule(
            @PathVariable UUID scheduleId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getWorkSchedule(user, scheduleId));
    }

    @PutMapping("/schedules/{scheduleId}")
    public ResponseEntity<WorkScheduleResponse> updateSchedule(
            @PathVariable UUID scheduleId,
            @Valid @RequestBody UpdateWorkScheduleRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.updateWorkSchedule(user, scheduleId, request));
    }

    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(
            @PathVariable UUID scheduleId,
            @AuthenticationPrincipal SecurityUser user) {
        capacityService.deleteWorkSchedule(user, scheduleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/holidays")
    public ResponseEntity<OrganizationHolidayResponse> createHoliday(
            @Valid @RequestBody CreateOrganizationHolidayRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(capacityService.createHoliday(user, request));
    }

    @GetMapping("/holidays")
    public ResponseEntity<List<OrganizationHolidayResponse>> listHolidays(
            @RequestParam("from") Optional<LocalDate> from,
            @RequestParam("to") Optional<LocalDate> to,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getHolidays(user, from.orElse(null), to.orElse(null)));
    }

    @DeleteMapping("/holidays/{holidayId}")
    public ResponseEntity<Void> deleteHoliday(
            @PathVariable UUID holidayId,
            @AuthenticationPrincipal SecurityUser user) {
        capacityService.deleteHoliday(user, holidayId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/leave")
    public ResponseEntity<MembershipLeavePeriodResponse> createLeave(
            @Valid @RequestBody CreateMembershipLeaveRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(capacityService.createLeave(user, request));
    }

    @GetMapping("/leave")
    public ResponseEntity<List<MembershipLeavePeriodResponse>> listLeave(
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getLeave(user, membershipId.orElse(null)));
    }

    @GetMapping("/leave/{leaveId}")
    public ResponseEntity<MembershipLeavePeriodResponse> getLeave(
            @PathVariable UUID leaveId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getLeaveById(user, leaveId));
    }

    @PutMapping("/leave/{leaveId}")
    public ResponseEntity<MembershipLeavePeriodResponse> updateLeave(
            @PathVariable UUID leaveId,
            @Valid @RequestBody UpdateMembershipLeaveRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.updateLeave(user, leaveId, request));
    }

    @DeleteMapping("/leave/{leaveId}")
    public ResponseEntity<Void> deleteLeave(
            @PathVariable UUID leaveId,
            @AuthenticationPrincipal SecurityUser user) {
        capacityService.deleteLeave(user, leaveId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/members/{membershipId}/schedules")
    public ResponseEntity<MembershipWorkScheduleResponse> assignSchedule(
            @PathVariable UUID membershipId,
            @Valid @RequestBody AssignWorkScheduleRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(capacityService.assignSchedule(user, membershipId, request));
    }

    @GetMapping("/members/{membershipId}/schedules")
    public ResponseEntity<List<MembershipWorkScheduleResponse>> listPlacements(
            @PathVariable UUID membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getPlacements(user, membershipId));
    }

    @DeleteMapping("/members/{membershipId}/schedules/{placementId}")
    public ResponseEntity<Void> removePlacement(
            @PathVariable UUID membershipId,
            @PathVariable UUID placementId,
            @AuthenticationPrincipal SecurityUser user) {
        capacityService.removePlacement(user, membershipId, placementId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/members")
    public ResponseEntity<List<MemberCapacityResponse>> members(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(capacityService.getMemberCapacity(user, from.orElse(null), to.orElse(null)));
    }
}
