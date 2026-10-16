import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, userAddressesTable, usersTable } from "@workspace/db";
import { authenticatedUserId } from "../lib/user-session";

const router = Router();

function serializeAddress(row: typeof userAddressesTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function coordinate(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validPhone(value: string): boolean {
  return value.length >= 7 && value.length <= 40 && /^[+()0-9\s.-]+$/.test(value);
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لعرض عناوين التوصيل" });
      return;
    }
    const rows = await db.select().from(userAddressesTable)
      .where(eq(userAddressesTable.userId, userId))
      .orderBy(desc(userAddressesTable.isDefault), desc(userAddressesTable.createdAt));
    res.setHeader("Cache-Control", "no-store");
    res.json(rows.map(serializeAddress));
  } catch (error) {
    req.log.error({ error }, "Failed to list customer addresses");
    res.status(500).json({ error: "تعذر تحميل عناوين التوصيل" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لحفظ عنوان التوصيل" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const [user] = await db.select({ fullName: usersTable.fullName, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, userId));
    const label = typeof body.label === "string" ? body.label.trim() : "المنزل";
    const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : (user?.fullName ?? "").trim();
    const phone = typeof body.phone === "string" ? body.phone.trim() : (user?.phone ?? "").trim();
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const latitude = coordinate(body.latitude);
    const longitude = coordinate(body.longitude);

    if (label.length < 1 || label.length > 80 || recipientName.length < 2 || recipientName.length > 120 || !validPhone(phone) || address.length < 5 || address.length > 1000 || notes.length > 600) {
      res.status(400).json({ error: "تحقق من اسم العنوان واسم المستلم ورقم الهاتف وتفاصيل العنوان" });
      return;
    }
    if ((latitude === undefined) !== (longitude === undefined) || Number.isNaN(latitude) || Number.isNaN(longitude) ||
      (latitude != null && (latitude < -90 || latitude > 90)) || (longitude != null && (longitude < -180 || longitude > 180))) {
      res.status(400).json({ error: "إحداثيات موقع العنوان غير صحيحة" });
      return;
    }

    const existing = await db.select({ id: userAddressesTable.id }).from(userAddressesTable)
      .where(eq(userAddressesTable.userId, userId)).limit(1);
    const isDefault = body.isDefault === true || existing.length === 0;
    if (isDefault) {
      await db.update(userAddressesTable).set({ isDefault: false }).where(eq(userAddressesTable.userId, userId));
    }
    const [insertResult] = await db.insert(userAddressesTable).values({
      userId,
      label,
      recipientName,
      phone,
      address,
      notes: notes || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      isDefault,
    });
    const id = Number(insertResult.insertId);
    const [created] = await db.select().from(userAddressesTable)
      .where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, userId)));
    if (!created) {
      res.status(500).json({ error: "تعذر حفظ عنوان التوصيل" });
      return;
    }
    if (isDefault) await db.update(usersTable).set({ address }).where(eq(usersTable.id, userId));
    res.status(201).json(serializeAddress(created));
  } catch (error) {
    req.log.error({ error }, "Failed to create customer address");
    res.status(500).json({ error: "تعذر حفظ عنوان التوصيل" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لتعديل عنوان التوصيل" });
      return;
    }
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "معرّف العنوان غير صحيح" });
      return;
    }
    const [existing] = await db.select().from(userAddressesTable)
      .where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, userId)));
    if (!existing) {
      res.status(404).json({ error: "العنوان غير موجود لهذا الحساب" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<typeof userAddressesTable.$inferInsert> = {};
    if (body.label !== undefined) {
      if (typeof body.label !== "string" || body.label.trim().length < 1 || body.label.trim().length > 80) {
        res.status(400).json({ error: "اسم العنوان غير صحيح" });
        return;
      }
      patch.label = body.label.trim();
    }
    if (body.recipientName !== undefined) {
      if (typeof body.recipientName !== "string" || body.recipientName.trim().length < 2 || body.recipientName.trim().length > 120) {
        res.status(400).json({ error: "اسم المستلم غير صحيح" });
        return;
      }
      patch.recipientName = body.recipientName.trim();
    }
    if (body.phone !== undefined) {
      if (typeof body.phone !== "string" || !validPhone(body.phone.trim())) {
        res.status(400).json({ error: "رقم الهاتف غير صحيح" });
        return;
      }
      patch.phone = body.phone.trim();
    }
    if (body.address !== undefined) {
      if (typeof body.address !== "string" || body.address.trim().length < 5 || body.address.trim().length > 1000) {
        res.status(400).json({ error: "تفاصيل العنوان غير صحيحة" });
        return;
      }
      patch.address = body.address.trim();
    }
    if (body.notes !== undefined) {
      if (typeof body.notes !== "string" || body.notes.trim().length > 600) {
        res.status(400).json({ error: "ملاحظات التوصيل طويلة جدًا" });
        return;
      }
      patch.notes = body.notes.trim() || null;
    }
    if (body.latitude !== undefined || body.longitude !== undefined) {
      const latitude = coordinate(body.latitude ?? null);
      const longitude = coordinate(body.longitude ?? null);
      if (Number.isNaN(latitude) || Number.isNaN(longitude) || (latitude != null && (latitude < -90 || latitude > 90)) || (longitude != null && (longitude < -180 || longitude > 180))) {
        res.status(400).json({ error: "إحداثيات موقع العنوان غير صحيحة" });
        return;
      }
      patch.latitude = latitude ?? null;
      patch.longitude = longitude ?? null;
    }
    if (body.isDefault !== undefined) {
      if (typeof body.isDefault !== "boolean") {
        res.status(400).json({ error: "قيمة العنوان الافتراضي غير صحيحة" });
        return;
      }
      patch.isDefault = body.isDefault;
    }

    if (patch.isDefault === true) {
      await db.update(userAddressesTable).set({ isDefault: false }).where(eq(userAddressesTable.userId, userId));
    }
    await db.update(userAddressesTable).set(patch).where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, userId)));
    const [updated] = await db.select().from(userAddressesTable)
      .where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, userId)));
    if (updated?.isDefault) await db.update(usersTable).set({ address: updated.address }).where(eq(usersTable.id, userId));
    res.json(serializeAddress(updated!));
  } catch (error) {
    req.log.error({ error }, "Failed to update customer address");
    res.status(500).json({ error: "تعذر تحديث عنوان التوصيل" });
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  try {
    const userId = await authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "يلزم تسجيل الدخول لحذف عنوان التوصيل" });
      return;
    }
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "معرّف العنوان غير صحيح" });
      return;
    }
    const [existing] = await db.select().from(userAddressesTable)
      .where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, userId)));
    if (!existing) {
      res.status(404).json({ error: "العنوان غير موجود لهذا الحساب" });
      return;
    }
    await db.delete(userAddressesTable)
      .where(and(eq(userAddressesTable.id, id), eq(userAddressesTable.userId, userId)));
    if (existing.isDefault) {
      const [next] = await db.select().from(userAddressesTable).where(eq(userAddressesTable.userId, userId))
        .orderBy(desc(userAddressesTable.createdAt), desc(userAddressesTable.id)).limit(1);
      if (next) {
        await db.update(userAddressesTable).set({ isDefault: true }).where(eq(userAddressesTable.id, next.id));
        await db.update(usersTable).set({ address: next.address }).where(eq(usersTable.id, userId));
      } else {
        await db.update(usersTable).set({ address: null }).where(eq(usersTable.id, userId));
      }
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ error }, "Failed to delete customer address");
    res.status(500).json({ error: "تعذر حذف عنوان التوصيل" });
  }
});

export default router;
