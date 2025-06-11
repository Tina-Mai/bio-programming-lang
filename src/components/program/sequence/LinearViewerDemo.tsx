"use client";
import React from "react";
import LinearViewer from "./LinearViewer";
import { Annotation } from "@/types";
import { Draggable } from "@carbon/icons-react";
import SequencePopover from "./SequencePopover";

const LinearViewerDemo = () => {
	// Sample DNA sequence
	const sequence = "ATGCGATCGTAGCTACGTACGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC";
	const longSequence =
		"CATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCAT";

	// Sample annotations
	const annotations = [
		{
			text: "Promoter",
			type: "promoter",
			direction: "forward" as const,
			start: 5,
			end: 20,
		},
		{
			text: "CDS",
			type: "CDS",
			direction: "forward" as const,
			start: 25,
			end: 45,
		},
		{
			text: "Terminator",
			type: "terminator",
			direction: "reverse" as const,
			start: 50,
			end: 65,
		},
		{
			text: "Custom Gene",
			type: "gene",
			direction: "forward" as const,
			start: 30,
			end: 60,
		},
	];

	const annotations2 = [
		{
			text: "Promoter",
			type: "promoter",
			direction: "forward" as const,
			start: 0,
			end: 10,
		},
		{
			text: "CDS",
			type: "CDS",
			direction: "forward" as const,
			start: 11,
			end: 40,
		},
		{
			text: "Custom Gene",
			type: "gene",
			direction: "forward" as const,
			start: 41,
			end: 65,
		},
		{
			text: "CDS",
			type: "CDS",
			direction: "forward" as const,
			start: 66,
			end: 80,
		},
	];

	const longAnnotations = [
		{
			text: "Long Promoter Region",
			type: "promoter",
			direction: "forward" as const,
			start: 10,
			end: 50,
		},
		{
			text: "Gene A",
			type: "CDS",
			direction: "forward" as const,
			start: 60,
			end: 120,
		},
		{
			text: "Gene B",
			type: "CDS",
			direction: "reverse" as const,
			start: 130,
			end: 180,
		},
	];

	const SequenceInstance = ({ name, sequence, annotations }: { name: string; sequence: string; annotations: Annotation[] }) => {
		return (
			<div className="vertical flex-1">
				<div className="horizontal px-5 items-center justify-between border-y border-slate-300 bg-slate-100 py-2 gap-2">
					<div className="horizontal items-center gap-2">
						<div className="text-sm font-semibold text-slate-700">{name}</div>
						<div className="font-mono text-sm text-slate-500/60">{sequence.length}</div>
					</div>
					<div className="horizontal gap-1 items-center">
						<SequencePopover />
						<Draggable size={18} className="text-slate-400 hover:!text-slate-700" />
					</div>
				</div>
				<LinearViewer sequence={sequence} annotations={annotations} />
			</div>
		);
	};

	return (
		// mt-[52px] is to offset the header at the top of Program.tsx
		<div className="vertical w-full h-full justify-start overflow-y-auto mt-[52px] flex-1">
			<SequenceInstance name="Example 1" sequence={sequence} annotations={annotations} />
			<SequenceInstance name="Example 2" sequence={sequence} annotations={annotations2} />
			<SequenceInstance name="Longer Sequence" sequence={longSequence} annotations={longAnnotations} />
		</div>
	);
};

export default LinearViewerDemo;
