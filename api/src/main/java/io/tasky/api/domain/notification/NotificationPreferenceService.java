package io.tasky.api.domain.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationPreferenceService {
    private final NotificationPreferenceRepository repository;

    @Transactional(readOnly = true)
    public Map<NotificationPreferenceType, Boolean> get(UUID membershipId) {
        Map<NotificationPreferenceType, Boolean> preferences = defaults();
        repository.findByMembershipId(membershipId)
                .forEach(preference -> preferences.put(preference.getType(), preference.isEnabled()));
        return preferences;
    }

    public Map<NotificationPreferenceType, Boolean> replace(
            UUID membershipId, Map<NotificationPreferenceType, Boolean> preferences) {
        if (preferences == null || !preferences.keySet().equals(Set.of(NotificationPreferenceType.values()))
                || preferences.containsValue(null)) {
            throw new IllegalArgumentException("All notification preferences are required");
        }
        preferences.forEach((type, enabled) -> repository.upsert(membershipId, type.name(), enabled));
        return new EnumMap<>(preferences);
    }

    private EnumMap<NotificationPreferenceType, Boolean> defaults() {
        EnumMap<NotificationPreferenceType, Boolean> defaults = new EnumMap<>(NotificationPreferenceType.class);
        List.of(NotificationPreferenceType.values()).forEach(type -> defaults.put(type, true));
        return defaults;
    }
}
