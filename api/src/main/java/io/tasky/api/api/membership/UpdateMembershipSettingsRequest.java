package io.tasky.api.api.membership;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;
import java.util.UUID;

public record UpdateMembershipSettingsRequest(
        String customUsername,
        @Min(1) @Max(1440) Integer maxDailyWorkMinutes,
        String timezone,
        List<UUID> memberTypeIds
) {}
