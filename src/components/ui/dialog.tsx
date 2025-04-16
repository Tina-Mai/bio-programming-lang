"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Close } from "@carbon/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dialogContentVariants = cva(
	"border-1 border-white bg-white/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-6000 md:z-50 grid w-full max-w-[calc(100%-2rem)] h-fit max-h-[calc(100%-5rem)] sm:max-h-[calc(100%-8rem)] md:max-h-[calc(100%-8rem)] md:ml-8 translate-x-[-50%] translate-y-[-50%] gap-4 rounded p-6 shadow-lg duration-200",
	{
		variants: {
			size: {
				sm: "sm:max-w-sm",
				default: "sm:max-w-lg",
				lg: "sm:max-w-2xl md:max-w-3xl xl:max-w-4xl",
			},
		},
		defaultVariants: {
			size: "default",
		},
	}
);

// Create a context to pass dialog size to children
const DialogSizeContext = React.createContext<"default" | "lg" | "sm" | undefined>(undefined);

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-5500 md:z-50 bg-slate-600/25 backdrop-blur-sm",
				className
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	size,
	hideCloseButton = false,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & VariantProps<typeof dialogContentVariants> & { hideCloseButton?: boolean }) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogSizeContext.Provider value={size || "default"}>
				<DialogPrimitive.Content data-slot="dialog-content" className={cn(dialogContentVariants({ size, className }))} {...props}>
					{children}
					{!hideCloseButton && (
						<DialogPrimitive.Close className="bg-slate-300/70 hover:bg-slate-400/50 p-px transition-all duration-200 cursor-pointer data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
							<Close />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					)}
				</DialogPrimitive.Content>
			</DialogSizeContext.Provider>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	const size = React.useContext(DialogSizeContext);
	return <DialogPrimitive.Title data-slot="dialog-title" className={cn(size === "lg" ? "text-2xl" : "text-xl", "leading-none", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, dialogContentVariants };
