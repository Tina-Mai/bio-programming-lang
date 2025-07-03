"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, SettingsAdjust, Chip } from "@carbon/icons-react";

const NewButton = ({ children }: { children: React.ReactNode }) => {
	return (
		<Button className="group px-2 items-center justify-center gap-2 bg-slate-100/80" variant="outline" size="icon-sm">
			{children}
		</Button>
	);
};

const NewButtons = () => {
	return (
		<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
			<NewButton>
				<SettingsAdjust className="text-zinc-500/70 group-hover:!text-zinc-500 transition-colors duration-200" />
				New Constraint
			</NewButton>
			<NewButton>
				<Chip className="text-zinc-500/70 group-hover:!text-zinc-500 transition-colors duration-200" />
				New Generator
			</NewButton>
			<NewButton>
				<Bookmark className="rotate-90 text-zinc-500/70 group-hover:!text-zinc-500 transition-colors duration-200" />
				New Segment
			</NewButton>
		</div>
	);
};

export default NewButtons;
