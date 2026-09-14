import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addPodPage, createPodFonts } from "@/lib/pod-pdf";

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
  const fonts = await createPodFonts(pdf);
  await addPodPage(pdf, delivery, fonts);

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="POD-${delivery.job.docketNumber ?? delivery.id}.pdf"`,
    },
  });
}
