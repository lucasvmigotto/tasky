package io.tasky.api.api.membertype;

import jakarta.validation.constraints.NotBlank;

public record CreateMemberTypeRequest(@NotBlank String name, Boolean isActive) {}
