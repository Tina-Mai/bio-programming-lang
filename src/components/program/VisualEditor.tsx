import LinearViewer from "@/components/program/linear/LinearViewer";
import { ConstraintInstance, Construct } from "@/types";
import { Draggable } from "@carbon/icons-react";
import { useProgram } from "@/context/ProgramContext";
import { Button } from "@/components/ui/button";
import { AddLarge } from "@carbon/icons-react";
import ConstructConfig from "@/components/program/linear/ConstructConfig";

const VisualEditor = () => {
	const { constructs, constraints, isLoading, createConstruct } = useProgram();

	const handleCreateConstruct = async () => {
		try {
			await createConstruct();
		} catch (err) {
			console.error("Failed to create construct:", err);
			// Error is now handled via toast in the ProgramContext
		}
	};

	const ConstructInstance = ({ construct, constructConstraints }: { construct: Construct; constructConstraints: ConstraintInstance[] }) => {
		const segments = construct.segments || [];
		const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);

		return (
			<div className="vertical flex-1">
				<div className="horizontal px-5 items-center justify-between border-y border-slate-300 bg-slate-100 py-2 gap-2">
					<div className="horizontal items-center gap-2">
						<div className="text-sm font-semibold text-slate-700">Construct {construct.id.slice(0, 8)}</div>
						<div className="font-mono text-sm text-slate-500/60">{totalLength} bp</div>
					</div>
					<div className="horizontal gap-1 items-center">
						<ConstructConfig />
						<Draggable size={18} className="text-slate-400 hover:!text-slate-700" />
					</div>
				</div>
				<LinearViewer segments={segments} constraints={constructConstraints} constructId={construct.id} />
			</div>
		);
	};

	return (
		<div className="h-full w-full">
			{isLoading ? (
				<div className="h-full w-full flex items-center justify-center">
					<div className="text-slate-500">Loading program data...</div>
				</div>
			) : constructs.length === 0 ? (
				<div className="vertical h-full w-full items-center justify-center gap-3">
					<div className="text-slate-500">No constructs in this program</div>
					<Button variant="outline" className="group gap-2" onClick={handleCreateConstruct}>
						<AddLarge size={16} className="text-slate-500/70 group-hover:text-slate-500 transition-colors duration-200" /> Start new construct
					</Button>
				</div>
			) : (
				//mt-[52px] is to offset the header at the top of Program.tsx
				<div className="vertical h-full w-full justify-center items-center mt-[52px]">
					<div className="vertical w-full h-full justify-start overflow-y-auto flex-1">
						{constructs.map((construct) => {
							const segmentIds = (construct.segments || []).map((s) => s.id);
							const constructConstraints = constraints.filter((c) => c.segments.length === 0 || (c.segments || []).some((segId) => segmentIds.includes(segId)));

							return <ConstructInstance key={construct.id} construct={construct} constructConstraints={constructConstraints} />;
						})}
					</div>
				</div>
			)}
		</div>
	);
};

export default VisualEditor;
