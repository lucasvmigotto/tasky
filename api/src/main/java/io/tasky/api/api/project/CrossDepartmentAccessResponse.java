package io.tasky.api.api.project;

import java.time.Instant;
import java.util.UUID;

public record CrossDepartmentAccessResponse(
        UUID id,
        UUID projectId,
        UUID departmentId,
        UUID grantedBy,
        Instant grantedAt
) {}
