import { z } from "zod";

const nullableTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalReferenceId = nullableTrimmedString.transform((value) =>
  value === "none" ? null : value
);

export const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  barcode: nullableTrimmedString,
  salePrice: z.coerce.number().finite().positive().max(1_000_000),
  costPrice: z.coerce.number().finite().nonnegative().max(1_000_000),
  stock: z.coerce.number().finite().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.coerce.number().finite().min(0).max(1_000_000).default(5),
  category: nullableTrimmedString,
  categoryId: optionalReferenceId,
  description: nullableTrimmedString.transform((value) => value?.slice(0, 1000) ?? null),
  supplierId: optionalReferenceId,
  image: nullableTrimmedString,
  canBeSoldByWeight: z.coerce.boolean().default(false),
  weightSalePrice: z.coerce.number().finite().positive().max(1_000_000).nullable().optional(),
  weightCostPrice: z.coerce.number().finite().nonnegative().max(1_000_000).nullable().optional(),
});

export const productUpdateSchema = productSchema.partial();

export const saleSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().finite().positive().max(1_000_000),
  discount: z.coerce.number().finite().min(0).max(1_000_000).default(0),
});

export const bulkSaleItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().finite().positive().max(1_000_000),
  discount: z.coerce.number().finite().min(0).max(1_000_000).default(0),
  soldByWeight: z.coerce.boolean().optional().default(false),
});

export const bulkSaleSchema = z.object({
  items: z.array(bulkSaleItemSchema).min(1).max(250),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contact: nullableTrimmedString.transform((value) => value?.slice(0, 255) ?? null),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
});
