import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Constraint } from "@/types";
import AddConstraint from "./AddConstraint";

interface ProgramNodeData {
	constraints?: Constraint[];
	backgroundColor?: string;
	label?: string;
}

interface ContainerNodeProps {
	data: ProgramNodeData;
	selected: boolean | undefined;
	id: string;
}

export const ContainerNode = ({ data }: ContainerNodeProps) => {
	const constraints = data.constraints || [];

	return (
		<div
			className="react-flow__node-custom nodrag"
			style={{
				minWidth: 150,
				textAlign: "center",
			}}
		>
			<Handle type="target" position={Position.Top} className="!bg-slate-500" />

			<div className="horizontal items-center justify-center my-1 gap-1 flex-wrap">
				{constraints &&
					constraints.length > 0 &&
					constraints?.map((constraint: Constraint, index: number) => (
						<Badge key={index} variant="outline" className="text-zinc-600 capitalize bg-slate-50/85">
							{constraint.name}
						</Badge>
					))}
				<AddConstraint constraints={constraints} setConstraints={() => {}} />
			</div>

			<Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
		</div>
	);
};
