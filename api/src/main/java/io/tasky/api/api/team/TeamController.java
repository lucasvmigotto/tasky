package io.tasky.api.api.team;

import io.tasky.api.domain.team.Team;
import io.tasky.api.domain.team.TeamService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/departments/{deptId}/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<TeamResponse> create(
            @PathVariable UUID deptId,
            @Valid @RequestBody CreateTeamRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        if (!permissionService.canManageDepartment(user, deptId)) {
            throw new SecurityException("Only admins and managers can create teams");
        }

        Team team = teamService.createTeam(deptId, request.name());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(team));
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> list(
            @PathVariable UUID deptId,
            @AuthenticationPrincipal SecurityUser user) {
        List<Team> teams = teamService.getTeamsByDepartment(deptId);
        return ResponseEntity.ok(teams.stream().map(this::toResponse).toList());
    }

    private TeamResponse toResponse(Team team) {
        return new TeamResponse(
                team.getId(),
                team.getDepartment().getId(),
                team.getName(),
                team.getCreatedAt()
        );
    }
}
