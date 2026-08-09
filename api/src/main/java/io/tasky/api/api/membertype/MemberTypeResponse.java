package io.tasky.api.api.membertype;

import java.time.Instant;
import java.util.UUID;

public record MemberTypeResponse(UUID id, UUID departmentId, String name, boolean isActive,
                                 Instant createdAt, Instant updatedAt) {}
