package io.tasky.api.api.search;

import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.security.SecurityUser;
import io.tasky.api.security.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {
    private final ProjectRepository projectRepository;
    private final ActivityRepository activityRepository;
    private final MembershipService membershipService;
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<SearchResultResponse>> search(
            @RequestParam("q") String q,
            @AuthenticationPrincipal SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        if (query.length() < 2) {
            return ResponseEntity.ok(List.of());
        }
        var results = new ArrayList<SearchResultResponse>();
        projectRepository.findTop20ByDepartment_Organization_IdAndNameContainingIgnoreCaseOrderByNameAsc(
                        user.activeOrganizationId(), query).stream()
                .filter(p -> permissionService.canReadProject(user, p.getId()))
                .limit(10)
                .forEach(p -> results.add(new SearchResultResponse("project", p.getId(), p.getName(), "Projeto", "/projects/" + p.getId())));
        activityRepository.findTop20ByProject_Department_Organization_IdAndTitleContainingIgnoreCaseOrderByTitleAsc(
                        user.activeOrganizationId(), query).stream()
                .filter(a -> permissionService.canReadActivity(user, a.getId()))
                .limit(10)
                .forEach(a -> results.add(new SearchResultResponse("activity", a.getId(), a.getTitle(), "Atividade", "/activities/" + a.getId())));
        membershipService.getVisibleMemberships(user.activeOrganizationId(), user.id()).stream()
                    .filter(m -> m.getUser().getUsername() != null
                            && m.getUser().getUsername().toLowerCase(Locale.ROOT).contains(query))
                    .limit(10)
                    .forEach(m -> results.add(new SearchResultResponse("member", m.getId(), m.getUser().getUsername(), "Membro", "/admin/members")));
        return ResponseEntity.ok(results.stream().limit(20).toList());
    }
}
