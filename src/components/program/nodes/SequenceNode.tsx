import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import Node from "./Node";
import { GeneratorNode } from "@/types";

export interface SequenceNodeData {
	type: string;
	generator: GeneratorNode;
	[key: string]: unknown;
}

export type SequenceNodeType = ReactFlowNode<SequenceNodeData, "sequence">;

const GeneratorDropdownPlaceholder: React.FC = () => {
	return <div className={`py-1 px-2 border border-slate-300 rounded-sm text-xs bg-system-slate/50`}>[Generator Dropdown]</div>;
};

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeType>> = ({ data, id, selected }) => {
	return (
		<Node type="sequence" selected={selected} handlePosition="top" id={id}>
			<div className="vertical items-center justify-center gap-2">
				<div className="vertical gap-1">
					<div>{data.type}</div>
				</div>
				<GeneratorDropdownPlaceholder />
			</div>
		</Node>
	);
};

export default SequenceNodeComponent;
