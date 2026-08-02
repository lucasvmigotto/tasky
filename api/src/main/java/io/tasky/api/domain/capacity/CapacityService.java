package io.tasky.api.domain.capacity;

import io.tasky.api.api.capacity.AssignWorkScheduleRequest;
import io.tasky.api.api.capacity.CreateMembershipLeaveRequest;
import io.tasky.api.api.capacity.CreateOrganizationHolidayRequest;
import io.tasky.api.api.capacity.CreateWorkScheduleRequest;
import io.tasky.api.api.capacity.MemberCapacityResponse;
import io.tasky.api.api.capacity.MembershipLeavePeriodResponse;
import io.tasky.api.api.capacity.MembershipWorkScheduleResponse;
import io.tasky.api.api.capacity.OrganizationHolidayResponse;
import io.tasky.api.api.capacity.UpdateMembershipLeaveRequest;
import io.tasky.api.api.capacity.UpdateWorkScheduleRequest;
import io.tasky.api.api.capacity.WorkScheduleDayRequest;
import io.tasky.api.api.capacity.WorkScheduleDayResponse;
import io.tasky.api.api.capacity.WorkScheduleResponse;
import io.tasky.api.api.common.ConflictException;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CapacityService {

    private final WorkScheduleRepository workScheduleRepository;
    private final WorkScheduleDayRepository workScheduleDayRepository;
    private final OrganizationHolidayRepository organizationHolidayRepository;
    private final MembershipLeavePeriodRepository membershipLeavePeriodRepository;
    private final MembershipWorkScheduleRepository membershipWorkScheduleRepository;
    private final CapacityQueryRepository capacityQueryRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;
    private final PermissionService permissionService;

    public WorkScheduleResponse createWorkSchedule(SecurityUser user, CreateWorkScheduleRequest request) {
        UUID orgId = requireOrgId(user);
        requireCapacityManager(user, orgId);
        String name = requireName(request.name());
        if (workScheduleRepository.existsByOrganizationIdAndName(orgId, name)) {
            throw new ConflictException("A work schedule with this name already exists");
        }
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault());
        if (makeDefault) {
            workScheduleRepository.clearDefault(orgId);
        }
        WorkSchedule schedule = workScheduleRepository.save(WorkSchedule.builder()
                .organization(organizationRepository.getReferenceById(orgId))
                .name(name)
                .description(blankToNull(request.description()))
                .isDefault(makeDefault)
                .build());
        saveDays(schedule, request.days());
        return toWorkScheduleResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<WorkScheduleResponse> getWorkSchedules(SecurityUser user) {
        UUID orgId = requireOrgId(user);
        List<WorkSchedule> schedules = workScheduleRepository.findByOrganizationIdOrderByIsDefaultDescNameAsc(orgId);
        List<UUID> scheduleIds = schedules.stream().map(WorkSchedule::getId).toList();
        Map<UUID, List<WorkScheduleDay>> daysBySchedule = scheduleIds.isEmpty() ? Map.of()
                : workScheduleDayRepository.findByWorkScheduleIdIn(scheduleIds).stream()
                        .collect(Collectors.groupingBy(day -> day.getWorkSchedule().getId()));
        return schedules.stream()
                .map(schedule -> toWorkScheduleResponse(schedule, daysBySchedule.getOrDefault(schedule.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkScheduleResponse getWorkSchedule(SecurityUser user, UUID scheduleId) {
        UUID orgId = requireOrgId(user);
        WorkSchedule schedule = workScheduleRepository.findByIdAndOrganizationId(scheduleId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Work schedule not found"));
        List<WorkScheduleDay> days = workScheduleDayRepository.findByWorkScheduleId(schedule.getId());
        return toWorkScheduleResponse(schedule, days);
    }

    public WorkScheduleResponse updateWorkSchedule(SecurityUser user, UUID scheduleId, UpdateWorkScheduleRequest request) {
        UUID orgId = requireOrgId(user);
        requireCapacityManager(user, orgId);
        WorkSchedule schedule = workScheduleRepository.findByIdAndOrganizationId(scheduleId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Work schedule not found"));
        String name = requireName(request.name());
        if (!name.equals(schedule.getName()) && workScheduleRepository.existsByOrganizationIdAndName(orgId, name)) {
            throw new ConflictException("A work schedule with this name already exists");
        }
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault());
        if (makeDefault && !schedule.isDefault()) {
            workScheduleRepository.clearDefault(orgId);
        }
        schedule.setName(name);
        schedule.setDescription(blankToNull(request.description()));
        schedule.setDefault(makeDefault);
        WorkSchedule saved = workScheduleRepository.save(schedule);
        saveDays(saved, request.days());
        return toWorkScheduleResponse(saved);
    }

    public void deleteWorkSchedule(SecurityUser user, UUID scheduleId) {
        UUID orgId = requireOrgId(user);
        requireCapacityManager(user, orgId);
        WorkSchedule schedule = workScheduleRepository.findByIdAndOrganizationId(scheduleId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Work schedule not found"));
        workScheduleDayRepository.deleteByWorkScheduleId(schedule.getId());
        workScheduleRepository.delete(schedule);
    }

    public OrganizationHolidayResponse createHoliday(SecurityUser user, CreateOrganizationHolidayRequest request) {
        UUID orgId = requireOrgId(user);
        requireCapacityManager(user, orgId);
        if (organizationHolidayRepository.existsByOrganizationIdAndHolidayDate(orgId, request.holidayDate())) {
            throw new ConflictException("A holiday already exists on " + request.holidayDate());
        }
        OrganizationHoliday holiday = organizationHolidayRepository.save(OrganizationHoliday.builder()
                .organization(organizationRepository.getReferenceById(orgId))
                .name(requireName(request.name()))
                .holidayDate(request.holidayDate())
                .isRecurringYearly(Boolean.TRUE.equals(request.isRecurringYearly()))
                .build());
        return toHolidayResponse(holiday);
    }

    @Transactional(readOnly = true)
    public List<OrganizationHolidayResponse> getHolidays(SecurityUser user, LocalDate from, LocalDate to) {
        UUID orgId = requireOrgId(user);
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("to must be on or after from");
        }
        List<OrganizationHoliday> holidays = (from != null && to != null)
                ? organizationHolidayRepository.findByOrganizationIdInRange(orgId, from, to)
                : organizationHolidayRepository.findByOrganizationIdOrderByHolidayDateAsc(orgId);
        return holidays.stream().map(this::toHolidayResponse).toList();
    }

    public void deleteHoliday(SecurityUser user, UUID holidayId) {
        UUID orgId = requireOrgId(user);
        requireCapacityManager(user, orgId);
        OrganizationHoliday holiday = organizationHolidayRepository.findByIdAndOrganizationId(holidayId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Holiday not found"));
        organizationHolidayRepository.delete(holiday);
    }

    public MembershipLeavePeriodResponse createLeave(SecurityUser user, CreateMembershipLeaveRequest request) {
        UUID orgId = requireOrgId(user);
        UUID targetMembershipId = request.membershipId() != null ? request.membershipId() : requireSelf(user, orgId);
        OrganizationMembership target = requireScopedMembership(user, orgId, targetMembershipId);
        LocalDate start = request.startDate();
        LocalDate end = request.endDate();
        requireOrderedRange(start, end);
        if (!membershipLeavePeriodRepository.findOverlapping(target.getId(), orgId, start, end.plusDays(1), null).isEmpty()) {
            throw new ConflictException("Leave period overlaps an existing period for this member");
        }
        LeaveStatus status = request.status() != null
                ? resolveLeaveStatus(user, orgId, request.status())
                : LeaveStatus.REQUESTED;
        MembershipLeavePeriod period = membershipLeavePeriodRepository.save(MembershipLeavePeriod.builder()
                .organization(organizationRepository.getReferenceById(orgId))
                .membership(target)
                .leaveType(request.leaveType() != null ? request.leaveType() : LeaveType.OTHER)
                .status(status)
                .startDate(start)
                .endDate(end)
                .note(blankToNull(request.note()))
                .build());
        return toLeaveResponse(period);
    }

    @Transactional(readOnly = true)
    public List<MembershipLeavePeriodResponse> getLeave(SecurityUser user, UUID requestedMembershipId) {
        UUID orgId = requireOrgId(user);
        Set<UUID> scoped = permissionService.scopedMembershipIds(user, orgId);
        if (requestedMembershipId != null) {
            if (!scoped.contains(requestedMembershipId)) {
                throw new SecurityException("Not allowed to view leave for this member");
            }
            return membershipLeavePeriodRepository
                    .findByOrganizationIdAndMembershipIdOrderByStartDateAsc(orgId, requestedMembershipId).stream()
                    .map(this::toLeaveResponse)
                    .toList();
        }
        if (scoped.isEmpty()) {
            return List.of();
        }
        return membershipLeavePeriodRepository
                .findByOrganizationIdAndMembershipIdInOrderByStartDateAsc(orgId, new ArrayList<>(scoped)).stream()
                .map(this::toLeaveResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MembershipLeavePeriodResponse getLeaveById(SecurityUser user, UUID leaveId) {
        UUID orgId = requireOrgId(user);
        MembershipLeavePeriod period = membershipLeavePeriodRepository.findByIdAndOrganizationId(leaveId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Leave period not found"));
        Set<UUID> scoped = permissionService.scopedMembershipIds(user, orgId);
        if (!scoped.contains(period.getMembership().getId())) {
            throw new SecurityException("Not allowed to view leave for this member");
        }
        return toLeaveResponse(period);
    }

    public MembershipLeavePeriodResponse updateLeave(SecurityUser user, UUID leaveId, UpdateMembershipLeaveRequest request) {
        UUID orgId = requireOrgId(user);
        MembershipLeavePeriod period = membershipLeavePeriodRepository.findByIdAndOrganizationId(leaveId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Leave period not found"));
        if (!permissionService.canManageMembershipCapacity(user, orgId, period.getMembership().getId())) {
            throw new SecurityException("Not allowed to manage leave for this member");
        }
        LocalDate start = request.startDate() != null ? request.startDate() : period.getStartDate();
        LocalDate end = request.endDate() != null ? request.endDate() : period.getEndDate();
        requireOrderedRange(start, end);
        if (request.startDate() != null || request.endDate() != null) {
            if (!membershipLeavePeriodRepository.findOverlapping(period.getMembership().getId(), orgId, start, end.plusDays(1), leaveId).isEmpty()) {
                throw new ConflictException("Leave period overlaps an existing period for this member");
            }
        }
        if (request.status() != null) {
            period.setStatus(resolveLeaveStatus(user, orgId, request.status()));
        }
        period.setLeaveType(request.leaveType() != null ? request.leaveType() : period.getLeaveType());
        period.setStartDate(start);
        period.setEndDate(end);
        if (request.note() != null) {
            period.setNote(blankToNull(request.note()));
        }
        return toLeaveResponse(membershipLeavePeriodRepository.save(period));
    }

    public void deleteLeave(SecurityUser user, UUID leaveId) {
        UUID orgId = requireOrgId(user);
        MembershipLeavePeriod period = membershipLeavePeriodRepository.findByIdAndOrganizationId(leaveId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Leave period not found"));
        if (!permissionService.canManageMembershipCapacity(user, orgId, period.getMembership().getId())) {
            throw new SecurityException("Not allowed to manage leave for this member");
        }
        membershipLeavePeriodRepository.delete(period);
    }

    public MembershipWorkScheduleResponse assignSchedule(SecurityUser user, UUID targetMembershipId, AssignWorkScheduleRequest request) {
        UUID orgId = requireOrgId(user);
        OrganizationMembership target = requireScopedMembership(user, orgId, targetMembershipId);
        WorkSchedule schedule = workScheduleRepository.findByIdAndOrganizationId(request.scheduleId(), orgId)
                .orElseThrow(() -> new IllegalArgumentException("Work schedule not found"));
        LocalDate from = request.effectiveFrom();
        LocalDate to = request.effectiveTo();
        if (to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("effective_to must be on or after effective_from");
        }
        LocalDate toExclusive = to != null ? to.plusDays(1) : null;
        if (!membershipWorkScheduleRepository.findOverlapping(target.getId(), orgId, from, toExclusive, null).isEmpty()) {
            throw new ConflictException("Schedule assignment overlaps an existing assignment for this member");
        }
        MembershipWorkSchedule placement = membershipWorkScheduleRepository.save(MembershipWorkSchedule.builder()
                .organization(organizationRepository.getReferenceById(orgId))
                .membership(target)
                .workSchedule(schedule)
                .effectiveFrom(from)
                .effectiveTo(to)
                .build());
        return toPlacementResponse(placement);
    }

    @Transactional(readOnly = true)
    public List<MembershipWorkScheduleResponse> getPlacements(SecurityUser user, UUID targetMembershipId) {
        UUID orgId = requireOrgId(user);
        if (!permissionService.canManageMembershipCapacity(user, orgId, targetMembershipId)) {
            throw new SecurityException("Not allowed to view schedules for this member");
        }
        return membershipWorkScheduleRepository.findByOrganizationIdAndMembershipIdOrderByEffectiveFromAsc(orgId, targetMembershipId).stream()
                .map(this::toPlacementResponse)
                .toList();
    }

    public void removePlacement(SecurityUser user, UUID targetMembershipId, UUID placementId) {
        UUID orgId = requireOrgId(user);
        if (!permissionService.canManageMembershipCapacity(user, orgId, targetMembershipId)) {
            throw new SecurityException("Not allowed to manage schedules for this member");
        }
        MembershipWorkSchedule placement = membershipWorkScheduleRepository.findByIdAndOrganizationId(placementId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Schedule assignment not found"));
        if (!placement.getMembership().getId().equals(targetMembershipId)) {
            throw new IllegalArgumentException("Schedule assignment does not belong to this member");
        }
        membershipWorkScheduleRepository.delete(placement);
    }

    @Transactional(readOnly = true)
    public List<MemberCapacityResponse> getMemberCapacity(SecurityUser user, Instant from, Instant to) {
        UUID orgId = requireOrgId(user);
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (!to.isAfter(from)) {
            throw new IllegalArgumentException("to must be after from");
        }
        Set<UUID> scoped = permissionService.scopedMembershipIds(user, orgId);
        if (scoped.isEmpty()) {
            return List.of();
        }
        List<OrganizationMembership> members = membershipRepository.findAllById(scoped).stream()
                .filter(member -> member.getOrganization().getId().equals(orgId))
                .toList();
        if (members.isEmpty()) {
            return List.of();
        }
        List<UUID> memberIds = members.stream().map(OrganizationMembership::getId).toList();
        String memberIdsCsv = memberIds.stream().map(UUID::toString).collect(Collectors.joining(","));
        Map<UUID, Long> available = toMembershipLongMap(
                capacityQueryRepository.sumAvailableSeconds(orgId, from, to, memberIdsCsv),
                CapacityProjection.Available::getMembershipId,
                CapacityProjection.Available::getAvailableSeconds);
        Map<UUID, Long> planned = toMembershipLongMap(
                capacityQueryRepository.sumPlannedSeconds(orgId, from, to, memberIdsCsv),
                CapacityProjection.Planned::getMembershipId,
                CapacityProjection.Planned::getPlannedSeconds);
        Map<UUID, Long> actual = toMembershipLongMap(
                capacityQueryRepository.sumActualSeconds(orgId, from, to, Instant.now(), memberIdsCsv),
                CapacityProjection.Actual::getMembershipId,
                CapacityProjection.Actual::getActualSeconds);
        return members.stream()
                .map(member -> buildCapacity(member, from, to,
                        available.getOrDefault(member.getId(), 0L),
                        planned.getOrDefault(member.getId(), 0L),
                        actual.getOrDefault(member.getId(), 0L)))
                .toList();
    }

    private MemberCapacityResponse buildCapacity(OrganizationMembership member, Instant from, Instant to,
                                                 long availableSeconds, long plannedSeconds, long actualSeconds) {
        long remainingCapacitySeconds = Math.max(0, availableSeconds - plannedSeconds);
        long overloadSeconds = Math.max(0, plannedSeconds - availableSeconds);
        double utilization = availableSeconds > 0 ? round4(actualSeconds / (double) availableSeconds) : 0.0;
        return new MemberCapacityResponse(
                member.getId(), displayName(member), from, to,
                availableSeconds, plannedSeconds, actualSeconds,
                remainingCapacitySeconds, utilization, overloadSeconds);
    }

    private void saveDays(WorkSchedule schedule, List<WorkScheduleDayRequest> days) {
        workScheduleDayRepository.deleteByWorkScheduleId(schedule.getId());
        if (days == null || days.isEmpty()) {
            return;
        }
        Set<Short> seen = new HashSet<>();
        for (WorkScheduleDayRequest day : days) {
            if (!seen.add(day.dayOfWeek())) {
                throw new ConflictException("Duplicate day_of_week " + day.dayOfWeek() + " in work schedule");
            }
            boolean workDay = day.isWorkDay() == null || day.isWorkDay();
            if (workDay && (day.startTime() == null || day.endTime() == null)) {
                throw new IllegalArgumentException("start_time and end_time are required for working days");
            }
            if (workDay && !day.endTime().isAfter(day.startTime())) {
                throw new IllegalArgumentException("end_time must be after start_time");
            }
            workScheduleDayRepository.save(WorkScheduleDay.builder()
                    .workSchedule(schedule)
                    .dayOfWeek(day.dayOfWeek())
                    .isWorkDay(workDay)
                    .startTime(day.startTime())
                    .endTime(day.endTime())
                    .build());
        }
    }

    private LeaveStatus resolveLeaveStatus(SecurityUser user, UUID orgId, LeaveStatus requested) {
        if (requested == null || requested == LeaveStatus.REQUESTED) {
            return LeaveStatus.REQUESTED;
        }
        if (!permissionService.canManageCapacity(user, orgId)) {
            throw new SecurityException("Only admins and managers can approve or reject leave");
        }
        return requested;
    }

    private OrganizationMembership requireScopedMembership(SecurityUser user, UUID orgId, UUID targetMembershipId) {
        if (!permissionService.canManageMembershipCapacity(user, orgId, targetMembershipId)) {
            throw new SecurityException("Not allowed to manage capacity for this member");
        }
        return membershipRepository.findByIdAndOrganizationIdAndIsActiveTrue(targetMembershipId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));
    }

    private void requireCapacityManager(SecurityUser user, UUID orgId) {
        if (!permissionService.canManageCapacity(user, orgId)) {
            throw new SecurityException("Only admins and managers can manage work schedules and holidays");
        }
    }

    private UUID requireSelf(SecurityUser user, UUID orgId) {
        return permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"))
                .getId();
    }

    private void requireOrderedRange(LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("end must be on or after start");
        }
    }

    private UUID requireOrgId(SecurityUser user) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            throw new SecurityException("No active organization");
        }
        return orgId;
    }

    private String requireName(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("name is required");
        }
        return trimmed;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private WorkScheduleResponse toWorkScheduleResponse(WorkSchedule schedule) {
        return toWorkScheduleResponse(schedule, workScheduleDayRepository.findByWorkScheduleId(schedule.getId()));
    }

    private WorkScheduleResponse toWorkScheduleResponse(WorkSchedule schedule, List<WorkScheduleDay> days) {
        List<WorkScheduleDay> ordered = new ArrayList<>(days);
        ordered.sort(Comparator.comparingInt(WorkScheduleDay::getDayOfWeek));
        return new WorkScheduleResponse(
                schedule.getId(), schedule.getName(), schedule.getDescription(), schedule.isDefault(),
                ordered.stream().map(day -> new WorkScheduleDayResponse(
                        day.getId(), day.getDayOfWeek(), day.isWorkDay(), day.getStartTime(), day.getEndTime())).toList(),
                schedule.getCreatedAt(), schedule.getUpdatedAt());
    }

    private OrganizationHolidayResponse toHolidayResponse(OrganizationHoliday holiday) {
        return new OrganizationHolidayResponse(
                holiday.getId(), holiday.getName(), holiday.getHolidayDate(), holiday.isRecurringYearly(), holiday.getCreatedAt());
    }

    private MembershipLeavePeriodResponse toLeaveResponse(MembershipLeavePeriod period) {
        return new MembershipLeavePeriodResponse(
                period.getId(), period.getMembership().getId(), period.getLeaveType(), period.getStatus(),
                period.getStartDate(), period.getEndDate(), period.getNote(), period.getCreatedAt());
    }

    private MembershipWorkScheduleResponse toPlacementResponse(MembershipWorkSchedule placement) {
        return new MembershipWorkScheduleResponse(
                placement.getId(), placement.getMembership().getId(), placement.getWorkSchedule().getId(),
                placement.getEffectiveFrom(), placement.getEffectiveTo(), placement.getCreatedAt());
    }

    private <T> Map<UUID, Long> toMembershipLongMap(List<T> rows, Function<T, UUID> idExtractor, Function<T, Long> valueExtractor) {
        return rows.stream().collect(Collectors.toMap(idExtractor, valueExtractor, (left, right) -> left));
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private String displayName(OrganizationMembership membership) {
        if (isSafeDisplayName(membership.getCustomUsername())) {
            return membership.getCustomUsername();
        }
        if (isSafeDisplayName(membership.getUser().getDisplayName())) {
            return membership.getUser().getDisplayName();
        }
        return membership.getUser().getUsername();
    }

    private boolean isSafeDisplayName(String value) {
        return value != null && !value.isBlank() && !value.contains("@");
    }
}
