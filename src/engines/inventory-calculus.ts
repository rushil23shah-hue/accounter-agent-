//deterministic financial math
import { InventoryItem, CFOInventoryCalculus } from "../contracts/index.js";

export class CFOInventoryCalculusEngine {
  /**
   * Computes Exponential Moving Average (EMA) for sales velocity.
   * Multiplier = 2 / (period + 1)
   */
  public static calculateEMA(history: number[], period: number): number {
    if (history.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = history[0];
    for (let i = 1; i < history.length; i++) {
      ema = history[i] * k + ema * (1 - k);
    }
    return Number(ema.toFixed(2));
  }

  /**
   * Reorder Point = (Lead Time in Days * Daily Velocity) + Safety Stock
   * Safety Stock = Safety Buffer in Days * Daily Velocity
   */
  public static evaluateItem(
    item: InventoryItem,
    currentLiquidCashUSD: number,
    reservedFloorUSD: number,
    dailyBurnRateUSD: number
  ): CFOInventoryCalculus {
    // 14-day EMA is prioritized for routine tea/perishable reorder velocity
    const dailyVelocity = item.velocity.ema14Days > 0 ? item.velocity.ema14Days : 1;
    
    // Safety Stock = Safety Buffer (days) * Daily Velocity
    const safetyStock = Number((item.safetyBufferDays * dailyVelocity).toFixed(2));

    // Reorder Point = (Lead Time * Daily Velocity) + Safety Stock
    const reorderPoint = Number(((item.leadTimeDays * dailyVelocity) + safetyStock).toFixed(2));

    // Days Until Stockout = Current Stock / Daily Velocity
    const daysUntilStockout = Number((item.currentStockUnits / dailyVelocity).toFixed(1));

    // Recommended reorder batch (targets safety stock buffer + 14 days of sales)
    let recommendedUnits = 0;
    if (item.currentStockUnits <= reorderPoint) {
      recommendedUnits = Math.ceil((reorderPoint - item.currentStockUnits) + (dailyVelocity * 14));
    }

    const totalCostUSD = Number((recommendedUnits * item.unitCostUSD).toFixed(2));

    // Cash Runway = (Current Liquid Cash - Reserved Floor) / Daily Burn Rate
    const liquidAfterPurchase = currentLiquidCashUSD - totalCostUSD;
    const projectedRunwayDays = dailyBurnRateUSD > 0
      ? Number(((liquidAfterPurchase - reservedFloorUSD) / dailyBurnRateUSD).toFixed(1))
      : 0;

    return {
      sku: item.sku,
      dailyVelocityUnits: dailyVelocity,
      safetyStockUnits: safetyStock,
      reorderPointUnits: reorderPoint,
      daysUntilStockout: Math.max(0, daysUntilStockout),
      recommendedReorderUnits: recommendedUnits,
      totalCostUSD,
      projectedRunwayDaysPostPurchase: projectedRunwayDays,
      computedAt: new Date().toISOString(),
    };
  }
}