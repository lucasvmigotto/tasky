package io.tasky.api.domain.document;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.request.InternalRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "request_id")
    private InternalRequest request;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "activity_id")
    private io.tasky.api.domain.activity.Activity activity;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(name = "content_md", nullable = false, columnDefinition = "TEXT")
    private String contentMd;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "author_membership_id", nullable = false)
    private OrganizationMembership author;

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
