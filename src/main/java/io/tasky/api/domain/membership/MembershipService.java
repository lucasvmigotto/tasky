package io.tasky.api.domain.membership;

import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.team.Team;
import io.tasky.api.domain.team.TeamRepository;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MembershipService {

    private final OrganizationMembershipRepository membershipRepository;
    private final ManagerDepartmentRepository managerDepartmentRepository;
    private final LeaderTeamRepository leaderTeamRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PermissionService permissionService;

    public OrganizationMembership inviteUser(
            UUID orgId, String email, Role role,
            List<UUID> departmentIds, List<UUID> teamIds,
            OrganizationMembership inviter
    ) {
        if (!permissionService.canInviteRole(inviter.getRole(), role)) {
            throw new SecurityException("Cannot invite user with role " + role);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found. They must login first."));

        if (membershipRepository.existsByUserIdAndOrganizationId(user.getId(), orgId)) {
            throw new IllegalArgumentException("User is already a member of this organization");
        }

        Organization org = organizationRepository.getReferenceById(orgId);

        OrganizationMembership membership = OrganizationMembership.builder()
                .user(user)
                .organization(org)
                .role(role)
                .maxDailyWorkMinutes(480)
                .build();
        membership = membershipRepository.save(membership);

        if (role == Role.manager && departmentIds != null) {
            for (UUID deptId : departmentIds) {
                Department dept = departmentRepository.getReferenceById(deptId);
                managerDepartmentRepository.save(ManagerDepartment.builder()
                        .id(new ManagerDepartment.ManagerDepartmentId(membership.getId(), deptId))
                        .membership(membership)
                        .department(dept)
                        .build());
            }
        }

        if (role == Role.leader && teamIds != null) {
            for (UUID teamId : teamIds) {
                Team team = teamRepository.getReferenceById(teamId);
                leaderTeamRepository.save(LeaderTeam.builder()
                        .id(new LeaderTeam.LeaderTeamId(membership.getId(), teamId))
                        .membership(membership)
                        .team(team)
                        .build());
            }
        }

        return membership;
    }

    public List<OrganizationMembership> getMemberships(UUID orgId) {
        return membershipRepository.findByOrganizationId(orgId);
    }

    public OrganizationMembership updateSettings(UUID membershipId, String customUsername, Integer maxDailyWorkMinutes) {
        OrganizationMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        if (customUsername != null) {
            membership.setCustomUsername(customUsername);
        }
        if (maxDailyWorkMinutes != null) {
            membership.setMaxDailyWorkMinutes(maxDailyWorkMinutes);
        }
        return membershipRepository.save(membership);
    }
}
