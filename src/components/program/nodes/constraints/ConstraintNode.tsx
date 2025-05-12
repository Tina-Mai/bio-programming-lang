import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import Node from "../Node";

export interface ConstraintNodeData {
	name: string;
	[key: string]: unknown;
}

export type ConstraintNodeType = ReactFlowNode<ConstraintNodeData, "constraint">;

const ConstraintNodeComponent: React.FC<NodeProps<ConstraintNodeType>> = ({ data, id, selected }) => {
	return (
		<Node type="constraint" selected={selected} handlePosition="bottom" id={id}>
			<div>
				<div>{data.name}</div>
			</div>
		</Node>
	);
};

export default ConstraintNodeComponent;
