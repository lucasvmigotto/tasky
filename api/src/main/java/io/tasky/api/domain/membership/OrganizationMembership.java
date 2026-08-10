package io.tasky.api.domain.membership;

import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.membertype.DepartmentMemberType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "organization_memberships")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "custom_username", length = 100)
    private String customUsername;

    @Column(name = "max_daily_work_minutes", nullable = false)
    private int maxDailyWorkMinutes;

    @Column(name = "primary_department_id")
    private UUID primaryDepartmentId;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "membership_member_types",
            joinColumns = @JoinColumn(name = "membership_id"),
            inverseJoinColumns = @JoinColumn(name = "member_type_id")
    )
    @Builder.Default
    private List<DepartmentMemberType> memberTypes = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "invitation_status", nullable = false, length = 20)
    @Builder.Default
    private InvitationStatus invitationStatus = InvitationStatus.ACCEPTED;

    @Column(name = "invited_at")
    private Instant invitedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_membership_id")
    private OrganizationMembership invitedBy;

    @Column(length = 64)
    private String timezone;

    @Column(name = "cost_rate", precision = 10, scale = 2)
    private BigDecimal costRate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
