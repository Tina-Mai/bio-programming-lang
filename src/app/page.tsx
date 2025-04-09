"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Code, ParentChild, Folder, Settings, AddLarge } from "@carbon/icons-react";
import DotBackground from "@/components/global/DotBackground";

export default function Home() {
	const [mode, setMode] = useState<"blocks" | "code">("blocks");

	const mockProjects = ["New design", "Symmetric dimer of 2-fold symmetry", "3-fold symmetric functional site scaffolding", "Asymmetric complex of 2 dimers of 2-fold symmetry"];

	return (
		<div className="horizontal h-[calc(100vh)] items-start p-5 gap-5">
			<div className="vertical gap-5 items-start max-w-48">
				<Image src="/logo.svg" alt="Logo" width={50} height={50} className="mb-5" />
				<Button variant="outline" size="sm" className="w-full text-slate-600">
					<AddLarge size={20} />
					New design
				</Button>
				<div className="vertical gap-1">
					<div className="horizontal items-center gap-2 mb-3 text-slate-500">
						<Folder size={20} />
						<div className="font-medium">Designs</div>
					</div>

					{mockProjects.map((project) => (
						<div key={project} className="horizontal items-center text-sm hover:bg-slate-200 rounded px-2 py-1 transition-all duration-300 gap-2">
							{project}
						</div>
					))}
				</div>
				<div className="horizontal items-center gap-2 mb-3 text-slate-500">
					<Settings size={20} />
					<div className="font-medium">Settings</div>
				</div>
			</div>
			<div className="relative vertical h-full w-full border border-slate-300 bg-white/80 rounded-sm overflow-hidden">
				<div className="border-b border-slate-300 px-5 py-3">
					<div className="text-slate-500 text-sm font-medium">Project name</div>
				</div>
				<div className="relative">
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
		</div>
	);
}
