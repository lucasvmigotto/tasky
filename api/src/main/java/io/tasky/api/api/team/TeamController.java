package io.tasky.api.api.team;

import io.tasky.api.domain.team.Team;
import io.tasky.api.domain.team.TeamService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    @PreAuthorize("@access.canManageDepartment(authentication.principal, #deptId)")
    public ResponseEntity<TeamResponse> create(
            @PathVariable UUID deptId,
            @Valid @RequestBody CreateTeamRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        Team team = teamService.createTeam(deptId, request.name());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(team));
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> list(
            @PathVariable UUID deptId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = permissionService.getMembershipByUserAndDepartment(user.id(), deptId)
                .map(m -> m.getOrganization().getId())
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        List<Team> teams = teamService.getTeamsByDepartment(orgId, deptId);
        return ResponseEntity.ok(teams.stream().map(this::toResponse).toList());
    }

    @PutMapping("/{teamId}")
    @PreAuthorize("@access.canManageDepartment(authentication.principal, #deptId)")
    public ResponseEntity<TeamResponse> update(
            @PathVariable UUID deptId,
            @PathVariable UUID teamId,
            @Valid @RequestBody CreateTeamRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        Team team = teamService.renameTeam(deptId, teamId, request.name());
        return ResponseEntity.ok(toResponse(team));
    }

    @DeleteMapping("/{teamId}")
    @PreAuthorize("@access.canManageDepartment(authentication.principal, #deptId)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID deptId,
            @PathVariable UUID teamId,
            @AuthenticationPrincipal SecurityUser user) {

        teamService.deleteTeam(deptId, teamId);
        return ResponseEntity.noContent().build();
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
