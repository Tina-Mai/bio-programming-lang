import { Constraint, Generator } from "@/types";
export type SequenceType = "dna" | "rna" | "protein";

export interface SequenceNode {
	id: string;
	type?: SequenceType;
	generator?: Generator;
}

export interface ConstraintNode {
	id: string;
	constraint?: Constraint;
}

export interface Edge {
	id: string;
	constraint: ConstraintNode;
	sequence: SequenceNode;
}
