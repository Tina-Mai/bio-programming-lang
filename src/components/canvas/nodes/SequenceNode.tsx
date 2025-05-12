import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import Node from "./Node"; // Import the generalized Node component

// Define the expected data structure for the `data` prop of this node type
export interface SequenceNodeData {
	label: string;
	// sequenceType?: string; // e.g., 'dna', 'protein'
	// actualSequence?: string;
	// generatorInfo?: { name: string; params: any }; // Placeholder for generator data
	[key: string]: unknown;
}

// Define a specific Node type for SequenceNode
export type SequenceNodeType = ReactFlowNode<SequenceNodeData, "sequence">;

// Placeholder for a dropdown component for Generators
const GeneratorDropdownPlaceholder: React.FC = () => {
	return <div className={`py-1 px-2 border border-slate-300 rounded-sm text-xs bg-system-slate/50`}>[Generator Dropdown]</div>;
};

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeType>> = ({ data, id, selected }) => {
	return (
		<Node bgClassName="bg-system-blue/50" selected={selected} title="Sequence" handlePosition="top" id={id}>
			<div className="vertical items-center justify-center gap-2">
				<div className="vertical gap-1">
					<div>{data.label}</div>
				</div>
				<GeneratorDropdownPlaceholder />
			</div>
		</Node>
	);
};

export default SequenceNodeComponent;
