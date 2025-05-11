import { SequenceNode, ConstraintNode, GeneratorNode } from "@/types";
export interface Project {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	code?: string;
	program?: {
		sequences: SequenceNode[];
		constraints: ConstraintNode[];
		generators: GeneratorNode[];
	};
}
