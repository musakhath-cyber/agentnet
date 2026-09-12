import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "bg-surface text-muted border border-border",
        online: "bg-online/15 text-online",
        offline: "bg-surface text-subtle border border-border",
        pending: "bg-warn/15 text-warn",
        danger: "bg-danger/15 text-danger",
        accent: "bg-accent/15 text-fg",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export function statusBadge(status: string) {
  if (status === "online" || status === "completed") return "online" as const;
  if (status === "pending" || status === "processing" || status === "accepted") return "pending" as const;
  if (status === "failed" || status === "suspended" || status === "cancelled") return "danger" as const;
  return "offline" as const;
}
