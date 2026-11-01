import { saveAs } from "file-saver";
import type { DashboardReport } from "@/fetchers/reporting/get-report";

type Translate = (key: string, options?: Record<string, unknown>) => string;
const escape = (text: unknown) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
function reportRows(report: DashboardReport, t: Translate) {
  return report.tasks.map((task) => [
    task.number ?? "",
    task.requirementData?.reference || `${report.project.slug}-${task.number}`,
    task.title,
    task.description
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    task.requirementData?.type ?? "",
    task.requirementData?.category ?? "",
    task.statusName,
    task.assigneeName || t("reporting:unassigned"),
    task.creatorName ?? "",
    task.dueDate ?? "",
    task.requirementData?.pirunPlannedAt ?? "",
    task.risk === "overdue" ? Math.ceil(task.riskDays) : "",
    t(`reporting:risk.${task.risk}`),
    task.createdAt,
    task.updaterName ?? "",
    task.updatedAt,
  ]);
}
const detailKeys = [
  "sequence",
  "reference",
  "title",
  "description",
  "type",
  "category",
  "workflow",
  "assignee",
  "creator",
  "dueDate",
  "pirun",
  "overdueDays",
  "risk",
  "createdAt",
  "updater",
  "updatedAt",
];
const compactColumns = [1, 2, 6, 7, 9] as const;
const compactRow = (row: Array<unknown>) =>
  compactColumns.map((index) => row[index]);
async function chartImages(root: HTMLElement) {
  const results: string[] = [];
  for (const original of root.querySelectorAll<SVGSVGElement>(
    "svg[data-report-chart]",
  )) {
    const svg = original.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.style.color = "#263d36";
    svg.style.fontFamily = "Arial, Microsoft YaHei, sans-serif";
    const view = original.viewBox.baseVal;
    svg.setAttribute("width", String(view.width));
    svg.setAttribute("height", String(view.height));
    const source = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml;charset=utf-8",
      }),
    );
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = view.width * 2;
      canvas.height = view.height * 2;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      results.push(canvas.toDataURL("image/png"));
    } finally {
      URL.revokeObjectURL(source);
    }
  }
  return results;
}
export async function exportReport(
  format: "xlsx" | "pptx" | "docx" | "pdf",
  report: DashboardReport,
  root: HTMLElement,
  t: Translate,
) {
  const name = `${report.project.name.replace(/[\\/:*?"<>|]/g, "_")}-${report.asOf.slice(0, 10)}`;
  const rows = reportRows(report, t);
  const headers = detailKeys.map((key) =>
    t(
      report.project.kind === "project" &&
        ["reference", "title", "description"].includes(key)
        ? `reporting:taskColumns.${key}`
        : `reporting:columns.${key}`,
    ),
  );
  const summary: Array<[string, number]> =
    report.project.kind === "requirement"
      ? [
          [t("reporting:total"), report.counts.total],
          [t("reporting:launched"), report.counts.launched],
          [t("reporting:overdue"), report.counts.overdue],
        ]
      : [
          [t("reporting:taskTotal"), report.counts.total],
          [
            t("reporting:active"),
            report.tasks.filter((task) =>
              ["in-progress", "in-review", "pending-acceptance"].includes(
                task.status,
              ),
            ).length,
          ],
          [
            t("reporting:acceptance"),
            report.tasks.filter((task) => task.status === "pending-acceptance")
              .length,
          ],
          [t("reporting:overdue"), report.counts.overdue],
        ];

  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Kaneo";
    const add = (title: string, data: Array<Array<string | number | null>>) => {
      const sheet = workbook.addWorksheet(title.slice(0, 31));
      sheet.addRows(data);
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF197858" },
      };
      sheet.columns.forEach((column, index) => {
        column.width = index === 1 ? 42 : 24;
      });
      if (data.length > 1)
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: data.length, column: data[0]!.length },
        };
      return sheet;
    };
    add(t("reporting:overview"), [
      [report.project.name, report.asOf],
      ...summary,
      [t("reporting:coverage"), report.coverageStart],
      [
        t("reporting:flowHint"),
        report.historyComplete
          ? t("reporting:completeHistory")
          : t("reporting:partial"),
      ],
    ]);
    add(t("reporting:details"), [headers, ...rows]);
    add(t("reporting:flow"), [
      [
        t("reporting:status"),
        t("reporting:current"),
        t("reporting:inflow"),
        t("reporting:outflow"),
        t("reporting:dwell"),
      ],
      ...report.states.map((state) => [
        state.name,
        state.count,
        state.inflow,
        state.outflow,
        state.averageDays,
      ]),
    ]);
    add(t("reporting:weekly"), [
      [
        t("reporting:week"),
        ...[
          "created",
          "pirun",
          "prod",
          "launched",
          "unlaunched",
          "overdue",
        ].map((key) => t(`reporting:series.${key}`)),
        t("reporting:coverage"),
      ],
      ...report.weekly.map((week) => [
        week.start,
        week.created,
        week.pirun,
        week.prod,
        week.launched,
        week.unlaunched,
        week.overdue,
        week.available
          ? week.partial
            ? t("reporting:partial")
            : t("reporting:completeHistory")
          : t("reporting:noHistory"),
      ]),
    ]);
    const data = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([new Uint8Array(data as ArrayBuffer).buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${name}.xlsx`,
    );
    return;
  }
  const images = await chartImages(root);
  if (format === "pptx") {
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "Kaneo";
    pptx.subject = report.project.name;
    pptx.title = name;
    pptx.theme = {
      headFontFace: "Microsoft YaHei",
      bodyFontFace: "Microsoft YaHei",
    };
    const pptRows = (data: Array<Array<unknown>>) =>
      data.map((row) => row.map((value) => ({ text: String(value ?? "—") })));
    const title = (label: string) => {
      const slide = pptx.addSlide();
      slide.addText(label, {
        x: 0.5,
        y: 0.3,
        w: 12.3,
        h: 0.6,
        fontSize: 22,
        color: "197858",
        bold: true,
      });
      slide.addText(`${report.project.name} · ${report.asOf}`, {
        x: 0.5,
        y: 0.95,
        w: 12.3,
        h: 0.3,
        fontSize: 10,
        color: "687B76",
      });
      return slide;
    };
    const cover = title(t("reporting:overview"));
    cover.addTable(
      pptRows([[t("reporting:metric"), t("reporting:quantity")], ...summary]),
      {
        x: 0.6,
        y: 1.7,
        w: 12,
        h: 2.5,
        fontSize: 22,
        border: { type: "solid", pt: 0.5, color: "DDDDDD" },
        color: "263D36",
        margin: 0.15,
      },
    );
    cover.addText(`${t("reporting:coverage")}: ${report.coverageStart}`, {
      x: 0.6,
      y: 5.8,
      w: 12,
      h: 0.4,
      fontSize: 12,
    });
    const states = title(t("reporting:flow"));
    states.addTable(
      pptRows([
        [
          t("reporting:status"),
          t("reporting:current"),
          t("reporting:inflow"),
          t("reporting:outflow"),
        ],
        ...report.states.map((state) => [
          state.name,
          state.count,
          state.inflow,
          state.outflow,
        ]),
      ]),
      {
        x: 0.6,
        y: 1.5,
        w: 12,
        fontSize: 13,
        border: { type: "solid", pt: 0.5, color: "DDDDDD" },
        autoPage: true,
        autoPageRepeatHeader: true,
      },
    );
    for (let index = 0; index < images.length; index++) {
      const slide = title(`${t("reporting:charts")} ${index + 1}`);
      slide.addImage({ data: images[index]!, x: 0.6, y: 1.5, w: 12, h: 4.6 });
    }
    for (let offset = 0; offset < rows.length; offset += 12) {
      const slide = title(t("reporting:details"));
      slide.addTable(
        pptRows([
          compactRow(headers),
          ...rows.slice(offset, offset + 12).map(compactRow),
        ]),
        {
          x: 0.6,
          y: 1.5,
          w: 12,
          fontSize: 11,
          border: { type: "solid", pt: 0.5, color: "DDDDDD" },
          autoPage: true,
          autoPageRepeatHeader: true,
        },
      );
    }
    const blob = await pptx.write({ outputType: "blob" });
    saveAs(blob as Blob, `${name}.pptx`);
    return;
  }
  if (format === "docx") {
    const {
      Document,
      Packer,
      Paragraph,
      HeadingLevel,
      Table,
      TableRow,
      TableCell,
      TextRun,
      ImageRun,
      WidthType,
    } = await import("docx");
    const table = (data: Array<Array<unknown>>) =>
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: data.map(
          (row, index) =>
            new TableRow({
              tableHeader: index === 0,
              children: row.map(
                (value) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: String(value ?? "—"),
                            bold: index === 0,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
        ),
      });
    const children = [
      new Paragraph({ text: report.project.name, heading: HeadingLevel.TITLE }),
      new Paragraph(report.asOf),
      new Paragraph({
        text: t("reporting:overview"),
        heading: HeadingLevel.HEADING_1,
      }),
      table([[t("reporting:metric"), t("reporting:quantity")], ...summary]),
      new Paragraph(`${t("reporting:coverage")}: ${report.coverageStart}`),
      new Paragraph({
        text: t("reporting:flow"),
        heading: HeadingLevel.HEADING_1,
      }),
      table([
        [
          t("reporting:status"),
          t("reporting:current"),
          t("reporting:inflow"),
          t("reporting:outflow"),
        ],
        ...report.states.map((state) => [
          state.name,
          state.count,
          state.inflow,
          state.outflow,
        ]),
      ]),
      ...images.map(
        (image) =>
          new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: Uint8Array.from(atob(image.split(",")[1]!), (char) =>
                  char.charCodeAt(0),
                ),
                transformation: { width: 590, height: 235 },
              }),
            ],
          }),
      ),
      new Paragraph({
        text: t("reporting:details"),
        heading: HeadingLevel.HEADING_1,
      }),
      table([compactRow(headers), ...rows.map(compactRow)]),
    ];
    const document = new Document({
      sections: [
        {
          properties: {
            page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
          },
          children,
        },
      ],
      styles: {
        default: { document: { run: { font: "Microsoft YaHei", size: 22 } } },
      },
    });
    saveAs(await Packer.toBlob(document), `${name}.docx`);
    return;
  }
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.title = t("reporting:pdfPrint");
  const statusRows = report.states
    .map(
      (state) =>
        `<tr><td>${escape(state.name)}</td><td>${state.count}</td><td>${state.inflow}</td><td>${state.outflow}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(name)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial,'Microsoft YaHei',sans-serif;color:#263d36}h1,h2{color:#197858}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:6px;text-align:left}thead{display:table-header-group}tr,img{break-inside:avoid}img{width:100%;max-height:165mm;object-fit:contain}.chart{break-before:page}</style></head><body><h1>${escape(report.project.name)}</h1><p>${escape(report.asOf)}</p><table>${summary.map(([label, count]) => `<tr><th>${escape(label)}</th><td>${count}</td></tr>`).join("")}</table><p>${escape(t("reporting:coverage"))}: ${escape(report.coverageStart)}</p><h2>${escape(t("reporting:flow"))}</h2><table><thead><tr>${["status", "current", "inflow", "outflow"].map((key) => `<th>${escape(t(`reporting:${key}`))}</th>`).join("")}</tr></thead><tbody>${statusRows}</tbody></table>${images.map((image) => `<div class="chart"><img src="${image}" alt="${escape(t("reporting:charts"))}"></div>`).join("")}<h2>${escape(t("reporting:details"))}</h2><table><thead><tr>${compactRow(
    headers,
  )
    .map((header) => `<th>${escape(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${compactRow(row)
          .map((value) => `<td>${escape(value)}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></body></html>`;
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 60000);
  };
  document.body.appendChild(frame);
}
