import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Constraint } from "@/types";
import AddConstraint from "./AddConstraint";
import { useProject } from "@/context/ProjectContext";

interface ProgramNodeData {
	programNodeId?: string;
	constraints?: Constraint[];
	backgroundColor?: string;
	label?: string;
}

interface ContainerNodeProps {
	data: ProgramNodeData;
	selected: boolean | undefined;
	id: string;
}

export const ContainerNode = ({ data, id: groupId }: ContainerNodeProps) => {
	const constraints = data.constraints || [];
	const programNodeId = data.programNodeId;
	const { updateNodeConstraints } = useProject();

	const handleSetConstraints = (newConstraints: Constraint[]) => {
		if (programNodeId) {
			console.log(`ContainerNode (${groupId}): Updating constraints for program node ${programNodeId}`, newConstraints);
			updateNodeConstraints(programNodeId, newConstraints);
		} else {
			console.error(`ContainerNode (${groupId}): Missing programNodeId in data. Cannot update constraints.`);
		}
	};

	return (
		<div
			className="react-flow__node-custom nodrag"
			style={{
				minWidth: 150,
				textAlign: "center",
			}}
		>
			<Handle type="target" position={Position.Top} className="!bg-slate-500" />

			<div className="horizontal items-center justify-center my-1 gap-x-1 gap-y-px flex-wrap">
				{constraints &&
					constraints.length > 0 &&
					constraints?.map((constraint: Constraint, index: number) => (
						<Badge key={index} variant="outline" className="text-zinc-600 capitalize bg-slate-50/85">
							{constraint.name}
						</Badge>
					))}
				<AddConstraint constraints={constraints} setConstraints={handleSetConstraints} />
			</div>

			<Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
		</div>
	);
};
