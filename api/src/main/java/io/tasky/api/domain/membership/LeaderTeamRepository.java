package io.tasky.api.domain.membership;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaderTeamRepository extends JpaRepository<LeaderTeam, LeaderTeam.LeaderTeamId> {
    List<LeaderTeam> findByMembershipId(UUID membershipId);
    boolean existsByMembershipIdAndTeamId(UUID membershipId, UUID teamId);
}
