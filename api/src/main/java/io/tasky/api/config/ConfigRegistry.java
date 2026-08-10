package io.tasky.api.config;

import io.tasky.api.domain.setting.SettingScope;
import io.tasky.api.domain.setting.SettingValueType;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Type-safe catalog of every parameterizable setting. The actual values live in
 * the {@code app_settings} table; the registry drives the Super Admin UI, the
 * validation and the seed defaults. Add a new key here to make it editable.
 */
@Component
public class ConfigRegistry {

    public record SettingDefinition(
            String key,
            String group,
            String label,
            String description,
            SettingValueType valueType,
            String defaultValue,
            List<String> options,
            Double min,
            Double max,
            boolean secret,
            Set<SettingScope> scopes
    ) {
        public SettingDefinition {
            scopes = scopes == null || scopes.isEmpty() ? Set.of(SettingScope.GLOBAL) : scopes;
            if (valueType == SettingValueType.BOOLEAN) {
                options = List.of("true", "false");
            }
        }
    }

    public static final String KEY_STORAGE_AZURE_CONNECTION = "storage.azureConnectionString";
    public static final String KEY_STORAGE_CONTAINER = "storage.container";
    public static final String KEY_STORAGE_SAS_EXPIRY_MINUTES = "storage.sasExpiryMinutes";
    public static final String KEY_STORAGE_MAX_UPLOAD_BYTES = "storage.maxUploadBytes";
    public static final String KEY_STORAGE_ALLOWED_MIME = "storage.allowedMimeTypes";
    public static final String KEY_WORKFLOW_DEFAULT_COLUMNS = "workflow.defaultColumns";
    public static final String KEY_WORKFLOW_ALLOW_CUSTOM_COLUMNS = "workflow.allowCustomColumns";
    public static final String KEY_REQUESTS_GLPI_REQUIRED = "requests.glpiRequired";
    public static final String KEY_REQUESTS_MULTI_ASSIGNEE = "requests.multiAssigneeEnabled";
    public static final String KEY_REQUESTS_DEFAULT_PRIORITY = "requests.defaultPriority";
    public static final String KEY_REQUESTS_KEY_FORMAT = "requests.keyFormat";
    public static final String KEY_TASKS_WEIGHT_SCALE = "tasks.weightScale";
    public static final String KEY_TASKS_DEFAULT_WEIGHT = "tasks.defaultWeight";
    public static final String KEY_TASKS_MAX_SUBTASK_DEPTH = "tasks.maxSubtaskDepth";
    public static final String KEY_DOCS_EDIT_BY_AUTHOR = "docs.editingAllowedToAuthor";
    public static final String KEY_DOCS_EXPORT_PDF = "docs.exportPdfEnabled";
    public static final String KEY_GERAL_PLATFORM_NAME = "geral.platformName";
    public static final String KEY_GERAL_SUPPORT_EMAIL = "geral.supportEmail";
    public static final String KEY_GERAL_DEFAULT_TIMEZONE = "geral.defaultTimezone";
    public static final String KEY_NOTIFICATIONS_DUE_SOON = "notifications.dueSoonWindow";
    public static final String KEY_NOTIFICATIONS_OPEN_TIMER = "notifications.openTimerAge";
    public static final String KEY_NOTIFICATIONS_PENDING_APPROVAL = "notifications.pendingApprovalAge";

    private static final String DEFAULT_COLUMNS_JSON = """
            [
              {"name":"Planejamento","color":"#38bdf8","status":"TODO"},
              {"name":"Executando","color":"#fbbf24","status":"IN_PROGRESS"},
              {"name":"Testes","color":"#a78bfa","status":"IN_TESTING"},
              {"name":"Bloqueado","color":"#f87171","status":"BLOCKED"},
              {"name":"Finalizado","color":"#34d399","status":"DONE"},
              {"name":"Cancelado","color":"#64748b","status":"CANCELED"}
            ]
            """;

    private static final String DEFAULT_MIME_JSON = """
            ["image/png","image/jpeg","image/webp","image/gif","image/bmp",
             "application/pdf","text/plain","text/markdown",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
            """;

    private static final Set<SettingScope> GLOBAL_AND_ORG =
            Set.of(SettingScope.GLOBAL, SettingScope.ORGANIZATION);

    private final Map<String, SettingDefinition> definitions;

    public ConfigRegistry() {
        List<SettingDefinition> all = List.of(
                new SettingDefinition(KEY_GERAL_PLATFORM_NAME, "Geral", "Nome da plataforma",
                        "Nome exibido na interface.", SettingValueType.STRING, "TaskY", null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_GERAL_SUPPORT_EMAIL, "Geral", "E-mail de suporte",
                        "Endereço de contato para suporte.", SettingValueType.STRING, "", null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_GERAL_DEFAULT_TIMEZONE, "Geral", "Fuso horário padrão",
                        "Timezone IANA usado como padrão (ex.: America/Sao_Paulo).",
                        SettingValueType.STRING, "America/Sao_Paulo", null, null, null, false, GLOBAL_AND_ORG),

                new SettingDefinition(KEY_STORAGE_AZURE_CONNECTION, "Armazenamento", "Connection string (Azure Blob)",
                        "Connection string da conta de armazenamento do Azure. Armazenada criptografada e mascarada.",
                        SettingValueType.SECRET, "", null, null, null, true, Set.of(SettingScope.GLOBAL)),
                new SettingDefinition(KEY_STORAGE_CONTAINER, "Armazenamento", "Container",
                        "Nome do container no Azure Blob.", SettingValueType.STRING, "tasky", null, null, null, false, Set.of(SettingScope.GLOBAL)),
                new SettingDefinition(KEY_STORAGE_SAS_EXPIRY_MINUTES, "Armazenamento", "Validade da SAS (minutos)",
                        "Tempo de validade das URLs assinadas de download.", SettingValueType.NUMBER, "15", null, 1d, 1440d, false, Set.of(SettingScope.GLOBAL)),
                new SettingDefinition(KEY_STORAGE_MAX_UPLOAD_BYTES, "Armazenamento", "Tamanho máximo de upload (bytes)",
                        "Limite por arquivo enviado.", SettingValueType.NUMBER, String.valueOf(20L * 1024 * 1024),
                        null, 1024d, 1073741824d, false, Set.of(SettingScope.GLOBAL)),
                new SettingDefinition(KEY_STORAGE_ALLOWED_MIME, "Armazenamento", "Tipos de arquivo permitidos (MIME)",
                        "Lista JSON de MIME types aceitos no upload.", SettingValueType.JSON, DEFAULT_MIME_JSON,
                        null, null, null, false, Set.of(SettingScope.GLOBAL)),

                new SettingDefinition(KEY_WORKFLOW_DEFAULT_COLUMNS, "Workflow", "Colunas padrão do quadro",
                        "JSON com as colunas padrão criadas para projetos novos: [{name,color,status}].",
                        SettingValueType.JSON, DEFAULT_COLUMNS_JSON, null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_WORKFLOW_ALLOW_CUSTOM_COLUMNS, "Workflow", "Permitir colunas customizadas por projeto",
                        "Habilita a configuração de colunas específicas em cada projeto.",
                        SettingValueType.BOOLEAN, "true", null, null, null, false, GLOBAL_AND_ORG),

                new SettingDefinition(KEY_REQUESTS_GLPI_REQUIRED, "Demandas", "Nº GLPI obrigatório",
                        "Exige o número do chamado GLPI ao criar uma demanda.",
                        SettingValueType.BOOLEAN, "false", null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_REQUESTS_MULTI_ASSIGNEE, "Demandas", "Múltiplos responsáveis",
                        "Permite atribuir mais de uma pessoa à demanda e às tarefas.",
                        SettingValueType.BOOLEAN, "true", null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_REQUESTS_DEFAULT_PRIORITY, "Demandas", "Prioridade padrão",
                        "Prioridade aplicada por padrão ao criar uma demanda.",
                        SettingValueType.STRING, "NORMAL", List.of("LOW", "NORMAL", "HIGH", "URGENT"), null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_REQUESTS_KEY_FORMAT, "Demandas", "Formato do código",
                        "Formato do código sequencial da demanda. Use {year} e {seq}.",
                        SettingValueType.STRING, "DEM-{year}-{seq}", null, null, null, false, GLOBAL_AND_ORG),

                new SettingDefinition(KEY_TASKS_WEIGHT_SCALE, "Tarefas", "Escala de peso",
                        "Valores de peso disponíveis (JSON).", SettingValueType.JSON, "[1,2,3,5,8,13]",
                        null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_TASKS_DEFAULT_WEIGHT, "Tarefas", "Peso padrão",
                        "Peso usado ao criar uma tarefa sem valor informado.",
                        SettingValueType.NUMBER, "1", null, 1d, 100d, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_TASKS_MAX_SUBTASK_DEPTH, "Tarefas", "Profundidade máxima de subtarefas",
                        "Limite de níveis de aninhamento de subtarefas.",
                        SettingValueType.NUMBER, "5", null, 1d, 20d, false, GLOBAL_AND_ORG),

                new SettingDefinition(KEY_DOCS_EDIT_BY_AUTHOR, "Documentação", "Autor pode editar",
                        "Permite que o autor de um documento edite mesmo sem ser admin.",
                        SettingValueType.BOOLEAN, "true", null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_DOCS_EXPORT_PDF, "Documentação", "Exportar para PDF",
                        "Habilita o botão de exportar documentos em PDF.",
                        SettingValueType.BOOLEAN, "true", null, null, null, false, GLOBAL_AND_ORG),

                new SettingDefinition(KEY_NOTIFICATIONS_DUE_SOON, "Notificações", "Aviso de prazo próximo",
                        "Janela (ex.: 24h) antes do vencimento para lembrar.", SettingValueType.STRING, "24h",
                        null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_NOTIFICATIONS_OPEN_TIMER, "Notificações", "Timer aberto por muito tempo",
                        "Tempo (ex.: 8h) para alertar sobre timer não encerrado.", SettingValueType.STRING, "8h",
                        null, null, null, false, GLOBAL_AND_ORG),
                new SettingDefinition(KEY_NOTIFICATIONS_PENDING_APPROVAL, "Notificações", "Aprovação pendente",
                        "Tempo (ex.: 24h) para lembrar de apontamentos pendentes de aprovação.",
                        SettingValueType.STRING, "24h", null, null, null, false, GLOBAL_AND_ORG)
        );

        Map<String, SettingDefinition> map = new LinkedHashMap<>();
        all.forEach(definition -> map.put(definition.key(), definition));
        this.definitions = Map.copyOf(map);
    }

    public List<SettingDefinition> all() {
        return List.copyOf(definitions.values());
    }

    public SettingDefinition get(String key) {
        return definitions.get(key);
    }

    public boolean exists(String key) {
        return definitions.containsKey(key);
    }
}
