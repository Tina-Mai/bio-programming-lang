import React from "react";
import { Handle, Position } from "@xyflow/react";
// import type { Node } from "@xyflow/react"; // Remove unused import
import { Badge } from "@/components/ui/badge";
import { Constraint } from "@/types";

// Define the shape of the data object expected within the node
interface ProgramNodeData {
	label?: string;
	constraints?: Constraint[];
	backgroundColor?: string;
}

// Define the props interface directly for the component
interface ContainerNodeProps {
	data: ProgramNodeData; // The data object with our specific shape
	selected: boolean | undefined; // Selected state from React Flow
	id: string; // Node ID from React Flow
	// Add other props provided by NodeProps if needed (e.g., dragging, zIndex, type, position)
}

export const ContainerNode = ({ data, selected, id }: ContainerNodeProps) => {
	// No need to cast 'data' if props are correctly typed
	const constraintsToDisplay = data.label?.split(", ").filter(Boolean) || [];

	return (
		<div
			className="react-flow__node-custom nodrag"
			style={{
				padding: "10px 15px",
				borderRadius: 8,
				backgroundColor: data.backgroundColor || "rgba(235, 244, 255, 0.8)",
				border: selected ? "1.5px solid #64748b" : "1px solid #CAD5E2",
				minWidth: 150,
				textAlign: "center",
			}}
		>
			<Handle type="target" position={Position.Top} className="!bg-slate-500" />
			<div className="flex flex-col items-center gap-1">
				<div className="font-semibold text-sm mb-1">Node {String(id)}</div>
				<div className="flex flex-wrap justify-center gap-1">
					{constraintsToDisplay.length > 0 ? (
						constraintsToDisplay.map((constraintName: string, index: number) => (
							<Badge key={index} variant="outline" className="text-zinc-600 capitalize">
								{constraintName}
							</Badge>
						))
					) : (
						<Badge variant="secondary" className="text-zinc-500">
							No Constraints
						</Badge>
					)}
				</div>
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
		</div>
	);
};
