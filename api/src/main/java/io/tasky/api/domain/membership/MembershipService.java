package io.tasky.api.domain.membership;

import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.domain.team.Team;
import io.tasky.api.domain.team.TeamRepository;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.domain.session.RefreshSessionService;
import io.tasky.api.api.common.ConflictException;
import io.tasky.api.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.Instant;
import java.time.zone.ZoneRulesException;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MembershipService {

    private static final long INVITATION_VALID_DAYS = 14;

    private final OrganizationMembershipRepository membershipRepository;
    private final ManagerDepartmentRepository managerDepartmentRepository;
    private final LeaderTeamRepository leaderTeamRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PermissionService permissionService;
    private final RefreshSessionService refreshSessionService;
    private final NotificationService notificationService;

    private static final Comparator<OrganizationMembership> VISIBLE_MEMBERSHIP_ORDER = Comparator
            .comparing((OrganizationMembership membership) -> membership.getUser().getUsername(),
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
            .thenComparing(OrganizationMembership::getId);

    public OrganizationMembership inviteUser(
            UUID orgId, String email, Role role,
            List<UUID> departmentIds, List<UUID> teamIds,
            OrganizationMembership inviter
    ) {
        if (!inviter.isActive() || !inviter.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Inviter is not active in this organization");
        }
        if (!permissionService.canInviteRole(inviter.getRole(), role)) {
            throw new SecurityException("Cannot invite user with role " + role);
        }

        Placement placement = resolvePlacement(orgId, role, departmentIds, teamIds);
        validateInviterScope(inviter, role, placement);

        String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseGet(() -> userService.createInvitedUser(normalizedEmail));

        Organization org = organizationRepository.getReferenceById(orgId);
        Instant now = Instant.now();
        OrganizationMembership membership = membershipRepository.findByUserIdAndOrganizationId(user.getId(), orgId)
                .map(existing -> prepareReinvite(existing, role, placement, inviter, now))
                .orElseGet(() -> OrganizationMembership.builder()
                        .user(user)
                        .organization(org)
                        .role(role)
                        .primaryDepartmentId(placement.primaryDepartmentId())
                        .primaryTeamId(placement.primaryTeamId())
                        .maxDailyWorkMinutes(480)
                        .invitationStatus(InvitationStatus.PENDING)
                        .invitedAt(now)
                        .expiresAt(now.plusSeconds(INVITATION_VALID_DAYS * 24 * 3600))
                        .invitedBy(inviter)
                        .isActive(false)
                        .build());
        membership = membershipRepository.save(membership);

        notificationService.createOnce(orgId, membership.getId(),
                "membership-invitation:" + membership.getId() + ":" + membership.getInvitedAt(),
                "MEMBERSHIP_INVITED", "Acesso a organizacao",
                "Seu acesso institucional foi ativado com sucesso.",
                "membership", membership.getId());

        if (role == Role.manager) {
            for (Department dept : placement.departments()) {
                managerDepartmentRepository.save(ManagerDepartment.builder()
                        .id(new ManagerDepartment.ManagerDepartmentId(membership.getId(), dept.getId()))
                        .membership(membership)
                        .department(dept)
                        .build());
            }
        }

        if (role == Role.leader) {
            for (Team team : placement.teams()) {
                leaderTeamRepository.save(LeaderTeam.builder()
                        .id(new LeaderTeam.LeaderTeamId(membership.getId(), team.getId()))
                        .membership(membership)
                        .team(team)
                        .build());
            }
        }

        return membership;
    }

    public List<OrganizationMembership> getVisibleMemberships(UUID orgId, UUID requesterUserId) {
        MembershipVisibilityScope scope = resolveVisibilityScope(orgId, requesterUserId);
        List<OrganizationMembership> scoped = switch (scope.requester().getRole()) {
            case admin -> membershipRepository
                    .findByOrganizationIdAndIsActiveTrueOrderByUser_UsernameAscIdAsc(orgId);
            case manager -> scope.departmentIds().isEmpty() ? List.of() : membershipRepository
                    .findByOrganizationIdAndIsActiveTrueAndPrimaryDepartmentIdInOrderByUser_UsernameAscIdAsc(
                            orgId, scope.departmentIds());
            case leader -> scope.teamIds().isEmpty() ? List.of() : membershipRepository
                    .findByOrganizationIdAndIsActiveTrueAndPrimaryTeamIdInOrderByUser_UsernameAscIdAsc(
                            orgId, scope.teamIds());
            case employee -> List.of();
        };

        LinkedHashMap<UUID, OrganizationMembership> visible = new LinkedHashMap<>();
        scoped.forEach(membership -> visible.put(membership.getId(), membership));
        visible.put(scope.requester().getId(), scope.requester());
        return visible.values().stream().sorted(VISIBLE_MEMBERSHIP_ORDER).toList();
    }

    public OrganizationMembership getVisibleActiveMembership(UUID orgId, UUID requesterUserId, UUID membershipId) {
        MembershipVisibilityScope scope = resolveVisibilityScope(orgId, requesterUserId);
        OrganizationMembership target = membershipRepository.findByIdAndOrganizationIdAndIsActiveTrue(membershipId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));
        if (!isVisible(scope, target)) {
            throw new SecurityException("Membership is outside your scope");
        }
        return target;
    }

    public OrganizationMembership getMembership(UUID orgId, UUID membershipId) {
        return membershipRepository.findByIdAndOrganizationId(membershipId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));
    }

    public OrganizationMembership updateSettings(UUID orgId, UUID membershipId, String customUsername, Integer maxDailyWorkMinutes, String timezone) {
        OrganizationMembership membership = getMembership(orgId, membershipId);

        if (customUsername != null) {
            membership.setCustomUsername(customUsername);
        }
        if (maxDailyWorkMinutes != null) {
            membership.setMaxDailyWorkMinutes(maxDailyWorkMinutes);
        }
        if (timezone != null) {
            membership.setTimezone(timezone.isBlank() ? null : validateTimezone(timezone));
        }
        return membershipRepository.save(membership);
    }

    public List<OrganizationMembership> getInvitations(UUID orgId, OrganizationMembership requester) {
        expireOverdueInvitations(orgId);
        return membershipRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).stream()
                .filter(membership -> canManageInvitation(requester, membership))
                .toList();
    }

    public void revokeInvitation(UUID orgId, UUID membershipId, OrganizationMembership requester) {
        OrganizationMembership membership = getMembership(orgId, membershipId);
        if (!canManageInvitation(requester, membership)) {
            throw new SecurityException("You cannot manage this invitation");
        }
        if (membership.getInvitationStatus() != InvitationStatus.PENDING) {
            throw new ConflictException("Only pending invitations can be revoked");
        }
        membership.setInvitationStatus(InvitationStatus.REVOKED);
        membership.setRevokedAt(Instant.now());
        membership.setActive(false);
        membershipRepository.save(membership);
    }

    public void acceptPendingInvitations(User user, String verifiedEmail) {
        String normalizedEmail = verifiedEmail.trim().toLowerCase(java.util.Locale.ROOT);
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) return;
        Instant now = Instant.now();
        membershipRepository.findByUserIdAndInvitationStatus(user.getId(), InvitationStatus.PENDING)
                .forEach(membership -> {
                    if (membership.getExpiresAt() == null || !membership.getExpiresAt().isAfter(now)) {
                        membership.setInvitationStatus(InvitationStatus.EXPIRED);
                        membership.setActive(false);
                        return;
                    }
                    membership.setInvitationStatus(InvitationStatus.ACCEPTED);
                    membership.setAcceptedAt(now);
                    membership.setRevokedAt(null);
                    membership.setActive(true);
                    if (membership.getInvitedBy() != null) {
                        notificationService.createOnce(membership.getOrganization().getId(),
                                membership.getInvitedBy().getId(),
                                "membership-invitation:" + membership.getId() + ":accepted:" + membership.getInvitedAt(),
                                "MEMBERSHIP_INVITATION_ACCEPTED", "Convite aceito",
                                membership.getUser().getEmail() + " ativou o acesso.",
                                "membership", membership.getId());
                    }
                });
    }

    private String validateTimezone(String timezone) {
        try {
            return ZoneId.of(timezone).getId();
        } catch (ZoneRulesException e) {
            throw new IllegalArgumentException("Invalid timezone");
        }
    }

    public void removeMember(UUID orgId, UUID membershipId) {
        OrganizationMembership membership = membershipRepository.findByIdAndOrganizationId(membershipId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        long adminCount = membershipRepository.findByOrganizationIdAndIsActiveTrue(orgId).stream()
                .filter(m -> m.getRole() == Role.admin)
                .count();
        if (membership.getRole() == Role.admin && adminCount <= 1) {
            throw new IllegalArgumentException("Cannot remove the last admin of the organization");
        }

        membership.setActive(false);
        membership.setInvitationStatus(InvitationStatus.REVOKED);
        membership.setRevokedAt(Instant.now());
        membershipRepository.save(membership);
        refreshSessionService.revokeAllForUser(membership.getUser().getId());
    }

    public OrganizationMembership changeRole(UUID orgId, UUID membershipId, Role role, UUID departmentId, UUID teamId) {
        OrganizationMembership membership = membershipRepository.findByIdAndOrganizationId(membershipId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));
        long adminCount = membershipRepository.findByOrganizationIdAndIsActiveTrue(orgId).stream()
                .filter(m -> m.getRole() == Role.admin)
                .count();
        if (membership.getRole() == Role.admin && adminCount <= 1 && role != Role.admin) {
            throw new IllegalArgumentException("Cannot demote the last admin of the organization");
        }

        Placement placement = resolvePlacement(
                orgId,
                role,
                departmentId != null ? List.of(departmentId) : List.of(),
                teamId != null ? List.of(teamId) : List.of());

        managerDepartmentRepository.deleteByMembershipId(membershipId);
        leaderTeamRepository.deleteByMembershipId(membershipId);
        membership.setRole(role);
        membership.setPrimaryDepartmentId(placement.primaryDepartmentId());
        membership.setPrimaryTeamId(placement.primaryTeamId());
        OrganizationMembership saved = membershipRepository.save(membership);

        if (role == Role.manager) {
            for (Department department : placement.departments()) {
                managerDepartmentRepository.save(ManagerDepartment.builder()
                        .id(new ManagerDepartment.ManagerDepartmentId(saved.getId(), department.getId()))
                        .membership(saved)
                        .department(department)
                        .build());
            }
        } else if (role == Role.leader) {
            for (Team team : placement.teams()) {
                leaderTeamRepository.save(LeaderTeam.builder()
                        .id(new LeaderTeam.LeaderTeamId(saved.getId(), team.getId()))
                        .membership(saved)
                        .team(team)
                        .build());
            }
        }

        refreshSessionService.revokeAllForUser(saved.getUser().getId());
        return saved;
    }

    private Placement resolvePlacement(UUID orgId, Role role, Collection<UUID> departmentIds, Collection<UUID> teamIds) {
        Set<UUID> distinctDepartmentIds = new LinkedHashSet<>(departmentIds != null ? departmentIds : List.of());
        Set<UUID> distinctTeamIds = new LinkedHashSet<>(teamIds != null ? teamIds : List.of());
        List<Department> departments = distinctDepartmentIds.stream()
                .map(id -> departmentRepository.findByIdAndOrganizationId(id, orgId)
                        .orElseThrow(() -> new IllegalArgumentException("Department not found in this organization")))
                .toList();
        List<Team> teams = distinctTeamIds.stream()
                .map(id -> teamRepository.findById(id)
                        .filter(team -> team.getDepartment().getOrganization().getId().equals(orgId))
                        .orElseThrow(() -> new IllegalArgumentException("Team not found in this organization")))
                .toList();

        if (role == Role.admin) {
            if (!departments.isEmpty() || !teams.isEmpty()) {
                throw new IllegalArgumentException("Organization admins cannot have a scoped placement");
            }
            return new Placement(List.of(), List.of(), null, null);
        }
        if (role == Role.manager) {
            if (departments.isEmpty() || !teams.isEmpty()) {
                throw new IllegalArgumentException("Department managers require at least one department and no team scope");
            }
            return new Placement(departments, List.of(), departments.getFirst().getId(), null);
        }
        if (role == Role.leader) {
            if (teams.isEmpty()) {
                throw new IllegalArgumentException("Team leaders require at least one team");
            }
            UUID departmentId = teams.getFirst().getDepartment().getId();
            if (teams.stream().anyMatch(team -> !team.getDepartment().getId().equals(departmentId))) {
                throw new IllegalArgumentException("A team leader's teams must belong to the same department");
            }
            if (!departments.isEmpty() && (departments.size() != 1 || !departments.getFirst().getId().equals(departmentId))) {
                throw new IllegalArgumentException("Team does not belong to the selected department");
            }
            return new Placement(List.of(teams.getFirst().getDepartment()), teams, departmentId, teams.getFirst().getId());
        }

        if (departments.size() != 1 || teams.size() > 1) {
            throw new IllegalArgumentException("Employees require exactly one department and at most one team");
        }
        if (!teams.isEmpty() && !teams.getFirst().getDepartment().getId().equals(departments.getFirst().getId())) {
            throw new IllegalArgumentException("Team does not belong to the selected department");
        }
        return new Placement(
                departments,
                teams,
                departments.getFirst().getId(),
                teams.isEmpty() ? null : teams.getFirst().getId());
    }

    private OrganizationMembership prepareReinvite(
            OrganizationMembership membership, Role role, Placement placement,
            OrganizationMembership inviter, Instant now) {
        if (membership.getInvitationStatus() == InvitationStatus.PENDING
                || membership.getInvitationStatus() == InvitationStatus.ACCEPTED) {
            throw new ConflictException("User already has a pending or accepted membership");
        }
        managerDepartmentRepository.deleteByMembershipId(membership.getId());
        leaderTeamRepository.deleteByMembershipId(membership.getId());
        membership.setRole(role);
        membership.setPrimaryDepartmentId(placement.primaryDepartmentId());
        membership.setPrimaryTeamId(placement.primaryTeamId());
        membership.setInvitationStatus(InvitationStatus.PENDING);
        membership.setInvitedAt(now);
        membership.setExpiresAt(now.plusSeconds(INVITATION_VALID_DAYS * 24 * 3600));
        membership.setAcceptedAt(null);
        membership.setRevokedAt(null);
        membership.setInvitedBy(inviter);
        membership.setActive(false);
        return membership;
    }

    private void expireOverdueInvitations(UUID orgId) {
        Instant now = Instant.now();
        membershipRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).stream()
                .filter(membership -> membership.getInvitationStatus() == InvitationStatus.PENDING)
                .filter(membership -> membership.getExpiresAt() == null || !membership.getExpiresAt().isAfter(now))
                .forEach(membership -> {
                    membership.setInvitationStatus(InvitationStatus.EXPIRED);
                    membership.setActive(false);
                });
    }

    private boolean canManageInvitation(OrganizationMembership requester, OrganizationMembership target) {
        if (!requester.isActive() || !requester.getOrganization().getId().equals(target.getOrganization().getId())) {
            return false;
        }
        if (requester.getRole() == Role.admin) return true;
        if (requester.getRole() == Role.manager) {
            if (target.getRole() == Role.admin || target.getRole() == Role.manager || target.getPrimaryDepartmentId() == null) {
                return false;
            }
            return managerDepartmentRepository.existsByMembershipIdAndDepartmentId(
                    requester.getId(), target.getPrimaryDepartmentId());
        }
        return requester.getRole() == Role.leader
                && target.getRole() == Role.employee
                && target.getPrimaryTeamId() != null
                && leaderTeamRepository.existsByMembershipIdAndTeamId(requester.getId(), target.getPrimaryTeamId());
    }

    private MembershipVisibilityScope resolveVisibilityScope(UUID orgId, UUID requesterUserId) {
        OrganizationMembership requester = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(requesterUserId, orgId)
                .orElseThrow(() -> new SecurityException("Active membership is required"));
        Set<UUID> departmentIds = requester.getRole() == Role.manager
                ? managerDepartmentRepository.findByMembershipId(requester.getId()).stream()
                        .map(scope -> scope.getDepartment().getId())
                        .collect(java.util.stream.Collectors.toSet())
                : Set.of();
        Set<UUID> teamIds = requester.getRole() == Role.leader
                ? leaderTeamRepository.findByMembershipId(requester.getId()).stream()
                        .map(scope -> scope.getTeam().getId())
                        .collect(java.util.stream.Collectors.toSet())
                : Set.of();
        return new MembershipVisibilityScope(requester, departmentIds, teamIds);
    }

    private boolean isVisible(MembershipVisibilityScope scope, OrganizationMembership target) {
        if (scope.requester().getId().equals(target.getId()) || scope.requester().getRole() == Role.admin) {
            return true;
        }
        if (scope.requester().getRole() == Role.manager) {
            return target.getPrimaryDepartmentId() != null
                    && scope.departmentIds().contains(target.getPrimaryDepartmentId());
        }
        return scope.requester().getRole() == Role.leader
                && target.getPrimaryTeamId() != null
                && scope.teamIds().contains(target.getPrimaryTeamId());
    }

    private void validateInviterScope(OrganizationMembership inviter, Role targetRole, Placement placement) {
        if (inviter.getRole() == Role.admin) {
            return;
        }
        if (inviter.getRole() == Role.manager) {
            Set<UUID> managedDepartments = managerDepartmentRepository.findByMembershipId(inviter.getId()).stream()
                    .map(scope -> scope.getDepartment().getId())
                    .collect(java.util.stream.Collectors.toSet());
            boolean allowed = placement.departments().stream()
                    .allMatch(department -> managedDepartments.contains(department.getId()));
            if (!allowed || targetRole == Role.manager || targetRole == Role.admin) {
                throw new SecurityException("Cannot invite members outside managed departments");
            }
            return;
        }
        if (inviter.getRole() == Role.leader) {
            Set<UUID> ledTeams = leaderTeamRepository.findByMembershipId(inviter.getId()).stream()
                    .map(scope -> scope.getTeam().getId())
                    .collect(java.util.stream.Collectors.toSet());
            if (targetRole != Role.employee || placement.primaryTeamId() == null
                    || !ledTeams.contains(placement.primaryTeamId())) {
                throw new SecurityException("Team leaders can only invite employees to teams they lead");
            }
            return;
        }
        throw new SecurityException("Employees cannot invite organization members");
    }

    private record Placement(
            List<Department> departments,
            List<Team> teams,
            UUID primaryDepartmentId,
            UUID primaryTeamId
    ) {}

    private record MembershipVisibilityScope(
            OrganizationMembership requester,
            Set<UUID> departmentIds,
            Set<UUID> teamIds
    ) {}
}
