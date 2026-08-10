package io.tasky.api.api.projectcolumn;

import java.util.List;

public record ReorderProjectColumnsRequest(
        List<String> columnIds
) {}
