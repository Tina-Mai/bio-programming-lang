import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Constraint } from "@/types";
import AddConstraint from "./AddConstraint";

// Define the shape of the data object expected within the node
interface ProgramNodeData {
	constraints?: Constraint[];
	backgroundColor?: string;
}

// Define the props interface directly for the component
interface ContainerNodeProps {
	data: ProgramNodeData;
	selected: boolean | undefined;
	id: string;
}

export const ContainerNode = ({ data, selected, id }: ContainerNodeProps) => {
	const constraints = data.constraints || [];

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
				<div className="horizontal my-3 mx-4 items-center gap-1 flex-wrap">
					{constraints &&
						constraints.length > 0 &&
						constraints?.map((constraint: Constraint, index: number) => (
							<Badge key={index} variant="outline" className="text-zinc-600 capitalize">
								{constraint.name}
							</Badge>
						))}
					<AddConstraint constraints={constraints} setConstraints={() => {}} />
				</div>
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
		</div>
	);
};
