import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-input/80 bg-background/88 px-3 py-2.5 text-base shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:shadow-[0_16px_28px_rgba(2,6,23,0.24)]",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
