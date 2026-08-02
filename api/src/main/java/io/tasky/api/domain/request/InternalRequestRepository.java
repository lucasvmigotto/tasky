package io.tasky.api.domain.request;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface InternalRequestRepository extends JpaRepository<InternalRequest, UUID>, JpaSpecificationExecutor<InternalRequest> {

    @Query(value = """
        INSERT INTO request_sequences (organization_id, year, last_value)
        VALUES (:orgId, :year, 1)
        ON CONFLICT (organization_id) DO UPDATE
        SET last_value = CASE WHEN request_sequences.year = :year THEN request_sequences.last_value + 1 ELSE 1 END,
            year = :year
        RETURNING last_value
        """, nativeQuery = true)
    long nextSequence(@Param("orgId") UUID orgId, @Param("year") int year);

    @Query("""
        select count(r) > 0 from InternalRequest r
        where r.organization.id = :orgId and r.requestKey = :key
        """)
    boolean existsByOrganizationIdAndRequestKey(@Param("orgId") UUID orgId, @Param("key") String key);
}
