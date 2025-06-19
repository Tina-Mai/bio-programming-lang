"use client";
import React from "react";
import LinearViewer from "./LinearViewer";
import { Section } from "@/types";
import { Draggable } from "@carbon/icons-react";
import SequencePopover from "./SequencePopover";

const LinearViewerDemo = () => {
	const sequence = "ATGCGATCGTAGCTACGTACGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC";

	const sections = [
		{
			text: "Promoter",
			type: "promoter",
			start: 0,
			end: 10,
		},
		{
			text: "CDS",
			type: "CDS",
			start: 11,
			end: 40,
		},
		{
			text: "Custom Section",
			start: 41,
			end: 65,
		},
		{
			text: "CDS",
			type: "CDS",
			start: 66,
			end: 80,
		},
	];

	const longSections = [
		{
			text: "Long Promoter Region",
			type: "promoter",
			start: 10,
			end: 50,
		},
		{
			text: "Section A",
			start: 60,
			end: 120,
		},
		{
			text: "Section B",
			direction: "reverse" as const,
			start: 130,
			end: 180,
		},
	];

	const SequenceInstance = ({ name, length, sequence, sections }: { name: string; length: number; sequence?: string; sections: Section[] }) => {
		return (
			<div className="vertical flex-1">
				<div className="horizontal px-5 items-center justify-between border-y border-slate-300 bg-slate-100 py-2 gap-2">
					<div className="horizontal items-center gap-2">
						<div className="text-sm font-semibold text-slate-700">{name}</div>
						<div className="font-mono text-sm text-slate-500/60">{length}</div>
					</div>
					<div className="horizontal gap-1 items-center">
						<SequencePopover />
						<Draggable size={18} className="text-slate-400 hover:!text-slate-700" />
					</div>
				</div>
				<LinearViewer length={length} sequence={sequence} sections={sections} />
			</div>
		);
	};

	return (
		// mt-[52px] is to offset the header at the top of Program.tsx
		<div className="vertical w-full h-full justify-start overflow-y-auto mt-[52px] flex-1">
			<SequenceInstance name="Example" length={sequence.length} sequence={sequence} sections={sections} />
			<SequenceInstance name="Longer Sequence" length={819} sections={longSections} />
		</div>
	);
};

export default LinearViewerDemo;
