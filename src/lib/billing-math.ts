export function estimateMonthly(opts: {
  agents: number;
  priceCents: number;
  perAgentCents: number;
}): number {
  return opts.priceCents + opts.agents * opts.perAgentCents;
}
