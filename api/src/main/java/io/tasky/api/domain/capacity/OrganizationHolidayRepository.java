package io.tasky.api.domain.capacity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationHolidayRepository extends JpaRepository<OrganizationHoliday, UUID> {
    List<OrganizationHoliday> findByOrganizationIdOrderByHolidayDateAsc(UUID organizationId);
    Optional<OrganizationHoliday> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndHolidayDate(UUID organizationId, LocalDate holidayDate);

    @Query(value = """
        SELECT h.*
        FROM organization_holidays h
        WHERE h.organization_id = :orgId
          AND (h.holiday_date BETWEEN :from AND :to
               OR (h.is_recurring_yearly
                   AND EXISTS (
                       SELECT 1 FROM generate_series(:from, :to, interval '1 day') g(d)
                       WHERE extract(month from g.d) = extract(month from h.holiday_date)
                         AND extract(day from g.d) = extract(day from h.holiday_date)
                   )))
        ORDER BY h.holiday_date
        """, nativeQuery = true)
    List<OrganizationHoliday> findByOrganizationIdInRange(
            @Param("orgId") UUID organizationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
