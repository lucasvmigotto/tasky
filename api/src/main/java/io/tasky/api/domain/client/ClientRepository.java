package io.tasky.api.domain.client;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findByOrganizationId(UUID organizationId);
    Optional<Client> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndName(UUID organizationId, String name);
}
