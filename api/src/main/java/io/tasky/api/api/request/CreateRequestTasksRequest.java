package io.tasky.api.api.request;

import io.tasky.api.domain.activity.ActivityPriority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateRequestTasksRequest(
        @NotEmpty List<@Valid TaskItem> items
) {
    public record TaskItem(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 5000) String description,
            ActivityPriority priority,
            Short weight,
            Long estimatedSeconds,
            Instant dueDate,
            List<UUID> assigneeMembershipIds
    ) {}
}
