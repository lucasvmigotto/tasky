package io.tasky.api.domain.report;

import io.tasky.api.api.report.ReportDetailedRow;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.storage.FileStorageService;
import io.tasky.api.domain.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.property.TextAlignment;
import com.itextpdf.layout.property.UnitValue;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.property.TextAlignment;
import com.itextpdf.layout.property.UnitValue;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.IndexedColors;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ReportExportWorker {

    private static final Logger log = LoggerFactory.getLogger(ReportExportWorker.class);
    private static final int MAX_ATTEMPTS = 3;

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
            byte[] content;
            String mimeType;
            String fileName;

            switch (format.toLowerCase()) {
                case "xlsx":
                    content = buildXlsx(job);
                    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    fileName = "tasky-report-" + job.getId() + ".xlsx";
                    break;
                case "pdf":
                    content = buildPdf(job);
                    mimeType = "application/pdf";
                    fileName = "tasky-report-" + job.getId() + ".pdf";
                    break;
                case "csv":
                default:
                    String csv = reportService.buildCsv(reportService.getDetailed(
                            job.getOrganization().getId(),
                            instantParam(job.getParams(), "from"),
                            instantParam(job.getParams(), "to"),
                            uuidParam(job.getParams(), "projectId"),
                            uuidParam(job.getParams(), "membershipId"),
                            ownerScope(job)));
                    job.setStoredFile(null);
                    job.setDownloadUrl("/api/v1/reports/exports/" + job.getId() + "/download");
                    job.setStatus(ReportExportStatus.READY);
                    job.setLastError(null);
                    return; // CSV handled synchronously for backward compatibility
            }

            StoredFile stored = fileStorageService.upload(
                    job.getOrganization().getId(), job.getOwner(),
                    fileName, mimeType,
                    content);
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

    private byte[] buildXlsx(ReportExportJob job) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Relatório");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Data style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setAlignment(HorizontalAlignment.LEFT);

            // Headers
            String[] headers = {"Projeto", "Membro", "Descrição", "Chamado GLPI", "Início", "Horas"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data
            List<ReportDetailedRow> rows = reportService.getDetailed(
                    job.getOrganization().getId(),
                    instantParam(job.getParams(), "from"),
                    instantParam(job.getParams(), "to"),
                    uuidParam(job.getParams(), "projectId"),
                    uuidParam(job.getParams(), "membershipId"),
                    ownerScope(job));

            int rowNum = 1;
            for (ReportDetailedRow row : rows) {
                Row rowObj = sheet.createRow(rowNum++);
                Cell cell0 = rowObj.createCell(0);
                cell0.setCellValue(row.getProjectName() != null ? row.getProjectName() : "");
                cell0.setCellStyle(dataStyle);

                Cell cell1 = rowObj.createCell(1);
                cell1.setCellValue(row.getMemberName() != null ? row.getMemberName() : "");
                cell1.setCellStyle(dataStyle);

                Cell cell2 = rowObj.createCell(2);
                cell2.setCellValue(row.getDescription() != null ? row.getDescription() : "");
                cell2.setCellStyle(dataStyle);

                Cell cell3 = rowObj.createCell(3);
                cell3.setCellValue(row.getGlpiTicketId() != null ? "#" + row.getGlpiTicketId() : "");
                cell3.setCellStyle(dataStyle);

                Cell cell4 = rowObj.createCell(4);
                cell4.setCellValue(row.getStartTime() != null ? row.getStartTime().toString() : "");
                cell4.setCellStyle(dataStyle);

                Cell cell5 = rowObj.createCell(5);
                cell5.setCellValue(row.getHours() != null ? String.format("%.2f", row.getHours()) : "0.00");
                cell5.setCellStyle(dataStyle);
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build XLSX", e);
        }
    }

    private byte[] buildPdf(ReportExportJob job) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            com.itextpdf.kernel.pdf.PdfWriter writer = new com.itextpdf.kernel.pdf.PdfWriter(out);
            com.itextpdf.kernel.pdf.PdfDocument pdf = new com.itextpdf.kernel.pdf.PdfDocument(writer);
            com.itextpdf.layout.Document document = new com.itextpdf.layout.Document(pdf);

            // Title
            document.add(new com.itextpdf.layout.element.Paragraph("Relatório TaskY")
                    .setFont(com.itextpdf.kernel.font.PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD))
                    .setFontSize(18)
                    .setTextAlignment(com.itextpdf.layout.property.TextAlignment.CENTER)
                    .setMarginBottom(20));

            // Subtitle with date range
            String from = instantParam(job.getParams(), "from") != null ? instantParam(job.getParams(), "from").toString() : "";
            String to = instantParam(job.getParams(), "to") != null ? instantParam(job.getParams(), "to").toString() : "";
            document.add(new com.itextpdf.layout.element.Paragraph("Período: " + from + " a " + to)
                    .setFontSize(12)
                    .setTextAlignment(com.itextpdf.layout.property.TextAlignment.CENTER)
                    .setMarginBottom(20));

            // Data table
            List<ReportDetailedRow> rows = reportService.getDetailed(
                    job.getOrganization().getId(),
                    instantParam(job.getParams(), "from"),
                    instantParam(job.getParams(), "to"),
                    uuidParam(job.getParams(), "projectId"),
                    uuidParam(job.getParams(), "membershipId"),
                    ownerScope(job));

            if (!rows.isEmpty()) {
                float[] columnWidths = {30f, 25f, 25f, 20f};
                com.itextpdf.layout.element.Table table = new com.itextpdf.layout.element.Table(
                        com.itextpdf.layout.property.UnitValue.createPercentArray(new float[]{30f, 25f, 25f, 20f})).useAllAvailableWidth();
                table.addHeaderCell(createPdfHeaderCell("Projeto"));
                table.addHeaderCell(createPdfHeaderCell("Membro"));
                table.addHeaderCell(createPdfHeaderCell("Descrição"));
                table.addHeaderCell(createPdfHeaderCell("Horas"));

                for (ReportDetailedRow row : rows) {
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(row.getProjectName() != null ? row.getProjectName() : "")));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(row.getMemberName() != null ? row.getMemberName() : "")));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(row.getDescription() != null ? row.getDescription() : "")));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(row.getHours() != null ? String.format("%.2fh", row.getHours()) : "0.00h")));
                }
                document.add(table);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build PDF", e);
        }
    }

    private com.itextpdf.layout.element.Cell createPdfHeaderCell(String text) {
        com.itextpdf.layout.element.Cell cell = new com.itextpdf.layout.element.Cell()
                .add(new com.itextpdf.layout.element.Paragraph(text).setFont(com.itextpdf.kernel.font.PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD)).setFontSize(10))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(0, 51, 102))
                .setFontColor(com.itextpdf.kernel.colors.DeviceRgb.WHITE)
                .setTextAlignment(com.itextpdf.layout.property.TextAlignment.CENTER)
                .setPadding(5);
        return cell;
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