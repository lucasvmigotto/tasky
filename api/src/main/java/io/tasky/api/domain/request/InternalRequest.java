package io.tasky.api.domain.request;

import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.team.Team;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
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
import java.util.UUID;

@Entity
@Table(name = "internal_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "request_key", nullable = false)
    private String requestKey;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestPriority priority = RequestPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.NEW;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_membership_id", nullable = false)
    private OrganizationMembership requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requesting_department_id")
    private Department requestingDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_department_id")
    private Department responsibleDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_team_id")
    private Team responsibleTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_membership_id")
    private OrganizationMembership assignee;

    @Column(name = "desired_due_date")
    private Instant desiredDueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id")
    private Activity activity;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "canceled_at")
    private Instant canceledAt;

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
