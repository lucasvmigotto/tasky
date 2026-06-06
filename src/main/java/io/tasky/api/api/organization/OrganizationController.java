package io.tasky.api.api.organization;

import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<OrganizationResponse> create(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        User creator = userRepository.findById(user.id())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Organization org = organizationService.createOrganization(request.name(), request.slug(), creator);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(org));
    }

    private OrganizationResponse toResponse(Organization org) {
        return new OrganizationResponse(
                org.getId().toString(),
                org.getName(),
                org.getSlug(),
                org.getCreatedAt()
        );
    }
}
