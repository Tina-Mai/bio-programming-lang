// TODO: delete this?
// Nodes for canvas
import { ContainerNode } from "@/components/canvas/blocks/Container";
import { StandardNode } from "@/components/canvas/blocks/Node";
import { Constraint } from "@/types";

export const nodeTypes = {
	group: ContainerNode,
	standard: StandardNode,
};

export interface NodeData {
	id: string;
	children: NodeData[];
	constraints: Constraint[];
	label?: string;
}
