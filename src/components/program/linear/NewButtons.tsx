"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { SettingsAdjust } from "@carbon/icons-react";
import SegmentSymbol from "@/components/program/linear/segment/SegmentSymbol";
import { useProgram } from "@/context/ProgramContext";

const NewButton = (props: React.ComponentProps<typeof Button>) => {
	return <Button className="group px-2 items-center justify-center gap-2 bg-slate-100/80" variant="outline" size="icon-sm" {...props} />;
};

const NewButtons = () => {
	const { constructs, createSegment, createConstraint } = useProgram();

	const handleNewSegment = async () => {
		if (constructs && constructs.length > 0) {
			const firstConstructId = constructs[0].id;
			try {
				await createSegment(firstConstructId);
			} catch (error) {
				console.error("Failed to create new segment", error);
			}
		}
	};

	const handleNewConstraint = async () => {
		try {
			await createConstraint();
		} catch (error) {
			console.error("Failed to create new constraint", error);
		}
	};

	return (
		<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
			<NewButton onClick={handleNewConstraint}>
				<SettingsAdjust className="text-zinc-500/70 group-hover:!text-zinc-500 transition-colors duration-200" />
				New Constraint
			</NewButton>
			<NewButton onClick={handleNewSegment} disabled={!constructs || constructs.length === 0}>
				<SegmentSymbol width={18} height={12} className="text-zinc-500/70 group-hover:!text-zinc-500 transition-colors duration-200" />
				New Segment
			</NewButton>
		</div>
	);
};

export default NewButtons;
