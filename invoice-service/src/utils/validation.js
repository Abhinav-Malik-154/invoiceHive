import { z } from "zod";

// ── Line item schema ──────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description required").max(500),
  quantity:    z.number().positive("Quantity must be > 0"),
  rate:        z.number().min(0, "Rate cannot be negative"),
  unit:        z.string().trim().max(30).optional().default(""),
});

const CURRENCIES     = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD", "AED"];
const PAYMENT_TERMS  = [0, 7, 14, 15, 30, 45, 60, 90];

// ── Create invoice ────────────────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  clientId: z.string({ required_error: "Client ID is required" }).min(1),

  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),

  currency: z
    .string().toUpperCase()
    .refine((v) => CURRENCIES.includes(v), { message: "Unsupported currency" })
    .optional().default("USD"),

  taxRate:  z.number().min(0).max(100).optional().default(0),
  discount: z.number().min(0).optional().default(0),

  issuedDate: z.coerce.date().optional().default(() => new Date()),

  dueDate: z.coerce
    .date({ required_error: "Due date is required" })
    .refine((d) => d > new Date(), { message: "Due date must be in the future" }),

  notes:    z.string().trim().max(2000).optional().default(""),
  terms:    z.string().trim().max(1000).optional().default(""),

  // Freelancer's billing info — sent from frontend (fetched from user profile)
  fromDetails: z.object({
    name:    z.string().trim().default(""),
    email:   z.string().email().optional().or(z.literal("")).default(""),
    address: z.string().trim().default(""),
    phone:   z.string().trim().default(""),
    logo:    z.string().url().optional().or(z.literal("")).default(""),
  }).optional().default({}),
});

// ── Update invoice — only drafts can be fully updated ────────────────────────
export const updateInvoiceSchema = createInvoiceSchema
  .omit({ clientId: true }) // Can't change the client after creation
  .partial();

// ── List invoices query params ────────────────────────────────────────────────
export const listInvoicesSchema = z.object({
  page:      z.coerce.number().int().positive().optional().default(1),
  limit:     z.coerce.number().int().min(1).max(100).optional().default(20),
  status:    z.enum(["draft", "sent", "viewed", "paid", "overdue", "cancelled"]).optional(),
  clientId:  z.string().optional(),
  search:    z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate:   z.coerce.date().optional(),
  sortBy:    z.enum(["createdAt", "dueDate", "total", "invoiceNumber"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ── Middleware factory ─────────────────────────────────────────────────────────
export const validate = (schema, source = "body") => (req, res, next) => {
  const data   = source === "query" ? req.query : req.body;
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  if (source === "query") req.query = result.data;
  else req.body = result.data;

  next();
};