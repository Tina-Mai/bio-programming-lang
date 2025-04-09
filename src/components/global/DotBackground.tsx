import { cn } from "@/lib/utils";
import React from "react";

export function DotBackground() {
	return (
		<div
			className={cn(
				"z-0 absolute inset-0",
				"[background-size:15px_15px]",
				"[background-image:radial-gradient(#cbd5e1_1px,transparent_1px)]",
				"dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]"
			)}
		/>
	);
}

export default DotBackground;
