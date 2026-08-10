package io.tasky.api.domain.membership;

public enum Role {
    super_admin,
    admin,
    manager,
    employee;

    public boolean isAdminLevel() {
        return this == super_admin || this == admin;
    }

    public boolean isManagerLevel() {
        return this == super_admin || this == admin || this == manager;
    }
}
