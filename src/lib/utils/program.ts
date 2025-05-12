import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { Constraint, constraintOptions } from "@/types/Constraint";
import { Generator, generatorOptions } from "@/types/Generator";

export interface SupabaseBase {
	id: string;
	project_id: string;
	created_at?: string;
}

export interface SupabaseSequenceNode extends SupabaseBase {
	type: "dna" | "rna" | "protein";
	sequence: string;
	metadata?: Record<string, unknown>;
	generator_id?: string; // FK to generators
}

export interface SupabaseConstraintNode extends SupabaseBase {
	key: string;
}

export interface SupabaseGeneratorNode extends SupabaseBase {
	key: string;
	hyperparameters?: Record<string, unknown>;
}

export interface SupabaseDBEdge extends SupabaseBase {
	constraint_id: string; // FK to constraint_nodes
	sequence_id: string; // FK to sequence_nodes
}

interface ProjectGraphData {
	constraintNodes: SupabaseConstraintNode[];
	sequenceNodes: SupabaseSequenceNode[];
	generatorNodes: SupabaseGeneratorNode[];
	edges: SupabaseDBEdge[];
}

interface FlowData {
	nodes: FlowNode[];
	edges: FlowEdge[];
}

// convert data fetched from Supabase into React Flow compatible nodes and edges
export function convertProjectDataToFlow(projectData: ProjectGraphData): FlowData {
	const flowNodes: FlowNode[] = [];
	const flowEdges: FlowEdge[] = [];

	// create map for quick lookup of generators if they need to be embedded
	const generatorMap = new Map<string, SupabaseGeneratorNode>();
	projectData.generatorNodes.forEach((gen) => generatorMap.set(gen.id, gen));

	// create map for quick lookup of constraint options
	const constraintMap = new Map<string, Constraint>();
	constraintOptions.forEach((opt) => constraintMap.set(opt.key, opt));

	// create map for quick lookup of generator options
	const generatorOptionMap = new Map<string, Generator>();
	generatorOptions.forEach((opt) => generatorOptionMap.set(opt.key, opt));

	// convert Constraint Nodes
	projectData.constraintNodes.forEach((dbNode) => {
		const constraint = constraintMap.get(dbNode.key);
		if (!constraint) {
			console.warn(`Constraint with key ${dbNode.key} not found in constraintOptions.`);
			return;
		}
		flowNodes.push({
			id: dbNode.id,
			type: "constraint",
			position: { x: Math.random() * 400, y: Math.random() * 400 }, // TODO: temp random position
			data: {
				constraint: constraint,
			},
		});
	});

	// convert Sequence Nodes
	projectData.sequenceNodes.forEach((dbNode) => {
		let resolvedGenerator: Generator | undefined = undefined;
		if (dbNode.generator_id) {
			const supabaseGenerator = generatorMap.get(dbNode.generator_id);
			if (supabaseGenerator) {
				resolvedGenerator = generatorOptionMap.get(supabaseGenerator.key);
				if (!resolvedGenerator) {
					console.warn(`Generator with key ${supabaseGenerator.key} not found in generatorOptions.`);
				}
			} else {
				console.warn(`SupabaseGeneratorNode with id ${dbNode.generator_id} not found in generatorMap.`);
			}
		}

		flowNodes.push({
			id: dbNode.id,
			type: "sequence",
			position: { x: Math.random() * 400 + 200, y: Math.random() * 400 }, // TODO: temp random position
			data: {
				sequence: {
					id: dbNode.id,
					type: dbNode.type,
					sequence: dbNode.sequence,
					metadata: dbNode.metadata,
					generator: resolvedGenerator,
				},
			},
		});
	});

	// convert Edges
	projectData.edges.forEach((dbEdge) => {
		flowEdges.push({
			id: `e-${dbEdge.constraint_id}-${dbEdge.sequence_id}`,
			source: dbEdge.constraint_id,
			target: dbEdge.sequence_id,
			animated: true,
			style: {
				stroke: "oklch(70.4% 0.04 256.788)",
			},
		});
	});

	return { nodes: flowNodes, edges: flowEdges };
}
