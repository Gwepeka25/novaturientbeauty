import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPurchaseUnlocked, isDownloadTokenValid } from "@/lib/digital-resources";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const purchase = await prisma.digitalResourcePurchase.findUnique({
    where: { downloadToken: token },
    include: { resource: true },
  });

  if (!purchase || !isDownloadTokenValid(purchase) || !isPurchaseUnlocked(purchase)) {
    return NextResponse.json({ error: "This download link isn't valid." }, { status: 404 });
  }

  await prisma.digitalResourcePurchase.update({
    where: { id: purchase.id },
    data: { downloadCount: { increment: 1 } },
  });

  return new NextResponse(new Uint8Array(purchase.resource.fileData), {
    headers: {
      "Content-Type": purchase.resource.fileMimeType,
      "Content-Disposition": `attachment; filename="${purchase.resource.fileName}"`,
      "Content-Length": String(purchase.resource.fileSizeBytes),
    },
  });
}
