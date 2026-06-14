package io.tasky.api.domain.project;

import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public Project createProject(UUID departmentId, String name, String description, UUID managerMembershipId) {
        if (projectRepository.existsByDepartmentIdAndName(departmentId, name)) {
            throw new IllegalArgumentException("Project name already exists in this department");
        }

        Department dept = departmentRepository.getReferenceById(departmentId);
        OrganizationMembership manager = membershipRepository.getReferenceById(managerMembershipId);

        Project project = Project.builder()
                .department(dept)
                .name(name)
                .description(description)
                .managerMembership(manager)
                .isActive(true)
                .build();
        return projectRepository.save(project);
    }

    public List<Project> getProjectsByOrganization(UUID orgId) {
        return projectRepository.findByDepartmentOrganizationId(orgId);
    }

    public ProjectAssignment assignEmployee(UUID projectId, UUID membershipId) {
        if (assignmentRepository.existsByProjectIdAndMembershipId(projectId, membershipId)) {
            throw new IllegalArgumentException("Employee already assigned to this project");
        }
        Project project = projectRepository.getReferenceById(projectId);
        OrganizationMembership membership = membershipRepository.getReferenceById(membershipId);
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
        Department dept = departmentRepository.getReferenceById(departmentId);
        OrganizationMembership granter = membershipRepository.getReferenceById(grantedByMembershipId);

        CrossDepartmentProjectAccess access = CrossDepartmentProjectAccess.builder()
                .project(project)
                .department(dept)
                .grantedBy(granter)
                .build();
        crossDeptAccessRepository.save(access);
    }
}
