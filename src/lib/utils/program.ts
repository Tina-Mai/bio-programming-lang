import { Node as FlowNode, Edge as FlowEdge, XYPosition } from "@xyflow/react";
import { Constraint, constraintOptions } from "@/types/Constraint";
import { Generator, generatorOptions } from "@/types/Generator";

// base interface for Supabase entities
export interface SupabaseBaseMinimal {
	id: string;
	created_at?: string;
	updated_at?: string;
}

export interface SupabaseProgram extends SupabaseBaseMinimal {
	project_id: string;
}

export interface SupabaseSequenceNode extends SupabaseBaseMinimal {
	program_id: string;
	type?: "dna" | "rna" | "protein";
	sequence?: string;
	metadata?: Record<string, unknown>;
	generator_id?: string | null;
}

export interface SupabaseConstraintNode extends SupabaseBaseMinimal {
	program_id: string;
	key?: string;
}

export interface SupabaseGeneratorNode extends SupabaseBaseMinimal {
	key: string;
	name?: string;
	hyperparameters?: Record<string, unknown>;
	user_id?: string | null;
}

export interface SupabaseDBEdge extends SupabaseBaseMinimal {
	program_id: string;
	constraint_id: string;
	sequence_id: string;
}

// represents the raw graph data for a single Program, fetched from Supabase
export interface RawProgramGraphData {
	program: SupabaseProgram;
	sequenceNodes: SupabaseSequenceNode[];
	constraintNodes: SupabaseConstraintNode[];
	generatorNodes: SupabaseGeneratorNode[];
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
					program_id: dbNode.program_id,
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
		});
	});

	return { nodes: flowNodes, edges: flowEdges };
}
