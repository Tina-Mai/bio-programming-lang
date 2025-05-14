import React from "react";
import { useProgram } from "@/context/ProgramContext";
import { NodeProps, Node as ReactFlowNode } from "@xyflow/react";
import { Constraint } from "@/types";
import ConstraintDropdown from "./ConstraintDropdown";
import Node from "@/components/program/nodes/Node";
// import StatusDot from "@/components/global/StatusDot";

export interface ConstraintNodeData {
	constraint?: Constraint;
	[key: string]: unknown;
}

export type ConstraintNodeType = ReactFlowNode<ConstraintNodeData, "constraint">;

const ConstraintNodeComponent: React.FC<NodeProps<ConstraintNodeType>> = ({ data, id, selected }) => {
	const { updateConstraintNodeConstraint } = useProgram();
	const updateConstraint = (constraint: Constraint) => {
		updateConstraintNodeConstraint(id, constraint);
	};

	return (
		<Node type="constraint" selected={selected} handlePosition="bottom" id={id}>
			<div className="horizontal gap-3 items-center p-3">
				<ConstraintDropdown constraint={data.constraint} setConstraint={updateConstraint} />
				{/* {!data.constraint && <StatusDot />} */}
			</div>
		</Node>
	);
};

export default ConstraintNodeComponent;
