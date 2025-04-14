import { Program, ProgramNode, Constraint } from "@/types";
import { Node, Edge } from "@xyflow/react";

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

// convert a JSON object to a Program
export function parseProgramJSON(programJSON: unknown): Program | null {
	if (isProgramNode(programJSON)) {
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
	const position = { x: 0, y: 0 };

	// process each node in the program structure
	// Add depth parameter, starting at 0 for the root
	function processNode(programNode: ProgramNode, depth: number, parentGroupId?: string) {
		const groupId = `group-${programNode.id}`;

		// Calculate background color based on depth
		const backgroundColor = layerColors[depth % layerColors.length];

		// 1. create the Container/Group Node (Always create a group)
		nodes.push({
			id: groupId,
			type: "group",
			position: { ...position }, // Layout engine will handle final position
			data: {
				constraints: programNode.constraints,
				label: programNode.label,
				depth: depth, // Store the calculated depth (might be useful elsewhere)
			},
			style: {
				backgroundColor: backgroundColor, // Apply background color directly via style
			},
			draggable: false,
			...(parentGroupId && { parentId: parentGroupId }),
		});

		// 2. create the Standard Node (Circle)
		// this node represents the actual computation (X1, X2, A)
		// its will be rendered by StandardNode.tsx
		nodes.push({
			id: programNode.id,
			type: "standard",
			position: { ...position },
			data: {
				label: programNode.label || `Node ${programNode.id}`,
			},
			parentId: groupId,
			extent: "parent",
			draggable: false,
		});

		// 3. process children
		programNode.children.forEach((child) => {
			edges.push({
				id: `e-${programNode.id}-${child.id}`,
				source: programNode.id,
				target: child.id,
				type: "default",
				animated: true,
				style: { stroke: "#334155", strokeWidth: 2 },
			});

			// recurse for children
			// Increment depth for the next level
			processNode(child, depth + 1, groupId);
		});
	}

	processNode(program, 0); // start processing from the root (depth 0)
	return { nodes, edges };
}

export const layerColors = ["rgba(255, 250, 227, 0.4)", "rgba(235, 244, 255, 0.4)", "rgba(226, 232, 240, 0.4)", "rgba(220, 240, 255, 0.4)"];
