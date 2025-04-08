"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Code, ParentChild } from "@carbon/icons-react";
import DotBackground from "@/components/global/DotBackground";

export default function Home() {
	const [mode, setMode] = useState<"blocks" | "code">("blocks");

	return (
		<div className="horizontal h-[calc(100vh)] items-start p-5 gap-5">
			<Image src="/logo.svg" alt="Logo" width={50} height={50} />
			<div className="relative vertical h-full w-full border border-zinc-300 bg-white/90 rounded-sm overflow-hidden">
				<Button className="absolute z-100 top-3 right-3 w-min" onClick={() => setMode(mode === "blocks" ? "code" : "blocks")}>
					{mode === "blocks" ? (
						<div className="horizontal items-center gap-2">
							<Code />
							Show code
						</div>
					) : (
						<div className="horizontal items-center gap-2">
							<ParentChild /> Show blocks
						</div>
					)}
				</Button>
				{mode === "blocks" ? (
					<div>
						<DotBackground />
					</div>
				) : (
					<div>
						<div className="vertical p-5">Code!</div>
					</div>
				)}
			</div>
		</div>
	);
}
