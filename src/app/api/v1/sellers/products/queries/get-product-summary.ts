import prisma from "@/lib/db/prisma";

export async function getProductSummary(shopId: string) {
  const [statusCounts, totalValue, lowStockCount] = await Promise.all([
    prisma.product.groupBy({
      by: ["status"],
      where: { shopId },
      _count: { id: true },
    }),
    prisma.product.aggregate({
      where: { shopId, isActive: true },
      _sum: { basePrice: true },
      _avg: { basePrice: true },
    }),
    prisma.product.count({
      where: { shopId, stockQuantity: { lte: 10 }, isActive: true },
    }),
  ]);

  return {
    byStatus: Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.id])
    ),
    inventory: {
      lowStockCount,
      totalValue: totalValue._sum.basePrice || 0,
      averagePrice: totalValue._avg.basePrice || 0,
    },
  };
}
