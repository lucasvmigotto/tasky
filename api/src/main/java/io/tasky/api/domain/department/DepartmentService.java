package io.tasky.api.domain.department;

import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final OrganizationRepository organizationRepository;

    public Department createDepartment(UUID organizationId, String name) {
        if (departmentRepository.existsByOrganizationIdAndName(organizationId, name)) {
            throw new IllegalArgumentException("Department name already exists in this organization");
        }
        Organization org = organizationRepository.getReferenceById(organizationId);
        Department dept = Department.builder()
                .organization(org)
                .name(name)
                .build();
        return departmentRepository.save(dept);
    }

    public List<Department> getDepartmentsByOrganization(UUID organizationId) {
        return departmentRepository.findByOrganizationId(organizationId);
    }
}
