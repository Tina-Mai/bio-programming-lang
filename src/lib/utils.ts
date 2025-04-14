import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Program, ProgramNode, Constraint } from "@/types";
import { Node, Edge } from "@xyflow/react";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// type guard to check if an object is a Constraint
function isConstraint(obj: unknown): obj is Constraint {
	return typeof obj === "object" && obj !== null && typeof (obj as Constraint).name === "string";
}

// recursive type guard to check if an object conforms to ProgramNode
function isProgramNode(obj: unknown): obj is ProgramNode {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}

	const node = obj as ProgramNode;

	// check for required properties
	if (typeof node.id !== "string" || !Array.isArray(node.children) || !Array.isArray(node.constraints)) {
		return false;
	}

	// check constraints array
	if (!node.constraints.every(isConstraint)) {
		return false;
	}

	// recursively check children
	if (!node.children.every(isProgramNode)) {
		return false;
	}

	// optional: check constraintWeights if present
	if (node.constraintWeights !== undefined && (!Array.isArray(node.constraintWeights) || !node.constraintWeights.every((w) => typeof w === "number"))) {
		return false;
	}

	return true;
}

export function parseProgramJSON(programJSON: unknown): Program | null {
	if (isProgramNode(programJSON)) {
		// type assertion is safe here because isProgramNode validated it
		return programJSON as Program;
	}
	return null;
}

interface FlowData {
	nodes: Node[];
	edges: Edge[];
}

// recursively converts ProgramNode tree to React Flow nodes and edges
export function convertProgramToFlow(program: Program): FlowData {
	const nodes: Node[] = [];
	const edges: Edge[] = [];
	const position = { x: 0, y: 0 }; // initial position, Dagre will layout

	function processNode(node: ProgramNode, parentId?: string) {
		// create a node for the current program node
		nodes.push({
			id: node.id,
			// use 'container' type for now, can customize later
			type: "container",
			data: {
				// store constraints in data, maybe format later
				label: node.constraints.map((c) => c.name).join(", "),
				// keep original constraints if needed by the node component
				constraints: node.constraints,
				// potentially add other ProgramNode data if needed
			},
			position: { ...position }, // use spread to avoid reference issues
			// style will be handled by Dagre/React Flow based on type/data
		});

		// Create edges from this node to its direct children and recurse
		node.children.forEach((child) => {
			edges.push({
				id: `e-${node.id}-${child.id}`,
				source: node.id,
				target: child.id,
				type: "default",
				animated: true,
				style: { stroke: "#aaa" },
			});
			// Recurse for children, passing the current node's ID as the parentId
			processNode(child, node.id);
		});
	}

	processNode(program); // start processing from the root
	return { nodes, edges };
}
