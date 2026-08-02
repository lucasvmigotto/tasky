package io.tasky.api.domain.team;

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
public class TeamService {

    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;

    public Team createTeam(UUID departmentId, String name) {
        if (teamRepository.existsByDepartmentIdAndName(departmentId, name)) {
            throw new IllegalArgumentException("Team name already exists in this department");
        }
        Department dept = departmentRepository.getReferenceById(departmentId);
        Team team = Team.builder()
                .department(dept)
                .name(name)
                .build();
        return teamRepository.save(team);
    }

    public List<Team> getTeamsByDepartment(UUID organizationId, UUID departmentId) {
        return teamRepository.findByDepartmentId(departmentId).stream()
                .filter(t -> t.getDepartment().getOrganization().getId().equals(organizationId))
                .toList();
    }

    public Team renameTeam(UUID departmentId, UUID teamId, String name) {
        Team team = teamRepository.findById(teamId)
                .filter(t -> t.getDepartment().getId().equals(departmentId))
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        if (name != null && !name.isBlank() && !name.equals(team.getName())) {
            if (teamRepository.existsByDepartmentIdAndName(departmentId, name)) {
                throw new IllegalArgumentException("Team name already exists in this department");
            }
            team.setName(name);
        }
        return teamRepository.save(team);
    }

    public void deleteTeam(UUID departmentId, UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .filter(t -> t.getDepartment().getId().equals(departmentId))
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        teamRepository.delete(team);
    }
}
