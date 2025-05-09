import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: "bg-slate-700 text-primary-foreground hover:bg-slate-700/85",
				destructive: "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60",
				outline: "border border-slate-300 text-slate-800 hover:bg-slate-200 hover:border-slate-400 hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-slate-200/80 text-slate-700",
				link: "text-primary underline-offset-4 hover:underline",
				accent: "text-primary-foreground bg-[#2644D6] hover:bg-[#2644D6]/85",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 rounded gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-sm": "p-1 rounded-[3px]",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
