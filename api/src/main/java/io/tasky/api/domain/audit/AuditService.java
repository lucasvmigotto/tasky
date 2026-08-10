package io.tasky.api.domain.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuditService {
    private static final Pattern JSON_SECRET = Pattern.compile(
            "(?i)(\\\"(?:access[_-]?token|refresh[_-]?token|token|secret|password|authorization|api[_-]?key|cookie)\\\"\\s*:\\s*)(\\\"(?:\\\\.|[^\\\"\\\\])*\\\"|[^,}\\s]+)");
    private static final Pattern TEXT_SECRET = Pattern.compile(
            "(?i)((?:access[_-]?token|refresh[_-]?token|token|secret|password|authorization|api[_-]?key|cookie)\\s*[=:]\\s*)[^,};&\\s]+");

    private final AuditEventRepository auditEventRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID organizationId, UUID actorUserId, UUID actorMembershipId,
                       String resourceType, UUID resourceId, String action,
                       String beforeData, String afterData, String requestId) {
        auditEventRepository.save(AuditEvent.builder()
                .organizationId(organizationId)
                .actorUserId(actorUserId)
                .actorMembershipId(actorMembershipId)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .action(action)
                .beforeData(mask(beforeData))
                .afterData(mask(afterData))
                .requestId(requestId != null && !requestId.isBlank() ? requestId : MDC.get("requestId"))
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditEvent> list(UUID organizationId, Pageable pageable) {
        return auditEventRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId, pageable);
    }

    private String mask(String value) {
        if (value == null) return null;
        String jsonMasked = JSON_SECRET.matcher(value).replaceAll("$1\"***\"");
        return TEXT_SECRET.matcher(jsonMasked).replaceAll("$1***");
    }
}
