package io.tasky.api.domain.membership;

import io.tasky.api.domain.department.Department;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "manager_departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagerDepartment {

    @EmbeddedId
    private ManagerDepartmentId id;

    @MapsId("membershipId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_id", nullable = false)
    private OrganizationMembership membership;

    @MapsId("departmentId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerDepartmentId implements Serializable {
        private UUID membershipId;
        private UUID departmentId;
    }
}
