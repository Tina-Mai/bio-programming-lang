import { Node as FlowNode, Edge as FlowEdge, XYPosition } from "@xyflow/react";
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
	generator_id?: string | null;
}

export interface SupabaseConstraintNode extends SupabaseBase {
	key: string;
}

export interface SupabaseGeneratorNode {
	id: string;
	created_at?: string;
	key: string;
	name?: string;
	hyperparameters?: Record<string, unknown>;
	user_id?: string | null; // FK to user, null if public/template
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
export function convertProjectDataToFlow(projectData: ProjectGraphData, currentFlowNodes: FlowNode[]): FlowData {
	const flowNodes: FlowNode[] = [];
	const flowEdges: FlowEdge[] = [];

	// Create a map of current node positions for quick lookup
	const currentNodePositionMap = new Map<string, XYPosition>();
	currentFlowNodes.forEach((node) => {
		if (node.position) {
			currentNodePositionMap.set(node.id, node.position);
		}
	});

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
		const position: XYPosition = currentNodePositionMap.get(dbNode.id) || { x: 0, y: 0 };
		let constraintData: Constraint | null = null; // Default to null

		if (dbNode.key) {
			// If key exists, try to find it in the map
			const foundConstraint = constraintMap.get(dbNode.key);
			if (!foundConstraint) {
				// Key exists but not found in options, log warning but still create node
				console.warn(`Constraint with key ${dbNode.key} not found in constraintOptions. Node will be created without valid constraint data.`);
				// constraintData remains null
			} else {
				constraintData = foundConstraint; // Use the found constraint
			}
		} // If dbNode.key is null or empty, constraintData remains null

		flowNodes.push({
			id: dbNode.id,
			type: "constraint",
			position: position,
			data: {
				constraint: constraintData, // Use the resolved constraint data (can be null)
			},
		});
	});

	// convert Sequence Nodes
	projectData.sequenceNodes.forEach((dbNode) => {
		let resolvedGenerator: Generator | null = null; // Initialize with null

		if (dbNode.generator_id) {
			const supabaseGenerator = generatorMap.get(dbNode.generator_id);
			if (supabaseGenerator) {
				// Try to find the generator option by key
				const foundGeneratorOption = generatorOptionMap.get(supabaseGenerator.key);
				if (foundGeneratorOption) {
					resolvedGenerator = foundGeneratorOption; // Assign if found
				} else {
					// Generator key exists in DB but not in options
					console.warn(`Generator with key ${supabaseGenerator.key} (ID: ${dbNode.generator_id}) found in DB but not in generatorOptions. Setting generator to null.`);
					// resolvedGenerator remains null
				}
			} else {
				// generator_id exists on sequence node, but no matching generator found in DB data
				console.warn(`SupabaseGeneratorNode with id ${dbNode.generator_id} referenced by sequence node ${dbNode.id} not found in fetched generator data. Setting generator to null.`);
				// resolvedGenerator remains null
			}
		} // If dbNode.generator_id is null or undefined, resolvedGenerator remains null

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
					generator: resolvedGenerator, // Use the resolved generator (can be null)
				},
			},
		});
	});

	// convert Edges
	projectData.edges.forEach((dbEdge) => {
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
