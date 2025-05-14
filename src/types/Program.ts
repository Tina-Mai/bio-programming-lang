import { SequenceNode, ConstraintNode, Edge, Output } from "@/types";

export interface Program {
	id: string;
	project_id: string;
	createdAt: Date;
	updatedAt: Date;
	sequences?: SequenceNode[];
	constraints?: ConstraintNode[];
	edges?: Edge[];
	output?: Output;
}
