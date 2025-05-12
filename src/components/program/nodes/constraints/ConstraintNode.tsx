import React from "react";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import ConstraintDropdown from "./ConstraintDropdown";
import { Constraint } from "@/types";
import Node from "@/components/program/nodes/Node";

export interface ConstraintNodeData {
	name: Constraint["name"];
	constraint?: Constraint;
	[key: string]: unknown;
}

export type ConstraintNodeType = ReactFlowNode<ConstraintNodeData, "constraint">;

const ConstraintNodeComponent: React.FC<NodeProps<ConstraintNodeType>> = ({ data, id, selected }) => {
	const updateConstraint = (constraint: Constraint) => {
		// TODO: get this working in ProjectContext and actually update the data in the database
		console.log(constraint);
	};

	return (
		<Node type="constraint" selected={selected} handlePosition="bottom" id={id}>
			<ConstraintDropdown constraint={data.constraint} setConstraint={updateConstraint} />
		</Node>
	);
};

export default ConstraintNodeComponent;
