import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

// Define the expected data structure for the `data` prop of this node type
export interface ConstraintNodeData {
	label: string;
	// TODO: Add any other specific properties derived from the database ConstraintNode,
	// e.g., scoring_function: string;
}

// The component receives NodeProps which includes id, data, selected, etc.
const ConstraintNodeComponent: React.FC<NodeProps<ConstraintNodeData>> = ({ data, id, selected }) => {
	return (
		<div
			style={{
				padding: "10px",
				border: selected ? "2px solid #2563eb" : "1px solid #8a8a8a",
				borderRadius: "8px",
				background: "#f0f4f8",
				width: 180,
				textAlign: "center" as React.CSSProperties["textAlign"],
				fontSize: "12px",
				color: "#333",
				opacity: selected ? 1 : 0.9,
			}}
		>
			<div style={{ marginBottom: "8px", fontWeight: "bold", color: "#2c3e50" }}>Constraint</div>
			<div>{data.label}</div>
			{/* Constraints can be a source to Sequence nodes */}
			<Handle type="source" position={Position.Right} id={`${id}-source`} style={{ background: "#555", width: "10px", height: "10px" }} />
		</div>
	);
};

export default ConstraintNodeComponent;
