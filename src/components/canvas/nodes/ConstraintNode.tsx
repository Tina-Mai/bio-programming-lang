import React from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";

// Define the expected data structure for the `data` prop of this node type
export interface ConstraintNodeData {
	label: string;
	// TODO: Add any other specific properties derived from the database ConstraintNode,
	// e.g., scoring_function: string;
	[key: string]: unknown;
}

// Define a specific Node type for ConstraintNode, incorporating ConstraintNodeData
export type ConstraintNodeType = Node<ConstraintNodeData, "constraint">;

// The component receives NodeProps which includes id, data, selected, etc.
const ConstraintNodeComponent: React.FC<NodeProps<ConstraintNodeType>> = ({ data, id, selected }) => {
	return (
		<div
			style={{
				background: "#FDFCF1",
				width: 180,
				height: 100,
				textAlign: "center" as React.CSSProperties["textAlign"],
				fontSize: "12px",
				color: "#333",
				opacity: selected ? 1 : 0.9,
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
			}}
			className={`p-3 ${selected ? "border-[1.5px] border-blue-700/50" : " border border-slate-300"} rounded-md`}
		>
			<div>
				<div style={{ marginBottom: "8px", fontWeight: "bold", color: "#2c3e50" }}>Constraint</div>
				<div>{data.label}</div>
			</div>
			<Handle type="source" position={Position.Bottom} id={`${id}-source`} className="!bg-slate-500 !size-2.5" />
		</div>
	);
};

export default ConstraintNodeComponent;
