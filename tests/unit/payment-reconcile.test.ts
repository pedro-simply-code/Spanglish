import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieve = vi.fn();
const fulfillClasses = vi.fn();
const fulfillAi = vi.fn();
const cancelClasses = vi.fn();
const cancelAi = vi.fn();

vi.mock("@/server/payments/stripe", () => ({
  stripeEnabled: true,
  stripe: () => ({ checkout: { sessions: { retrieve } } }),
}));
vi.mock("@/server/payments/checkout", () => ({ fulfillStripeOrder: fulfillClasses, cancelStripeOrder: cancelClasses }));
vi.mock("@/server/ai/credits", () => ({ fulfillAiStripeOrder: fulfillAi, cancelAiStripeOrder: cancelAi }));
vi.mock("@/server/db", () => ({ db: {} }));

const { reconcileStripeOrder } = await import("@/server/payments/reconcile");
const order = { id: "o1", providerRef: "cs_1", buyerUserId: "u1" };

describe("reconcileStripeOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fulfills a paid session (classes)", async () => {
    retrieve.mockResolvedValue({ id: "cs_1", client_reference_id: "o1", payment_status: "paid", status: "complete", amount_total: 1800 });
    fulfillClasses.mockResolvedValue({ status: "paid", credits: 1 });
    expect(await reconcileStripeOrder("classes", order)).toEqual({ outcome: "paid", credits: 1 });
    expect(fulfillClasses).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o1", amountTotal: 1800 }));
  });

  it("fulfills a paid AI session with the AI fulfiller", async () => {
    retrieve.mockResolvedValue({ id: "cs_1", client_reference_id: "o1", payment_status: "paid", status: "complete", amount_total: 100 });
    fulfillAi.mockResolvedValue({ status: "already-paid", credits: 70 });
    expect(await reconcileStripeOrder("ai", order)).toEqual({ outcome: "paid", credits: 70 });
    expect(fulfillClasses).not.toHaveBeenCalled();
  });

  it("cancels an expired session", async () => {
    retrieve.mockResolvedValue({ id: "cs_1", client_reference_id: "o1", payment_status: "unpaid", status: "expired" });
    expect((await reconcileStripeOrder("ai", order)).outcome).toBe("canceled");
    expect(cancelAi).toHaveBeenCalledWith("cs_1", "o1");
  });

  it("returns the Stripe page of an open session", async () => {
    retrieve.mockResolvedValue({ id: "cs_1", client_reference_id: "o1", payment_status: "unpaid", status: "open", url: "https://checkout.stripe.com/x" });
    expect(await reconcileStripeOrder("classes", order)).toEqual({ outcome: "open", url: "https://checkout.stripe.com/x" });
  });

  it("leaves bank payments still confirming", async () => {
    retrieve.mockResolvedValue({ id: "cs_1", client_reference_id: "o1", payment_status: "unpaid", status: "complete" });
    expect((await reconcileStripeOrder("classes", order)).outcome).toBe("processing");
  });

  it("ignores a session that belongs to another order", async () => {
    retrieve.mockResolvedValue({ id: "cs_1", client_reference_id: "other", payment_status: "paid", status: "complete" });
    expect((await reconcileStripeOrder("classes", order)).outcome).toBe("not-found");
    expect(fulfillClasses).not.toHaveBeenCalled();
  });

  it("reports Stripe errors without throwing", async () => {
    retrieve.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await reconcileStripeOrder("classes", order)).outcome).toBe("error");
  });
});
