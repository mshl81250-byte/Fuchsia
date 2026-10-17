import assert from "node:assert/strict";
import { getRentalOccupancy } from "./rental-availability";

const queryable = {
  async query(sql: string): Promise<[any[], unknown]> {
    if (sql.includes("FROM order_items")) {
      return [[
        { rental_start_date: new Date("2026-10-20T00:00:00.000Z"), rental_end_date: new Date("2026-10-20T00:00:00.000Z"), quantity: 1 },
        { rental_start_date: "legacy-invalid", rental_end_date: null, quantity: 1 },
      ], undefined];
    }
    return [[
      { start_date: new Date("2026-10-21T00:00:00.000Z"), end_date: new Date("2026-10-21T00:00:00.000Z"), quantity: 1 },
    ], undefined];
  },
};

const result = await getRentalOccupancy(queryable, 1, "2026-10-20", "2026-10-20", 1);
assert.equal(result.maxReservedQuantity, 1);
assert.equal(result.maxMaintenanceQuantity, 1);
assert.equal(result.maxOccupiedQuantity, 2);
assert.equal(result.blockedThrough, "2026-10-21");
console.log("rental-availability: legacy date representations are handled safely");
