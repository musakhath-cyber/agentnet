import type { Sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import { audit } from "./audit";
import { getPlan } from "./profiles";

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

export async function changePlan(
  sql: Sql,
  userId: string,
  planId: string,
): Promise<{ ok: true; planId: string; checkoutUrl?: string } | { ok: false; error: string }> {
  const plan = await getPlan(sql, planId);
  if (!plan || !plan.isActive) return { ok: false, error: "Unknown plan." };

  if (planId === "free" || plan.priceCents === 0 || !paystackConfigured()) {
    await sql.query(`update profiles set plan_id = $1, updated_at = now() where user_id = $2`, [
      planId,
      userId,
    ]);
    await sql.query(
      `update subscriptions set status = 'cancelled', updated_at = now()
       where user_id = $1 and status = 'active'`,
      [userId],
    );
    await sql.query(
      `insert into subscriptions (id, user_id, plan_id, status, provider, current_period_start, current_period_end)
       values ($1,$2,$3,'active',$4, now(), now() + interval '30 days')`,
      [newId("sub"), userId, planId, paystackConfigured() ? "paystack" : "manual"],
    );
    await audit(sql, {
      userId,
      action: "billing.plan_change",
      resourceType: "plan",
      resourceId: planId,
      meta: { provider: paystackConfigured() ? "paystack" : "manual" },
    });
    return { ok: true, planId };
  }

  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const origin = process.env.BETTER_AUTH_URL || process.env.APP_URL || "";
  const callback = origin ? `${origin.replace(/\/$/, "")}/dashboard/billing` : undefined;
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.priceCents,
        currency: plan.currency,
        metadata: { userId, planId },
        callback_url: callback,
      }),
    });
    const body = (await res.json()) as {
      status?: boolean;
      data?: { authorization_url?: string; reference?: string };
      message?: string;
    };
    if (!res.ok || !body.status || !body.data?.authorization_url) {
      return { ok: false, error: body.message || "Paystack initialization failed." };
    }
    await sql.query(
      `insert into payments (id, user_id, amount_cents, currency, status, provider, provider_ref)
       values ($1,$2,$3,$4,'pending','paystack',$5)`,
      [newId("pay"), userId, plan.priceCents, plan.currency, body.data.reference ?? null],
    );
    return { ok: true, planId, checkoutUrl: body.data.authorization_url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment provider error." };
  }
}
