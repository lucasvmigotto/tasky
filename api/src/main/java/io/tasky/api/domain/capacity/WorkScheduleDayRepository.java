package io.tasky.api.domain.capacity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface WorkScheduleDayRepository extends JpaRepository<WorkScheduleDay, UUID> {
    List<WorkScheduleDay> findByWorkScheduleId(UUID workScheduleId);
    List<WorkScheduleDay> findByWorkScheduleIdIn(Collection<UUID> workScheduleIds);
    void deleteByWorkScheduleId(UUID workScheduleId);
}
