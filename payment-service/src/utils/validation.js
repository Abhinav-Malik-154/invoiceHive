import { z } from "zod";

export const createPaymentLinkSchema = z.object({
  invoiceId:     z.string().min(1, "Invoice ID required"),
  invoiceNumber: z.string().min(1, "Invoice number required"),
  amount:        z.number().positive("Amount must be positive"),
  currency:      z.string().toUpperCase().default("USD"),
  clientId:      z.string().optional().default(""),
  clientName:    z.string().optional().default(""),
  clientEmail:   z.string().email().optional().or(z.literal("")).default(""),
});

export const refundSchema = z.object({
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"])
    .optional()
    .default("requested_by_customer"),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join("."), message: e.message,
    }));
    return res.status(400).json({ success: false, errors });
  }
  req.body = result.data;
  next();
};