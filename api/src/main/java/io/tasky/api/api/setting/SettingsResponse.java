package io.tasky.api.api.setting;

import java.util.List;
import java.util.UUID;

public record SettingsResponse(
        String scope,
        UUID orgId,
        List<SettingsGroup> groups
) {
    public record SettingsGroup(
            String name,
            List<SettingValue> settings
    ) {}

    public record SettingValue(
            String key,
            String label,
            String description,
            String valueType,
            List<String> options,
            Double min,
            Double max,
            String value,
            boolean isSet,
            boolean isOverride
    ) {}
}
