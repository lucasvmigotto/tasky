package io.tasky.api.domain.projectcolumn;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tasky.api.config.ConfigRegistry;
import io.tasky.api.config.ConfigService;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectColumnService {

    private static final String DEFAULT_COLOR = "#64748b";
    private static final java.util.regex.Pattern HEX_COLOR =
            java.util.regex.Pattern.compile("^#[0-9A-Fa-f]{6}$");

    private final ProjectColumnRepository columnRepository;
    private final ProjectRepository projectRepository;
    private final ConfigService configService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record DefaultColumn(String name, String color, ActivityStatus status) {}

    public List<ProjectColumn> list(UUID orgId, UUID projectId) {
        Project project = projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        List<ProjectColumn> columns = columnRepository.findByProjectIdOrderByPositionAscIdAsc(projectId);
        if (columns.isEmpty()) {
            seedDefaults(project);
            return columnRepository.findByProjectIdOrderByPositionAscIdAsc(projectId);
        }
        return columns;
    }

    public ProjectColumn create(UUID orgId, UUID projectId, String name, String color, ActivityStatus status) {
        Project project = projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Column name is required");
        }
        if (status == null) {
            throw new IllegalArgumentException("Column lifecycle status is required");
        }
        if (columnRepository.existsByProjectIdAndLifecycleStatus(projectId, status)) {
            throw new IllegalArgumentException("A column with this lifecycle status already exists");
        }
        int position = (int) columnRepository.countByProjectId(projectId);
        ProjectColumn column = ProjectColumn.builder()
                .project(project)
                .name(name.trim())
                .color(normalizeColor(color))
                .position(position)
                .lifecycleStatus(status)
                .build();
        return columnRepository.save(column);
    }

    public ProjectColumn update(UUID orgId, UUID projectId, UUID columnId, String name, String color,
                                ActivityStatus status, Integer position) {
        Project project = projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ProjectColumn column = columnRepository.findByProjectIdAndId(projectId, columnId)
                .orElseThrow(() -> new IllegalArgumentException("Column not found"));
        if (name != null && !name.isBlank()) {
            column.setName(name.trim());
        }
        if (color != null) {
            column.setColor(normalizeColor(color));
        }
        if (status != null && status != column.getLifecycleStatus()) {
            if (columnRepository.existsByProjectIdAndLifecycleStatus(projectId, status)) {
                throw new IllegalArgumentException("A column with this lifecycle status already exists");
            }
            column.setLifecycleStatus(status);
        }
        if (position != null && position != column.getPosition()) {
            movePosition(projectId, column, position);
        }
        return columnRepository.save(column);
    }

    public void delete(UUID orgId, UUID projectId, UUID columnId) {
        projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ProjectColumn column = columnRepository.findByProjectIdAndId(projectId, columnId)
                .orElseThrow(() -> new IllegalArgumentException("Column not found"));
        if (columnRepository.countByProjectId(projectId) <= 1) {
            throw new IllegalArgumentException("A project must have at least one column");
        }
        columnRepository.delete(column);
        reindexPositions(projectId);
    }

    public void reorder(UUID orgId, UUID projectId, List<UUID> orderedColumnIds) {
        projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        Set<UUID> ids = new LinkedHashSet<>(orderedColumnIds);
        List<ProjectColumn> columns = columnRepository.findByProjectIdOrderByPositionAscIdAsc(projectId);
        Set<UUID> all = columns.stream().map(ProjectColumn::getId).collect(java.util.stream.Collectors.toSet());
        if (!ids.equals(all)) {
            throw new IllegalArgumentException("Column list must match the project columns exactly");
        }
        int position = 0;
        for (UUID columnId : ids) {
            ProjectColumn column = columns.stream().filter(c -> c.getId().equals(columnId)).findFirst().orElseThrow();
            column.setPosition(position++);
            columnRepository.save(column);
        }
    }

    public void seedDefaults(Project project) {
        if (columnRepository.countByProjectId(project.getId()) > 0) {
            return;
        }
        List<DefaultColumn> defaults = readDefaultColumns();
        int position = 0;
        for (DefaultColumn defaultColumn : defaults) {
            if (columnRepository.existsByProjectIdAndLifecycleStatus(project.getId(), defaultColumn.status())) {
                continue;
            }
            columnRepository.save(ProjectColumn.builder()
                    .project(project)
                    .name(defaultColumn.name())
                    .color(normalizeColor(defaultColumn.color()))
                    .position(position++)
                    .lifecycleStatus(defaultColumn.status())
                    .build());
        }
    }

    private List<DefaultColumn> readDefaultColumns() {
        String json = configService.getJson(ConfigRegistry.KEY_WORKFLOW_DEFAULT_COLUMNS);
        try {
            return objectMapper.readValue(json, new TypeReference<List<DefaultColumn>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("workflow.defaultColumns is not a valid list of {name,color,status}", e);
        }
    }

    private void movePosition(UUID projectId, ProjectColumn column, int targetPosition) {
        List<ProjectColumn> columns = columnRepository.findByProjectIdOrderByPositionAscIdAsc(projectId);
        if (targetPosition < 0 || targetPosition >= columns.size()) {
            throw new IllegalArgumentException("Invalid column position");
        }
        columns.remove(column);
        columns.add(targetPosition, column);
        for (int i = 0; i < columns.size(); i++) {
            columns.get(i).setPosition(i);
            columnRepository.save(columns.get(i));
        }
    }

    private void reindexPositions(UUID projectId) {
        List<ProjectColumn> columns = columnRepository.findByProjectIdOrderByPositionAscIdAsc(projectId);
        for (int i = 0; i < columns.size(); i++) {
            columns.get(i).setPosition(i);
            columnRepository.save(columns.get(i));
        }
    }

    private String normalizeColor(String color) {
        String normalized = color == null || color.isBlank() ? DEFAULT_COLOR : color.trim().toUpperCase(java.util.Locale.ROOT);
        if (!HEX_COLOR.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Column color must be a hexadecimal value such as #3B82F6");
        }
        return normalized;
    }
}
