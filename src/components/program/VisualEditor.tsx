import LinearViewer from "@/components/program/linear/LinearViewer";
import { ConstraintInstance, GeneratorInstance, Construct } from "@/types";
import { Draggable } from "@carbon/icons-react";
import ConstructPopover from "@/components/program/linear/ConstructPopover";
import { useProgram } from "@/context/ProgramContext";

const VisualEditor = () => {
	const { constructs, constraints, generators, isLoading, error } = useProgram();

	const ConstructInstance = ({
		construct,
		constructConstraints,
		constructGenerators,
	}: {
		construct: Construct;
		constructConstraints: ConstraintInstance[];
		constructGenerators: GeneratorInstance[];
	}) => {
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
						<ConstructPopover />
						<Draggable size={18} className="text-slate-400 hover:!text-slate-700" />
					</div>
				</div>
				<LinearViewer segments={segments} constraints={constructConstraints} generators={constructGenerators} constructId={construct.id} />
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="text-slate-500">Loading program data...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="text-red-500">Error: {error}</div>
			</div>
		);
	}

	if (constructs.length === 0) {
		return (
			<div className="h-full w-full flex items-center justify-center">
				<div className="text-slate-500">No constructs found in this program</div>
			</div>
		);
	}

	return (
		<div className="h-full w-full">
			<div className="vertical h-full w-full justify-center items-center">
				{/* mt-[52px] is to offset the header at the top of Program.tsx */}
				<div className="vertical w-full h-full justify-start overflow-y-auto mt-[52px] flex-1">
					{constructs.map((construct) => {
						const segmentIds = (construct.segments || []).map((s) => s.id);
						const constructConstraints = constraints.filter((c) => c.segments.some((segId) => segmentIds.includes(segId)));
						const constructGenerators = generators.filter((g) => g.segments.some((segId) => segmentIds.includes(segId)));

						return <ConstructInstance key={construct.id} construct={construct} constructConstraints={constructConstraints} constructGenerators={constructGenerators} />;
					})}
				</div>
			</div>
		</div>
	);
};

export default VisualEditor;
