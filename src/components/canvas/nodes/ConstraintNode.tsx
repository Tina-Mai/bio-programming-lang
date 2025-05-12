import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import Node from "./Node"; // Import the generalized Node component

// Define the expected data structure for the `data` prop of this node type
export interface ConstraintNodeData {
	label: string;
	// TODO: Add any other specific properties derived from the database ConstraintNode,
	// e.g., scoring_function: string;
	[key: string]: unknown;
}

// Define a specific Node type for ConstraintNode, incorporating ConstraintNodeData
export type ConstraintNodeType = ReactFlowNode<ConstraintNodeData, "constraint">;

// The component receives NodeProps which includes id, data, selected, etc.
const ConstraintNodeComponent: React.FC<NodeProps<ConstraintNodeType>> = ({ data, id, selected }) => {
	return (
		<Node bgClassName="bg-system-yellow/50" selected={selected} title="Constraint" handlePosition="bottom" id={id}>
			<div>
				<div>{data.label}</div>
			</div>
		</Node>
	);
};

export default ConstraintNodeComponent;
