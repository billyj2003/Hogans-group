import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { format } from "date-fns";

type PodDelivery = {
  quantity: number;
  deliveredQuantity: number | null;
  deliveredAt: Date | null;
  vehicleReg: string | null;
  haulierName: string | null;
  despatchedBy: string | null;
  loadNumber: string | null;
  grossWeight: number | null;
  tareWeight: number | null;
  temperature: number | null;
  podSignedBy: string | null;
  podSignatureData: string | null;
  podNote: string | null;
  driver: { name: string } | null;
  job: {
    material: string;
    unit: string;
    siteAddress: string;
    docketNumber: string | null;
    account: { name: string };
  };
};

export async function addPodPage(
  pdf: PDFDocument,
  delivery: PodDelivery,
  fonts: { font: PDFFont; bold: PDFFont },
) {
  const page: PDFPage = pdf.addPage([420, 680]);
  const { font, bold } = fonts;

  let y = 640;
  const line = (text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    page.drawText(text, {
      x: 40,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? bold : font,
      color: rgb(0.09, 0.1, 0.11),
    });
    y -= opts.gap ?? 20;
  };

  line("HOGAN GROUP", { bold: true, size: 18, gap: 24 });
  line("Proof of Delivery", { bold: true, size: 13, gap: 28 });

  line(`Account: ${delivery.job.account.name}`);
  line(`Material: ${delivery.job.material}`);
  line(`Quantity planned: ${delivery.quantity} ${delivery.job.unit}`);
  line(
    `Quantity delivered: ${
      delivery.deliveredQuantity != null
        ? `${delivery.deliveredQuantity} ${delivery.job.unit}`
        : "—"
    }`,
  );
  line(`Site address: ${delivery.job.siteAddress}`);
  line(`Docket / PO: ${delivery.job.docketNumber ?? "—"}`);
  line(
    `Vehicle: ${delivery.vehicleReg ?? "—"}${delivery.driver ? ` (${delivery.driver.name})` : ""}`,
  );
  if (delivery.haulierName) {
    line(`Haulier: ${delivery.haulierName}`);
  }
  if (delivery.loadNumber) {
    line(`Load #: ${delivery.loadNumber}`);
  }
  if (delivery.grossWeight != null || delivery.tareWeight != null) {
    line(
      `Gross: ${delivery.grossWeight ?? "—"} · Tare: ${delivery.tareWeight ?? "—"}` +
        (delivery.temperature != null ? ` · Temp: ${delivery.temperature}°C` : ""),
    );
  }
  if (delivery.despatchedBy) {
    line(`Despatched by: ${delivery.despatchedBy}`);
  }
  y -= 10;
  line(`Delivered: ${delivery.deliveredAt ? format(delivery.deliveredAt, "d MMM yyyy HH:mm") : "—"}`);
  line(`Signed by: ${delivery.podSignedBy ?? "—"}`);
  if (delivery.podNote) {
    line(`Notes: ${delivery.podNote}`, { size: 10, gap: 16 });
  }

  if (delivery.podSignatureData?.startsWith("data:image/png;base64,")) {
    try {
      const base64 = delivery.podSignatureData.slice("data:image/png;base64,".length);
      const png = await pdf.embedPng(Buffer.from(base64, "base64"));
      const sigHeight = 60;
      const sigWidth = (png.width / png.height) * sigHeight;
      y -= 10;
      page.drawText("Signature:", { x: 40, y, size: 10, font, color: rgb(0.09, 0.1, 0.11) });
      page.drawImage(png, { x: 40, y: y - sigHeight - 4, width: sigWidth, height: sigHeight });
    } catch {
      // Skip a malformed signature rather than failing the whole PDF.
    }
  }
}

export async function createPodFonts(pdf: PDFDocument) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { font, bold };
}
