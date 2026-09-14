import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { job: { include: { account: true } }, driver: true },
  });

  if (!delivery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = session.user.role === "STAFF" || session.user.role === "ADMIN";
  const isOwner = session.user.accountId === delivery.job.accountId;
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (delivery.status !== "DELIVERED") {
    return NextResponse.json({ error: "Not yet delivered" }, { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 560]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 520;
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
    }`
  );
  line(`Site address: ${delivery.job.siteAddress}`);
  line(`Docket / PO: ${delivery.job.docketNumber ?? "—"}`);
  line(`Vehicle: ${delivery.vehicleReg ?? "—"}${delivery.driver ? ` (${delivery.driver.name})` : ""}`);
  y -= 10;
  line(`Delivered: ${delivery.deliveredAt ? format(delivery.deliveredAt, "d MMM yyyy HH:mm") : "—"}`);
  line(`Signed by: ${delivery.podSignedBy ?? "—"}`);
  if (delivery.podNote) {
    line(`Notes: ${delivery.podNote}`, { size: 10, gap: 16 });
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="POD-${delivery.job.docketNumber ?? delivery.id}.pdf"`,
    },
  });
}
