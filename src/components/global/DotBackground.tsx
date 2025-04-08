import { cn } from "@/lib/utils";
import React from "react";

export function DotBackground() {
	return (
		<div className="relative flex h-[50rem] w-full items-center justify-center">
			<div
				className={cn(
					"absolute inset-0",
					"[background-size:15px_15px]",
					"[background-image:radial-gradient(#d4d4d8_1px,transparent_1px)]",
					"dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
				)}
			/>
		</div>
	);
}

export default DotBackground;
