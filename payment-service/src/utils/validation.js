import { z } from "zod";


// ── Middleware factory ─────────────────────────────────────────────
export const validate = (schema) => (req, res, next) => {

  const result = schema.safeParse(req.body);

  if (!result.success) {

    return res.status(422).json({

      success: false,

      message: "Validation failed",

      errors: result.error.errors.map(e => e.message),

    });

  }

  // attach parsed data (optional)
  req.validated = result.data;

  next();
};



// ── POST /payments/create-order ────────────────────────────────────
export const createPaymentOrderSchema = z.object({

  invoiceId: z.string(),

  invoiceNumber: z.string(),

  amount: z.number().positive(),

  currency: z
    .string()
    .length(3)
    .toUpperCase()
    .default("INR"),

  clientName: z.string().optional().nullable(),

  clientEmail: z.string().email().optional().nullable(),

  clientId: z.string().optional().nullable(),

});



// ── POST /payments/:paymentId/refund ───────────────────────────────
export const refundSchema = z.object({

  reason: z
    .enum([
      "duplicate",
      "fraudulent",
      "requested_by_customer",
      "other",
    ])
    .default("requested_by_customer"),

});