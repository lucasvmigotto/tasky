package io.tasky.api.domain.membertype;

import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentMemberTypeService {

    private final DepartmentMemberTypeRepository memberTypeRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public List<DepartmentMemberType> list(UUID organizationId, UUID departmentId) {
        requireDepartment(organizationId, departmentId);
        return memberTypeRepository.findByDepartmentIdOrderByNameAsc(departmentId);
    }

    public DepartmentMemberType create(UUID organizationId, UUID departmentId, String name, Boolean active) {
        Department department = requireDepartment(organizationId, departmentId);
        String normalizedName = normalizeName(name);
        if (memberTypeRepository.existsByDepartmentIdAndName(departmentId, normalizedName)) {
            throw new IllegalArgumentException("Member type name already exists in this department");
        }
        return memberTypeRepository.save(DepartmentMemberType.builder()
                .department(department)
                .name(normalizedName)
                .isActive(active == null || active)
                .build());
    }

    public DepartmentMemberType update(UUID organizationId, UUID departmentId, UUID memberTypeId,
                                       String name, Boolean active) {
        requireDepartment(organizationId, departmentId);
        DepartmentMemberType memberType = memberTypeRepository.findByIdAndDepartmentId(memberTypeId, departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Member type not found"));
        if (name != null) {
            String normalizedName = normalizeName(name);
            if (!normalizedName.equals(memberType.getName())
                    && memberTypeRepository.existsByDepartmentIdAndName(departmentId, normalizedName)) {
                throw new IllegalArgumentException("Member type name already exists in this department");
            }
            memberType.setName(normalizedName);
        }
        if (active != null) {
            memberType.setActive(active);
        }
        return memberTypeRepository.save(memberType);
    }

    public void delete(UUID organizationId, UUID departmentId, UUID memberTypeId) {
        requireDepartment(organizationId, departmentId);
        DepartmentMemberType memberType = memberTypeRepository.findByIdAndDepartmentId(memberTypeId, departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Member type not found"));
        memberTypeRepository.delete(memberType);
    }

    public DepartmentMemberType requireForDepartment(UUID organizationId, UUID departmentId, UUID memberTypeId) {
        if (memberTypeId == null) return null;
        if (departmentId == null) {
            throw new IllegalArgumentException("Member type requires a primary department");
        }
        requireDepartment(organizationId, departmentId);
        return memberTypeRepository.findByIdAndDepartmentId(memberTypeId, departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Member type not found in the primary department"));
    }

    public List<DepartmentMemberType> requireManyForDepartment(UUID organizationId, UUID departmentId,
                                                               List<UUID> memberTypeIds) {
        if (memberTypeIds == null || memberTypeIds.isEmpty()) {
            return List.of();
        }
        if (departmentId == null) {
            throw new IllegalArgumentException("Member types require a primary department");
        }
        requireDepartment(organizationId, departmentId);
        return memberTypeIds.stream()
                .distinct()
                .map(id -> memberTypeRepository.findByIdAndDepartmentId(id, departmentId)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Member type not found in the primary department: " + id)))
                .toList();
    }

    private Department requireDepartment(UUID organizationId, UUID departmentId) {
        return departmentRepository.findByIdAndOrganizationId(departmentId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Department not found in this organization"));
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Member type name is required");
        return name.trim();
    }
}
