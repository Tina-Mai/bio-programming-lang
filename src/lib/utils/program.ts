import { Node as FlowNode, Edge as FlowEdge, XYPosition } from "@xyflow/react";
import { Constraint, constraintOptions } from "@/types/Constraint";
import { Generator, generatorOptions } from "@/types/Generator";

// Minimal base interface for Supabase entities with ID and creation timestamp
export interface SupabaseBaseMinimal {
	id: string;
	created_at?: string;
}

// Represents a Program in the Supabase 'programs' table
export interface SupabaseProgram extends SupabaseBaseMinimal {
	project_id: string;
	name?: string;
	updated_at: string; // Tracks the last modification time of the program itself
}

export interface SupabaseSequenceNode extends SupabaseBaseMinimal {
	project_id: string; // Link to the parent project
	program_id: string; // Link to the specific program this node belongs to
	type: "dna" | "rna" | "protein";
	sequence: string;
	metadata?: Record<string, unknown>;
	generator_id?: string | null;
}

export interface SupabaseConstraintNode extends SupabaseBaseMinimal {
	project_id: string; // Link to the parent project
	program_id: string; // Link to the specific program this node belongs to
	key: string;
}

export interface SupabaseGeneratorNode {
	id: string;
	created_at?: string;
	key: string;
	name?: string;
	hyperparameters?: Record<string, unknown>;
	user_id?: string | null;
	project_id?: string; // If generators can be project-specific, uncommented
}

export interface SupabaseDBEdge extends SupabaseBaseMinimal {
	program_id: string; // Link to the specific program this edge belongs to
	constraint_id: string;
	sequence_id: string;
	// project_id?: string; // Implicitly through program_id -> program -> project_id
}

// Represents the raw graph data for a single Program, fetched from Supabase
export interface RawProgramGraphData {
	program: SupabaseProgram; // The program these components belong to
	sequenceNodes: SupabaseSequenceNode[];
	constraintNodes: SupabaseConstraintNode[];
	generatorNodes: SupabaseGeneratorNode[]; // Assuming generators are still project-wide or global
	edges: SupabaseDBEdge[];
}

interface FlowData {
	nodes: FlowNode[];
	edges: FlowEdge[];
}

// convert data fetched from Supabase for a specific Program into React Flow compatible nodes and edges
export function convertProjectDataToFlow(programGraphData: RawProgramGraphData, currentFlowNodes: FlowNode[]): FlowData {
	const flowNodes: FlowNode[] = [];
	const flowEdges: FlowEdge[] = [];

	const currentNodePositionMap = new Map<string, XYPosition>();
	currentFlowNodes.forEach((node) => {
		if (node.position) {
			currentNodePositionMap.set(node.id, node.position);
		}
	});

	const generatorMap = new Map<string, SupabaseGeneratorNode>();
	programGraphData.generatorNodes.forEach((gen) => generatorMap.set(gen.id, gen));

	const constraintMap = new Map<string, Constraint>();
	constraintOptions.forEach((opt) => constraintMap.set(opt.key, opt));

	const generatorOptionMap = new Map<string, Generator>();
	generatorOptions.forEach((opt) => generatorOptionMap.set(opt.key, opt));

	programGraphData.constraintNodes.forEach((dbNode) => {
		const position: XYPosition = currentNodePositionMap.get(dbNode.id) || { x: 0, y: 0 };
		let constraintData: Constraint | null = null;

		if (dbNode.key) {
			const foundConstraint = constraintMap.get(dbNode.key);
			if (!foundConstraint) {
				console.warn(`Constraint with key ${dbNode.key} not found in constraintOptions. Node will be created without valid constraint data.`);
			} else {
				constraintData = foundConstraint;
			}
		}

		flowNodes.push({
			id: dbNode.id,
			type: "constraint",
			position: position,
			data: {
				constraint: constraintData,
			},
		});
	});

	programGraphData.sequenceNodes.forEach((dbNode) => {
		let resolvedGenerator: Generator | null = null;

		if (dbNode.generator_id) {
			const supabaseGenerator = generatorMap.get(dbNode.generator_id);
			if (supabaseGenerator) {
				const foundGeneratorOption = generatorOptionMap.get(supabaseGenerator.key);
				if (foundGeneratorOption) {
					resolvedGenerator = foundGeneratorOption;
				} else {
					console.warn(`Generator with key ${supabaseGenerator.key} (ID: ${dbNode.generator_id}) found in DB but not in generatorOptions. Setting generator to null.`);
				}
			} else {
				console.warn(`SupabaseGeneratorNode with id ${dbNode.generator_id} referenced by sequence node ${dbNode.id} not found in fetched generator data. Setting generator to null.`);
			}
		}

		const position: XYPosition = currentNodePositionMap.get(dbNode.id) || { x: 0, y: 0 };
		flowNodes.push({
			id: dbNode.id,
			type: "sequence",
			position: position,
			data: {
				sequence: {
					id: dbNode.id,
					type: dbNode.type,
					sequence: dbNode.sequence,
					metadata: dbNode.metadata,
					generator: resolvedGenerator,
					// Ensure program_id and project_id are available if needed by SequenceNode component
					program_id: dbNode.program_id,
					project_id: dbNode.project_id,
				},
			},
		});
	});

	programGraphData.edges.forEach((dbEdge) => {
		flowEdges.push({
			id: dbEdge.id,
			source: dbEdge.constraint_id,
			target: dbEdge.sequence_id,
			animated: true,
			type: "default",
			style: {
				stroke: "oklch(70.4% 0.04 256.788)",
			},
			// data: { program_id: dbEdge.program_id } // If Edge component needs program_id
		});
	});

	return { nodes: flowNodes, edges: flowEdges };
}
