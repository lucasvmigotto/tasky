package io.tasky.api.domain.audit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {
    @Mock private AuditEventRepository repository;
    @InjectMocks private AuditService service;

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void record_usesMdcRequestIdAndMasksJsonAndTextSecrets() {
        MDC.put("requestId", "request-123");
        String data = "{\"token\":\"abc\",\"refreshToken\":\"def\",\"safe\":\"visible\"}, password=hunter2";

        service.record(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "test", UUID.randomUUID(), "UPDATE", data, data, null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(repository).save(captor.capture());
        AuditEvent event = captor.getValue();
        assertEquals("request-123", event.getRequestId());
        assertFalse(event.getBeforeData().contains("abc"));
        assertFalse(event.getBeforeData().contains("def"));
        assertFalse(event.getBeforeData().contains("hunter2"));
        assertEquals(event.getBeforeData(), event.getAfterData());
    }
}
