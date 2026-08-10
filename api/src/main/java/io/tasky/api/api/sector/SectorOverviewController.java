package io.tasky.api.api.sector;

import io.tasky.api.domain.sector.SectorOverviewService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/sector")
@RequiredArgsConstructor
public class SectorOverviewController {

    private final SectorOverviewService sectorOverviewService;

    @GetMapping
    public ResponseEntity<SectorOverviewResponse> getOverview(@AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(sectorOverviewService.getOverview(user));
    }
}
