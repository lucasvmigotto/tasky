package io.tasky.api.api;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PHASE 1 (T-ARCH): static tenant-safety gates without extra dependencies.
 * <ul>
 * <li>Tenant-owned lookups in timeentry/project domains must use scoped
 * finds, never {@code getReferenceById} (unchecked global proxy).</li>
 * <li>Controller-level {@code @Transactional} is a known Phase 3 backlog:
 * the exact set is frozen here so no new offender can be added silently.</li>
 * </ul>
 */
class TenantArchitectureTest {

    private static final Path MAIN = Path.of("src/main/java/io/tasky/api");

    private static List<Path> javaFiles(Path root) throws IOException {
        try (Stream<Path> stream = Files.walk(root)) {
            return stream.filter(p -> p.toString().endsWith(".java")).toList();
        }
    }

    private static String read(Path file) throws IOException {
        return Files.readString(file);
    }

    @Test
    void noGetReferenceById_inProjectAndTimeEntryDomains() throws IOException {
        var offenders = Stream.of(MAIN.resolve("domain/project"), MAIN.resolve("domain/timeentry"))
                .flatMap(root -> {
                    try {
                        return javaFiles(root).stream();
                    } catch (IOException e) {
                        throw new IllegalStateException(e);
                    }
                })
                .filter(file -> {
                    try {
                        return read(file).contains("getReferenceById");
                    } catch (IOException e) {
                        throw new IllegalStateException(e);
                    }
                })
                .map(file -> MAIN.relativize(file).toString())
                .toList();

        assertThat(offenders).as("unchecked getReferenceById in tenant domains").isEmpty();
    }

    @Test
    void controllerTransactions_frozenToKnownPhase3Backlog() throws IOException {
        Set<String> frozen = Set.of(
                "InternalRequestController",
                "TimeEntryController",
                "TimesheetController",
                "ActivityTemplateController",
                "ReportController",
                "CrossDepartmentAccessController",
                "MembershipController");

        var transactional = javaFiles(MAIN.resolve("api"))
                .stream()
                .filter(file -> {
                    try {
                        String content = read(file);
                        return content.contains("@RestController") && content.contains("@Transactional");
                    } catch (IOException e) {
                        throw new IllegalStateException(e);
                    }
                })
                .map(file -> file.getFileName().toString().replace(".java", ""))
                .collect(java.util.stream.Collectors.toSet());

        assertThat(transactional)
                .as("controller @Transactional set changed: remove entries only via Phase 3, never add")
                .isEqualTo(frozen);
    }
}
