package io.tasky.api.domain.project;

import io.tasky.api.domain.client.ClientRepository;
import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectAssignmentRepository assignmentRepository;
    private final CrossDepartmentProjectAccessRepository crossDeptAccessRepository;
    private final DepartmentRepository departmentRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ClientRepository clientRepository;

    public Project createProject(UUID departmentId, String name, String description, UUID managerMembershipId,
                                  UUID clientId, BigDecimal hourlyRate, Long estimatedSeconds, Long budgetSeconds,
                                  BigDecimal budgetAmount) {
        if (projectRepository.existsByDepartmentIdAndName(departmentId, name)) {
            throw new IllegalArgumentException("Project name already exists in this department");
        }

        Department dept = departmentRepository.getReferenceById(departmentId);
        UUID orgId = dept.getOrganization().getId();
        OrganizationMembership manager = membershipRepository.findById(managerMembershipId)
                .filter(m -> m.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Manager membership not found"));

        Project project = Project.builder()
                .department(dept)
                .name(name)
                .description(description)
                .managerMembership(manager)
                .client(clientId != null
                        ? clientRepository.findById(clientId)
                                .filter(c -> c.getOrganization().getId().equals(orgId))
                                .orElseThrow(() -> new IllegalArgumentException("Client not found"))
                        : null)
                .hourlyRate(hourlyRate)
                .estimatedSeconds(Math.max(0, estimatedSeconds != null ? estimatedSeconds : 0))
                .budgetSeconds(budgetSeconds)
                .budgetAmount(budgetAmount)
                .isActive(true)
                .build();
        return projectRepository.save(project);
    }

    public List<Project> getProjectsByOrganization(UUID orgId) {
        return projectRepository.findByDepartment_Organization_Id(orgId);
    }

    public Project getProject(UUID orgId, UUID projectId) {
        return projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
    }

    public Project updateProject(UUID orgId, UUID projectId, String name, String description, UUID managerMembershipId,
                                  UUID clientId, BigDecimal hourlyRate, Long estimatedSeconds, Long budgetSeconds,
                                  BigDecimal budgetAmount, Boolean isActive) {
        Project project = getProject(orgId, projectId);

        if (name != null && !name.isBlank() && !name.equals(project.getName())) {
            if (projectRepository.existsByDepartmentIdAndName(project.getDepartment().getId(), name)) {
                throw new IllegalArgumentException("Project name already exists in this department");
            }
            project.setName(name);
        }
        if (description != null) {
            project.setDescription(description);
        }
        if (managerMembershipId != null) {
            OrganizationMembership manager = membershipRepository.findById(managerMembershipId)
                    .filter(m -> m.getOrganization().getId().equals(orgId))
                    .orElseThrow(() -> new IllegalArgumentException("Manager membership not found"));
            project.setManagerMembership(manager);
        }
        if (clientId != null) {
            project.setClient(clientRepository.findById(clientId)
                    .filter(c -> c.getOrganization().getId().equals(orgId))
                    .orElseThrow(() -> new IllegalArgumentException("Client not found")));
        }
        if (hourlyRate != null) {
            project.setHourlyRate(hourlyRate);
        }
        if (estimatedSeconds != null) {
            project.setEstimatedSeconds(Math.max(0, estimatedSeconds));
        }
        if (budgetSeconds != null) {
            project.setBudgetSeconds(budgetSeconds);
        }
        if (budgetAmount != null) {
            project.setBudgetAmount(budgetAmount);
        }
        if (isActive != null) {
            project.setActive(isActive);
        }
        return projectRepository.save(project);
    }

    public void deleteProject(UUID orgId, UUID projectId) {
        Project project = getProject(orgId, projectId);
        projectRepository.delete(project);
    }

    public List<ProjectAssignment> getAssignments(UUID projectId) {
        return assignmentRepository.findByProjectId(projectId);
    }

    public List<CrossDepartmentProjectAccess> getCrossDepartmentAccesses(UUID projectId) {
        return crossDeptAccessRepository.findByProjectId(projectId);
    }

    public void removeCrossDepartmentAccess(UUID projectId, UUID departmentId) {
        crossDeptAccessRepository.findByProjectIdAndDepartmentId(projectId, departmentId)
                .ifPresent(crossDeptAccessRepository::delete);
    }

    public ProjectAssignment assignEmployee(UUID projectId, UUID membershipId) {
        if (assignmentRepository.existsByProjectIdAndMembershipId(projectId, membershipId)) {
            throw new IllegalArgumentException("Employee already assigned to this project");
        }
        Project project = projectRepository.getReferenceById(projectId);
        UUID orgId = project.getDepartment().getOrganization().getId();
        OrganizationMembership membership = membershipRepository.findById(membershipId)
                .filter(m -> m.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));
        ProjectAssignment assignment = ProjectAssignment.builder()
                .project(project)
                .membership(membership)
                .build();
        return assignmentRepository.save(assignment);
    }

    public void removeAssignment(UUID projectId, UUID membershipId) {
        assignmentRepository.findByProjectIdAndMembershipId(projectId, membershipId)
                .ifPresent(assignmentRepository::delete);
    }

    public void grantCrossDepartmentAccess(UUID projectId, UUID departmentId, UUID grantedByMembershipId) {
        if (crossDeptAccessRepository.existsByProjectIdAndDepartmentId(projectId, departmentId)) {
            throw new IllegalArgumentException("Access already granted to this department");
        }
        Project project = projectRepository.getReferenceById(projectId);
        UUID orgId = project.getDepartment().getOrganization().getId();
        Department dept = departmentRepository.findById(departmentId)
                .filter(d -> d.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        OrganizationMembership granter = membershipRepository.findById(grantedByMembershipId)
                .filter(m -> m.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Granter membership not found"));

        CrossDepartmentProjectAccess access = CrossDepartmentProjectAccess.builder()
                .project(project)
                .department(dept)
                .grantedBy(granter)
                .build();
        crossDeptAccessRepository.save(access);
    }
}
