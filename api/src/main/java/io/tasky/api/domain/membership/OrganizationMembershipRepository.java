package io.tasky.api.domain.membership;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;

public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, UUID> {
    Optional<OrganizationMembership> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    Optional<OrganizationMembership> findByUserIdAndOrganizationIdAndIsActiveTrue(UUID userId, UUID organizationId);
    Optional<OrganizationMembership> findByIdAndOrganizationId(UUID id, UUID organizationId);
    Optional<OrganizationMembership> findByIdAndOrganizationIdAndIsActiveTrue(UUID id, UUID organizationId);
    List<OrganizationMembership> findByOrganizationId(UUID organizationId);
    List<OrganizationMembership> findByOrganizationIdAndIsActiveTrue(UUID organizationId);
    List<OrganizationMembership> findByOrganizationIdAndIsActiveTrueOrderByUser_UsernameAscIdAsc(UUID organizationId);
    List<OrganizationMembership> findByUserId(UUID userId);
    List<OrganizationMembership> findByUserIdAndIsActiveTrue(UUID userId);
    List<OrganizationMembership> findByUserIdAndInvitationStatus(UUID userId, InvitationStatus invitationStatus);
    List<OrganizationMembership> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    List<OrganizationMembership> findTop20ByOrganizationIdAndIsActiveTrueAndUser_UsernameContainingIgnoreCaseOrderByUser_UsernameAsc(
            UUID organizationId, String username);
    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    List<OrganizationMembership> findByOrganizationIdAndIsActiveTrueAndPrimaryDepartmentIdIn(
            UUID organizationId, Set<UUID> departmentIds);
    List<OrganizationMembership> findByOrganizationIdAndIsActiveTrueAndPrimaryDepartmentIdInOrderByUser_UsernameAscIdAsc(
            UUID organizationId, Set<UUID> departmentIds);
    List<OrganizationMembership> findByUserEmailIgnoreCaseAndIsActiveTrue(String email);
}
