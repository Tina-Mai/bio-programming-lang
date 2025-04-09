import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex w-full px-3 py-1 bg-gray-9 border border-border-secondary rounded hover:bg-surface hover:border-gray-5 text-sm shadow-xs transition-all duration-300 outline-none h-8.5 min-w-0 file:text-foreground placeholder:text-text-subtext selection:bg-primary selection:text-primary-foreground dark:bg-input/30 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
				className
			)}
			{...props}
		/>
	);
}

export { Input };
