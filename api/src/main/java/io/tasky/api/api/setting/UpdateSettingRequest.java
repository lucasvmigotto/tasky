package io.tasky.api.api.setting;

import jakarta.validation.constraints.Pattern;

public record UpdateSettingRequest(
        String value,
        @Pattern(regexp = "true|false", message = "clear must be true or false")
        String clear
) {}
