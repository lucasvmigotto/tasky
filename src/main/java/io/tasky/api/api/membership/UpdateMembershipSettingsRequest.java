package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.Role;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateMembershipSettingsRequest(
        String customUsername,
        @Min(1) @Max(1440) Integer maxDailyWorkMinutes
) {}
