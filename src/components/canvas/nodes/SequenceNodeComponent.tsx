import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

// Define the expected data structure for the `data` prop of this node type
export interface SequenceNodeData {
	label: string;
	// sequenceType?: string; // e.g., 'dna', 'protein'
	// actualSequence?: string;
	// generatorInfo?: { name: string; params: any }; // Placeholder for generator data
}

// Placeholder for a dropdown component for Generators
const GeneratorDropdownPlaceholder: React.FC = () => {
	return (
		<div
			style={{
				marginTop: "8px",
				fontSize: "11px",
				color: "#555",
				padding: "5px",
				background: "#e9ecef",
				borderRadius: "4px",
			}}
		>
			[Generator Dropdown]
		</div>
	);
};

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeData>> = ({ data, id, selected }) => {
	return (
		<div
			style={{
				padding: "10px",
				border: selected ? "2px solid #2563eb" : "1px solid #8a8a8a",
				borderRadius: "8px",
				background: "#e6ffed",
				width: 180,
				textAlign: "center" as React.CSSProperties["textAlign"],
				fontSize: "12px",
				color: "#333",
				opacity: selected ? 1 : 0.9,
			}}
		>
			<div style={{ marginBottom: "8px", fontWeight: "bold", color: "#1e8449" }}>Sequence</div>
			<div>{data.label}</div>
			<GeneratorDropdownPlaceholder />
			{/* Sequences can be a target for Constraint nodes */}
			<Handle type="target" position={Position.Left} id={`${id}-target`} style={{ background: "#555", width: "10px", height: "10px" }} />
		</div>
	);
};

export default SequenceNodeComponent;
