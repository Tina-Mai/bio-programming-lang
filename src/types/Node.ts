import { Constraint } from "./Constraint";
import { Generator } from "./Generator";
export type SequenceType = "dna" | "rna" | "protein";

export interface SequenceNode {
	id: string;
	type?: SequenceType;
	generator?: Generator;
	output?: Record<string, unknown>;
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
