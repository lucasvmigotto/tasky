package io.tasky.api.api.setting;

import io.tasky.api.config.ConfigRegistry;
import io.tasky.api.config.ConfigService;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.setting.SettingScope;
import io.tasky.api.domain.setting.SettingValueType;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SettingsController {

    private final ConfigService configService;
    private final ConfigRegistry registry;
    private final PermissionService permissionService;

    @GetMapping("/admin/settings")
    public ResponseEntity<SettingsResponse> globalSettings(@AuthenticationPrincipal SecurityUser user) {
        if (user == null || user.role() != Role.super_admin) {
            throw new SecurityException("Only super admins can view global settings");
        }
        return ResponseEntity.ok(build(SettingScope.GLOBAL, null, user));
    }

    @PutMapping("/admin/settings/{key}")
    public ResponseEntity<SettingsResponse> updateGlobalSetting(
            @PathVariable String key,
            @RequestBody UpdateSettingRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        if (user == null || user.role() != Role.super_admin) {
            throw new SecurityException("Only super admins can update global settings");
        }
        configService.update(key, SettingScope.GLOBAL, null,
                request.value(), Boolean.parseBoolean(request.clear()), user.id(), null);
        return ResponseEntity.ok(build(SettingScope.GLOBAL, null, user));
    }

    @GetMapping("/organizations/{orgId}/settings")
    public ResponseEntity<SettingsResponse> organizationSettings(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        requireOrgManager(user, orgId);
        return ResponseEntity.ok(build(SettingScope.ORGANIZATION, orgId, user));
    }

    @PutMapping("/organizations/{orgId}/settings/{key}")
    public ResponseEntity<SettingsResponse> updateOrganizationSetting(
            @PathVariable UUID orgId,
            @PathVariable String key,
            @RequestBody UpdateSettingRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        requireOrgManager(user, orgId);
        configService.update(key, SettingScope.ORGANIZATION, orgId,
                request.value(), Boolean.parseBoolean(request.clear()), user.id(), orgId);
        return ResponseEntity.ok(build(SettingScope.ORGANIZATION, orgId, user));
    }

    private void requireOrgManager(SecurityUser user, UUID orgId) {
        if (user == null || !permissionService.canManageOrganization(user, orgId)) {
            throw new SecurityException("Only organization managers can manage these settings");
        }
    }

    private SettingsResponse build(SettingScope scope, UUID orgId, SecurityUser user) {
        Map<String, List<SettingsResponse.SettingValue>> groups = new LinkedHashMap<>();
        for (ConfigRegistry.SettingDefinition definition : registry.all()) {
            if (!definition.scopes().contains(scope)) {
                continue;
            }
            String key = definition.key();
            boolean secret = definition.valueType() == SettingValueType.SECRET;
            String effective = configService.rawValue(key, orgId);
            boolean isSet = effective != null && !effective.isBlank();
            boolean isOverride = scope == SettingScope.ORGANIZATION && configService.hasOrgOverride(key, orgId);

            SettingsResponse.SettingValue value = new SettingsResponse.SettingValue(
                    key,
                    definition.label(),
                    definition.description(),
                    definition.valueType().name(),
                    definition.options(),
                    definition.min(),
                    definition.max(),
                    secret ? null : effective,
                    isSet,
                    isOverride);
            groups.computeIfAbsent(definition.group(), g -> new java.util.ArrayList<>()).add(value);
        }

        List<SettingsResponse.SettingsGroup> groupList = groups.entrySet().stream()
                .map(entry -> new SettingsResponse.SettingsGroup(entry.getKey(), entry.getValue()))
                .toList();
        return new SettingsResponse(scope.name(), orgId, groupList);
    }
}
