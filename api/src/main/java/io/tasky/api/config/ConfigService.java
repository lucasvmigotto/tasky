package io.tasky.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tasky.api.domain.audit.AuditService;
import io.tasky.api.domain.setting.AppSetting;
import io.tasky.api.domain.setting.AppSettingRepository;
import io.tasky.api.domain.setting.SettingScope;
import io.tasky.api.domain.setting.SettingValueType;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Reads, seeds and writes the parameterized settings stored in {@code app_settings}.
 * Resolution order: ORGANIZATION override &gt; GLOBAL value &gt; registry default.
 * Values are cached in memory and invalidated on every write (single instance via Docker).
 */
@Service
@RequiredArgsConstructor
public class ConfigService {

    private static final Logger log = LoggerFactory.getLogger(ConfigService.class);
    private static final String AZURE_CONNECTION_ENV = "AZURE_STORAGE_CONNECTION_STRING";

    private final AppSettingRepository repository;
    private final ConfigRegistry registry;
    private final AuditService auditService;
    private final Environment environment;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile Map<String, String> globalValues = Map.of();
    private final Map<UUID, Map<String, String>> orgOverrides = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        refreshGlobals();
    }

    @Transactional
    public synchronized void refreshGlobals() {
        Map<String, String> values = new HashMap<>();
        List<AppSetting> stored = repository.findByScope(SettingScope.GLOBAL);
        for (AppSetting setting : stored) {
            values.put(setting.getKey(), setting.getValue());
        }
        seedFromEnvironment(values);
        this.globalValues = Map.copyOf(values);
        this.orgOverrides.clear();
        log.info("Settings loaded: {} global keys", values.size());
    }

    private void seedFromEnvironment(Map<String, String> values) {
        ConfigRegistry.SettingDefinition azure = registry.get(ConfigRegistry.KEY_STORAGE_AZURE_CONNECTION);
        if (azure != null && !values.containsKey(azure.key())) {
            String envValue = environment.getProperty(AZURE_CONNECTION_ENV);
            if (envValue != null && !envValue.isBlank()) {
                values.put(azure.key(), envValue);
                repository.save(AppSetting.builder()
                        .key(azure.key())
                        .scope(SettingScope.GLOBAL)
                        .valueType(SettingValueType.SECRET)
                        .value(envValue)
                        .description(azure.description())
                        .build());
                log.info("Seeded Azure connection string from environment");
            }
        }
    }

    // ---- typed getters (GLOBAL only) ----

    public String getString(String key) {
        return resolve(key, null);
    }

    public String getString(UUID orgId, String key) {
        return resolve(key, orgId);
    }

    public boolean getBoolean(String key) {
        return Boolean.parseBoolean(resolve(key, null));
    }

    public boolean getBoolean(UUID orgId, String key) {
        return Boolean.parseBoolean(resolve(key, orgId));
    }

    public double getNumber(String key) {
        return parseNumber(resolve(key, null), key);
    }

    public double getNumber(UUID orgId, String key) {
        return parseNumber(resolve(key, orgId), key);
    }

    public int getInt(String key) {
        return (int) getNumber(key);
    }

    public int getInt(UUID orgId, String key) {
        return (int) getNumber(orgId, key);
    }

    public long getLong(String key) {
        return (long) getNumber(key);
    }

    public Duration getDuration(String key) {
        String raw = resolve(key, null);
        return Duration.parse("PT" + raw.trim().toUpperCase(Locale.ROOT));
    }

    public String getJson(String key) {
        return resolve(key, null);
    }

    public String getSecret(String key) {
        return resolve(key, null);
    }

    /** Raw resolved value (org override > global > default), for API consumption. */
    public String rawValue(String key, UUID orgId) {
        return resolve(key, orgId);
    }

    /** True when the organization has an explicit override for this key. */
    public boolean hasOrgOverride(String key, UUID orgId) {
        return orgOverride(key, orgId) != null;
    }

    public boolean isSecretSet(String key) {
        String raw = resolve(key, null);
        return raw != null && !raw.isBlank();
    }

    private double parseNumber(String raw, String key) {
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Setting " + key + " is not a number: " + raw);
        }
    }

    private String resolve(String key, UUID orgId) {
        ConfigRegistry.SettingDefinition definition = requireDefinition(key);
        if (orgId != null) {
            String override = orgOverride(key, orgId);
            if (override != null) {
                return override;
            }
        }
        String global = globalValues.get(key);
        if (global != null) {
            return global;
        }
        return definition.defaultValue();
    }

    private String orgOverride(String key, UUID orgId) {
        Map<String, String> overrides = orgOverrides.get(orgId);
        if (overrides == null) {
            overrides = loadOrgOverrides(orgId);
        }
        return overrides.get(key);
    }

    private Map<String, String> loadOrgOverrides(UUID orgId) {
        Map<String, String> overrides = new HashMap<>();
        for (AppSetting setting : repository.findByScopeAndOrgId(SettingScope.ORGANIZATION, orgId)) {
            overrides.put(setting.getKey(), setting.getValue());
        }
        Map<String, String> unmodifiable = Map.copyOf(overrides);
        orgOverrides.put(orgId, unmodifiable);
        return unmodifiable;
    }

    private ConfigRegistry.SettingDefinition requireDefinition(String key) {
        ConfigRegistry.SettingDefinition definition = registry.get(key);
        if (definition == null) {
            throw new IllegalArgumentException("Unknown setting: " + key);
        }
        return definition;
    }

    // ---- writes ----

    @Transactional
    public AppSetting update(String key, SettingScope scope, UUID orgId, String value, boolean clear,
                             UUID actorUserId, UUID auditOrgId) {
        ConfigRegistry.SettingDefinition definition = requireDefinition(key);
        if (!definition.scopes().contains(scope)) {
            throw new IllegalArgumentException("Setting " + key + " is not allowed in scope " + scope);
        }
        if (scope == SettingScope.ORGANIZATION && orgId == null) {
            throw new IllegalArgumentException("Organization scope requires orgId");
        }

        AppSetting setting = repository.findByScopeAndOrgIdAndKey(scope, orgId, key).orElse(null);
        String before = setting != null ? setting.getValue() : globalValues.get(key);

        if (clear) {
            if (setting != null) {
                repository.delete(setting);
            }
            evict(key, scope, orgId);
            auditService.record(auditOrgId, actorUserId, null, "setting", null,
                    "SETTING_UPDATED", mask(before), null, null);
            return null;
        }

        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Value is required");
        }
        String validated = validate(definition, value);

        if (setting == null) {
            setting = AppSetting.builder()
                    .key(key)
                    .scope(scope)
                    .orgId(orgId)
                    .valueType(definition.valueType())
                    .value(validated)
                    .description(definition.description())
                    .updatedBy(actorUserId)
                    .build();
        } else {
            setting.setValue(validated);
            setting.setUpdatedBy(actorUserId);
        }
        AppSetting saved = repository.save(setting);
        evict(key, scope, orgId);
        auditService.record(auditOrgId, actorUserId, null, "setting", null,
                "SETTING_UPDATED", mask(before), mask(validated), null);
        return saved;
    }

    private String validate(ConfigRegistry.SettingDefinition definition, String value) {
        return switch (definition.valueType()) {
            case BOOLEAN -> {
                if (!value.equalsIgnoreCase("true") && !value.equalsIgnoreCase("false")) {
                    throw new IllegalArgumentException("Expected a boolean (true/false)");
                }
                yield value.toLowerCase(Locale.ROOT);
            }
            case NUMBER -> {
                double parsed;
                try {
                    parsed = Double.parseDouble(value);
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Expected a number");
                }
                if (definition.min() != null && parsed < definition.min()) {
                    throw new IllegalArgumentException("Value must be >= " + definition.min());
                }
                if (definition.max() != null && parsed > definition.max()) {
                    throw new IllegalArgumentException("Value must be <= " + definition.max());
                }
                yield String.valueOf(parsed);
            }
            case JSON -> {
                try {
                    objectMapper.readTree(value);
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid JSON value");
                }
                yield value;
            }
            case STRING -> {
                if (definition.options() != null && !definition.options().isEmpty()
                        && !definition.options().contains(value)) {
                    throw new IllegalArgumentException("Invalid option; expected one of " + definition.options());
                }
                yield value;
            }
            case SECRET -> value;
        };
    }

    private void evict(String key, SettingScope scope, UUID orgId) {
        if (scope == SettingScope.GLOBAL) {
            refreshGlobals();
        } else if (orgId != null) {
            orgOverrides.remove(orgId);
        }
    }

    private String mask(String value) {
        return value == null || value.isBlank() ? null : "****";
    }
}
