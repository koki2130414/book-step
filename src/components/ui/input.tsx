import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-beige-300 bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
