import { Constraint } from "./Constraint";
export type SequenceType = "dna" | "rna" | "protein";

export interface SequenceNode {
	id: string;
	type?: SequenceType;
	sequence?: string;
	metadata?: Record<string, unknown>;
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
