"use client";
import React from "react";
import LinearViewer from "./LinearViewer";
import { Segment, ConstraintInstance, GeneratorInstance } from "@/types";
import { Draggable } from "@carbon/icons-react";
import SequencePopover from "./SequencePopover";

const LinearViewerDemo = () => {
	const segments = [
		{
			id: "1",
			label: "Promoter",
			type: "promoter",
			start: 0,
			end: 10,
		},
		{
			id: "2",
			label: "CDS",
			type: "CDS",
			start: 11,
			end: 40,
		},
		{
			id: "3",
			label: "Custom Section",
			start: 41,
			end: 65,
		},
		{
			id: "4",
			label: "CDS",
			type: "CDS",
			start: 66,
			end: 80,
		},
	];

	const constraints: ConstraintInstance[] = [
		{
			key: "gc-content",
			name: "GC Content",
			segments: ["2", "4"],
		},
		{
			key: "sequence-length",
			name: "Sequence Length",
			segments: ["1", "2", "3", "4"],
		},
	];

	const generators: GeneratorInstance[] = [
		{
			key: "evo-2",
			name: "Evo 2",
			segments: ["1", "3"],
		},
		{
			key: "uniform-mutation",
			name: "Uniform Mutation",
			segments: ["2", "4"],
		},
	];

	const SequenceInstance = ({
		name,
		length,
		sequence,
		segments,
		constraints,
		generators,
	}: {
		name: string;
		length: number;
		sequence?: string;
		segments: Segment[];
		constraints: ConstraintInstance[];
		generators: GeneratorInstance[];
	}) => {
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
				<LinearViewer length={length} sequence={sequence} segments={segments} constraints={constraints} generators={generators} />
			</div>
		);
	};

	return (
		// mt-[52px] is to offset the header at the top of Program.tsx
		<div className="vertical w-full h-full justify-start overflow-y-auto mt-[52px] flex-1">
			<SequenceInstance name="Example" length={85} segments={segments} constraints={constraints} generators={generators} />
			{/* <SequenceInstance name="Longer Sequence" length={819} sections={longSections} /> */}
		</div>
	);
};

export default LinearViewerDemo;
