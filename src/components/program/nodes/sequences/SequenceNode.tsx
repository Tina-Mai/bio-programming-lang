import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import { GeneratorNode, SequenceType } from "@/types";
import { Idea } from "@carbon/icons-react";
import Node from "@/components/program/nodes/Node";
import SequenceTypeDropdown from "./SequenceTypeDropdown";

export interface SequenceNodeData {
	type: string;
	generator: GeneratorNode;
	[key: string]: unknown;
}

export type SequenceNodeType = ReactFlowNode<SequenceNodeData, "sequence">;

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeType>> = ({ data, id, selected }) => {
	return (
		<Node type="sequence" selected={selected} handlePosition="top" id={id}>
			<div className="vertical gap-px">
				<div className="p-3">
					<SequenceTypeDropdown
						sequenceType={data.type as SequenceType}
						setSequenceType={(sequenceType) => {
							data.type = sequenceType;
						}}
					/>
				</div>
				<div className="horizontal bg-system-blue/75 text-slate-500 px-3 py-2 items-center font-mono border-y border-slate-300 gap-2 capitalize">
					<Idea className="text-zinc-500/75" /> Generator
				</div>
				<div className="vertical justify-start items-start gap-1 p-3">Generator dropdown</div>
			</div>
		</Node>
	);
};

export default SequenceNodeComponent;
