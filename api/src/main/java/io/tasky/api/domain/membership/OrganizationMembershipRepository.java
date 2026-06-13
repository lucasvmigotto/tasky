package io.tasky.api.domain.membership;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, UUID> {
    Optional<OrganizationMembership> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    List<OrganizationMembership> findByOrganizationId(UUID organizationId);
    List<OrganizationMembership> findByUserId(UUID userId);
    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);
}
