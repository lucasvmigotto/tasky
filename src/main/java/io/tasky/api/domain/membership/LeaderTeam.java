package io.tasky.api.domain.membership;

import io.tasky.api.domain.team.Team;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "leader_teams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderTeam {

    @EmbeddedId
    private LeaderTeamId id;

    @MapsId("membershipId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_id", nullable = false)
    private OrganizationMembership membership;

    @MapsId("teamId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderTeamId implements Serializable {
        private UUID membershipId;
        private UUID teamId;
    }
}
