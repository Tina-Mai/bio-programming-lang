import { Constraint, Generator, Output } from "@/types";
export type SequenceType = "dna" | "rna" | "protein";

export interface SequenceNode {
	id: string;
	type?: SequenceType;
	generator?: Generator;
	output?: Output;
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
