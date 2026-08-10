package io.tasky.api.domain.setting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppSettingRepository extends JpaRepository<AppSetting, UUID> {

    Optional<AppSetting> findByScopeAndOrgIdAndKey(SettingScope scope, UUID orgId, String key);

    Optional<AppSetting> findByScopeAndKey(SettingScope scope, String key);

    List<AppSetting> findByScope(SettingScope scope);

    List<AppSetting> findByScopeAndOrgId(SettingScope scope, UUID orgId);
}
