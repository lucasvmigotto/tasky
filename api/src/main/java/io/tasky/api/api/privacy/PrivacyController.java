package io.tasky.api.api.privacy;

import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/privacy")
@RequiredArgsConstructor
public class PrivacyController {
    private final UserRepository userRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final TimeEntryRepository timeEntryRepository;

    @GetMapping("/me/export")
    public ResponseEntity<DataExportResponse> exportMe(@AuthenticationPrincipal SecurityUser user) {
        var currentUser = userRepository.findById(user.id()).orElseThrow(() -> new IllegalArgumentException("User not found"));
        var memberships = membershipRepository.findByUserId(user.id());
        var timeEntries = memberships.stream()
                .flatMap(m -> timeEntryRepository.findByMembershipId(m.getId()).stream())
                .map(e -> new DataExportResponse.TimeEntryData(
                        e.getId(), e.getStartTime(), e.getEndTime(), e.getDurationSeconds()))
                .toList();
        Instant now = Instant.now();
        var data = new DataExportResponse.ExportData(
                new DataExportResponse.UserData(
                        currentUser.getId(), currentUser.getEmail(), currentUser.getUsername()),
                memberships.stream()
                        .map(m -> new DataExportResponse.MembershipData(
                                m.getId(), m.getOrganization().getId(), m.getRole().name()))
                        .toList(),
                timeEntries);
        return ResponseEntity.ok(new DataExportResponse(
                "READY", now, now.plus(java.time.Duration.ofHours(1)), data));
    }
}
