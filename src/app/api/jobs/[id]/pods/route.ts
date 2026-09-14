import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addPodPage, createPodFonts } from "@/lib/pod-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const ids = req.nextUrl.searchParams.getAll("deliveryId");
  if (ids.length === 0) {
    return NextResponse.json({ error: "No deliveries selected" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { account: true } });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = session.user.role === "STAFF" || session.user.role === "ADMIN";
  const isOwner = session.user.accountId === job.accountId;
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deliveries = await prisma.delivery.findMany({
    where: { id: { in: ids }, jobId, status: "DELIVERED" },
    include: { job: { include: { account: true } }, driver: true },
    orderBy: { deliveredAt: "asc" },
  });

  if (deliveries.length === 0) {
    return NextResponse.json({ error: "No delivered wagons in that selection" }, { status: 400 });
  }

  const pdf = await PDFDocument.create();
  const fonts = await createPodFonts(pdf);
  for (const delivery of deliveries) {
    await addPodPage(pdf, delivery, fonts);
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PODs-${job.docketNumber ?? job.id}.pdf"`,
    },
  });
}
