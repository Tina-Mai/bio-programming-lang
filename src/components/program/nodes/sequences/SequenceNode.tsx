import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import { SequenceNode, SequenceType } from "@/types";
import { Chip } from "@carbon/icons-react";
import Node from "@/components/program/nodes/Node";
import SequenceTypeDropdown from "./SequenceTypeDropdown";
import GeneratorDropdown from "../generators/GeneratorDropdown";
import { useProgram } from "@/context/ProgramContext";
// import StatusDot from "@/components/global/StatusDot";

export interface SequenceNodeData {
	sequence?: SequenceNode;
	[key: string]: unknown;
}

export type SequenceNodeType = ReactFlowNode<SequenceNodeData, "sequence">;

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeType>> = ({ data, id, selected }) => {
	const { updateSequenceNodeType, updateSequenceNodeGenerator } = useProgram();
	const updateSequenceType = (sequenceType: SequenceType) => {
		updateSequenceNodeType(id, sequenceType);
	};

	return (
		<Node type="sequence" selected={selected} handlePosition="top" id={id}>
			<div className="vertical gap-px">
				<div className="p-3">
					<SequenceTypeDropdown sequenceType={data.sequence?.type as SequenceType} setSequenceType={updateSequenceType} />
				</div>
				<div className="horizontal bg-system-slate/65 text-slate-500 px-3 py-2 items-center font-mono border-y border-slate-300 gap-2 capitalize">
					<Chip className="text-zinc-500/70" /> Generator
				</div>
				<div className="horizontal bg-system-slate/30 justify-start items-center gap-3 p-3">
					<GeneratorDropdown
						generator={data.sequence?.generator || undefined}
						setGenerator={(generator) => {
							updateSequenceNodeGenerator(id, generator);
						}}
						sequenceType={data.sequence?.type as SequenceType}
					/>
					{/* {!data.generator && <StatusDot />} */}
				</div>
			</div>
		</Node>
	);
};

export default SequenceNodeComponent;
