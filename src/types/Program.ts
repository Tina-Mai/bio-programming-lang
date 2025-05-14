import { SequenceNode, ConstraintNode, Edge } from "@/types";

export interface Program {
	id: string;
	project_id: string; // Foreign key to the Project
	name?: string; // Optional name for the program (e.g., "Initial Version", "Optimized Run")
	createdAt: Date;
	updatedAt: Date;
	sequences?: SequenceNode[]; // Resolved Flow elements, not direct DB table columns
	constraints?: ConstraintNode[]; // Resolved Flow elements
	edges?: Edge[]; // Resolved Flow elements
}
