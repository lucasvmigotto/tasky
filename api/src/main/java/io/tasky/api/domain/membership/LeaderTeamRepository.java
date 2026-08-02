package io.tasky.api.domain.membership;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LeaderTeamRepository extends JpaRepository<LeaderTeam, LeaderTeam.LeaderTeamId> {
    List<LeaderTeam> findByMembershipId(UUID membershipId);
    boolean existsByMembershipIdAndTeamId(UUID membershipId, UUID teamId);
    void deleteByMembershipId(UUID membershipId);

    @Query("select lt.team.department.id from LeaderTeam lt where lt.membership.id = :membershipId")
    List<UUID> findDepartmentIdsByMembershipId(@Param("membershipId") UUID membershipId);
}
