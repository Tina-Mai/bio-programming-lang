import React from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";

// Define the expected data structure for the `data` prop of this node type
export interface SequenceNodeData {
	label: string;
	// sequenceType?: string; // e.g., 'dna', 'protein'
	// actualSequence?: string;
	// generatorInfo?: { name: string; params: any }; // Placeholder for generator data
	[key: string]: unknown;
}

// Define a specific Node type for SequenceNode
export type SequenceNodeType = Node<SequenceNodeData, "sequence">;

// Placeholder for a dropdown component for Generators
const GeneratorDropdownPlaceholder: React.FC = () => {
	return (
		<div
			style={{
				marginTop: "8px",
				fontSize: "11px",
				background: "#EBF0F4",
			}}
			className={`p-1 border border-slate-300 rounded-sm`}
		>
			[Generator Dropdown]
		</div>
	);
};

const SequenceNodeComponent: React.FC<NodeProps<SequenceNodeType>> = ({ data, id, selected }) => {
	return (
		<div
			style={{
				background: "#F4F8F8",
				width: 180,
				height: 100,
				textAlign: "center" as React.CSSProperties["textAlign"],
				fontSize: "12px",
				color: "#333",
				opacity: selected ? 1 : 0.9,
			}}
			className={`p-3 ${selected ? "border-[1.5px] border-blue-700/50" : " border border-slate-300"} rounded-md`}
		>
			<Handle type="target" position={Position.Top} id={`${id}-target`} className="!bg-slate-500 !size-2.5" />
			<div style={{ marginBottom: "8px", fontWeight: "bold" }}>Sequence</div>
			<div>{data.label}</div>
			<GeneratorDropdownPlaceholder />
		</div>
	);
};

export default SequenceNodeComponent;
