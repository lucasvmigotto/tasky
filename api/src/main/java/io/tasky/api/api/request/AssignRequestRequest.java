package io.tasky.api.api.request;

import java.util.UUID;

public record AssignRequestRequest(
        UUID assigneeMembershipId
) {}
