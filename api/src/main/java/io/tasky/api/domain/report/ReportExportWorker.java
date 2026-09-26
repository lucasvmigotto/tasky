package io.tasky.api.domain.report;

import io.tasky.api.api.report.ReportDetailedRow;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.storage.FileStorageService;
import io.tasky.api.domain.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * PHASE 7 (T-EXP): async export worker without a broker. Single-node safe via
 * row-level locking ({@code FOR UPDATE SKIP LOCKED}); multi-node needs
 * ShedLock (documented, not added until a second node exists).
 * Formats: csv (synchronous, backward compatible), xlsx (POI), pdf (PDFBox).
 */
@Component
@RequiredArgsConstructor
public class ReportExportWorker {

    private static final Logger log = LoggerFactory.getLogger(ReportExportWorker.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final String MIME_XLSX =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String MIME_PDF = "application/pdf";

    private final ReportExportJobRepository jobRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ReportService reportService;
    private final FileStorageService fileStorageService;

    @Scheduled(fixedDelayString = "${tasky.exports.worker-delay-ms:5000}")
    @Transactional
    public void processPending() {
        List<ReportExportJob> claimed = jobRepository.claimCandidates(
                ReportExportStatus.PROCESSING, PageRequest.of(0, 1));
        if (claimed.isEmpty()) {
            return;
        }
        ReportExportJob job = claimed.get(0);
        job.setAttempts(job.getAttempts() + 1);
        try {
            String format = job.getFormat() != null ? job.getFormat() : "csv";
            List<ReportDetailedRow> rows = reportService.getDetailed(
                    job.getOrganization().getId(),
                    instantParam(job.getParams(), "from"),
                    instantParam(job.getParams(), "to"),
                    uuidParam(job.getParams(), "projectId"),
                    uuidParam(job.getParams(), "membershipId"),
                    ownerScope(job));

            byte[] content;
            String mimeType;
            String fileName;
            switch (format.toLowerCase()) {
                case "xlsx" -> {
                    content = buildXlsx(rows);
                    mimeType = MIME_XLSX;
                    fileName = "tasky-report-" + job.getId() + ".xlsx";
                }
                case "pdf" -> {
                    content = buildPdf(rows);
                    mimeType = MIME_PDF;
                    fileName = "tasky-report-" + job.getId() + ".pdf";
                }
                default -> {
                    content = reportService.buildCsv(rows).getBytes(StandardCharsets.UTF_8);
                    mimeType = "text/csv";
                    fileName = "tasky-report-" + job.getId() + ".csv";
                }
            }

            StoredFile stored = fileStorageService.upload(
                    job.getOrganization().getId(), job.getOwner(), fileName, mimeType, content);
            job.setStoredFile(stored);
            job.setStatus(ReportExportStatus.READY);
            job.setDownloadUrl("/api/v1/reports/exports/" + job.getId() + "/download");
            job.setLastError(null);
        } catch (RuntimeException ex) {
            log.warn("Export job {} failed (attempt {})", job.getId(), job.getAttempts(), ex);
            job.setLastError(truncate(String.valueOf(ex.getMessage())));
            if (job.getAttempts() >= MAX_ATTEMPTS) {
                job.setStatus(ReportExportStatus.FAILED);
            }
        }
    }

    private byte[] buildXlsx(List<ReportDetailedRow> rows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Relatorio");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            String[] headers = {"Projeto", "Membro", "Descricao", "Chamado GLPI", "Inicio", "Horas"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (ReportDetailedRow row : rows) {
                Row r = sheet.createRow(rowNum++);
                r.createCell(0).setCellValue(nz(row.projectName()));
                r.createCell(1).setCellValue(nz(row.memberName()));
                r.createCell(2).setCellValue(nz(row.description()));
                r.createCell(3).setCellValue(row.glpiTicketId() != null ? "#" + row.glpiTicketId() : "");
                r.createCell(4).setCellValue(row.startTime() != null ? row.startTime().toString() : "");
                r.createCell(5).setCellValue(String.format("%.2f", row.hours()));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build XLSX", e);
        }
    }

    private byte[] buildPdf(List<ReportDetailedRow> rows) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float y = 780;
            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                cs.newLineAtOffset(50, y);
                cs.showText("Relatorio TaskY");
                cs.endText();

                String[] headers = {"Projeto", "Membro", "Horas"};
                y = 740;
                for (ReportDetailedRow row : rows) {
                    if (y < 50) {
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        try (PDPageContentStream next = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true)) {
                            next.beginText();
                            next.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                            next.newLineAtOffset(50, 780);
                            next.showText(String.join(" | ", headers));
                            next.endText();
                        }
                        y = 740;
                    }
                    String line = nz(row.projectName()) + " | " + nz(row.memberName())
                            + " | " + String.format("%.2fh", row.hours());
                    try (PDPageContentStream cs2 = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true)) {
                        cs2.beginText();
                        cs2.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                        cs2.newLineAtOffset(50, y);
                        cs2.showText(line);
                        cs2.endText();
                    }
                    y -= 16;
                }
            }

            document.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build PDF", e);
        }
    }

    private String nz(String value) {
        return value != null ? value : "";
    }

    private java.util.Set<UUID> ownerScope(ReportExportJob job) {
        Object scope = job.getParams().get("scope");
        if (scope instanceof java.util.Collection<?> ids) {
            return ids.stream().map(id -> UUID.fromString(String.valueOf(id)))
                    .collect(java.util.stream.Collectors.toSet());
        }
        OrganizationMembership owner = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(
                        job.getOwner().getId(), job.getOrganization().getId())
                .orElseThrow(() -> new IllegalArgumentException("Export owner is no longer active"));
        return java.util.Set.of(owner.getId());
    }

    private Instant instantParam(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value != null ? Instant.parse(String.valueOf(value)) : null;
    }

    private UUID uuidParam(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value != null ? UUID.fromString(String.valueOf(value)) : null;
    }

    private String truncate(String message) {
        if (message == null) {
            return null;
        }
        return message.length() > 2000 ? message.substring(0, 2000) : message;
    }
}
