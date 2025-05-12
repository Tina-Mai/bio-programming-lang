import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";

export interface SupabaseBase {
	id: string;
	project_id: string;
	created_at?: string;
	updated_at?: string;
}

export interface SupabaseSequenceNode extends SupabaseBase {
	type: "dna" | "rna" | "protein";
	sequence: string;
	metadata?: Record<string, unknown>;
	generator_id?: string; // FK to generator_nodes
}

export interface SupabaseConstraintNode extends SupabaseBase {
	name: string;
	scoring_function?: string;
}

export interface SupabaseGeneratorNode extends SupabaseBase {
	name: string;
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

	// convert Constraint Nodes
	projectData.constraintNodes.forEach((dbNode) => {
		flowNodes.push({
			id: dbNode.id,
			type: "constraint",
			position: { x: Math.random() * 400, y: Math.random() * 400 }, // TODO: temp random position
			data: {
				name: dbNode.name,
				scoring_function: dbNode.scoring_function,
			},
		});
	});

	// convert Sequence Nodes
	projectData.sequenceNodes.forEach((dbNode) => {
		const generator = dbNode.generator_id ? generatorMap.get(dbNode.generator_id) : undefined;
		flowNodes.push({
			id: dbNode.id,
			type: "sequence",
			position: { x: Math.random() * 400 + 200, y: Math.random() * 400 }, // TODO: temp random position
			data: {
				type: dbNode.type,
				sequence: dbNode.sequence,
				generator: generator ? { name: generator.name /*, params: generator.hyperparameters*/ } : undefined,
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
