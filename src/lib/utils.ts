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
		return programJSON as Program;
	}
	return null;
}

interface FlowData {
	nodes: Node[];
	edges: Edge[];
}

// Recursively converts ProgramNode tree to React Flow nodes and edges
export function convertProgramToFlow(program: Program): FlowData {
	const nodes: Node[] = [];
	const edges: Edge[] = [];
	const position = { x: 0, y: 0 }; // Initial position, layout will override

	// Function to process each node in the program structure
	function processNode(programNode: ProgramNode, parentGroupId?: string) {
		// const hasChildren = programNode.children.length > 0; // Removed unused variable
		const groupId = `group-${programNode.id}`; // ID for the container group

		// 1. Create the Container/Group Node (Always create a group)
		// This node will be rendered by ContainerNode.tsx
		nodes.push({
			id: groupId,
			type: "group", // Use 'group' type for layout
			position: { ...position }, // Layout engine calculates final position
			data: {
				constraints: programNode.constraints,
				// Pass label for potential display in ContainerNode title
				label: programNode.label,
			},
			draggable: false, // Make group nodes non-draggable
			// Parent is the group ID of the program node's parent
			...(parentGroupId && { parentId: parentGroupId }),
		});

		// 2. Create the Standard Node (Circle)
		// This node represents the actual computation (X1, X2, A)
		// It will be rendered by StandardNode.tsx
		// Its parent is the group node created above.
		nodes.push({
			id: programNode.id, // Use the original ID for edge connections
			type: "standard",
			position: { ...position }, // Positioned by layout engine relative to parent
			data: {
				label: programNode.label || `Node ${programNode.id}`, // Label for the circle
			},
			// This standard node lives inside the group node created above
			parentId: groupId,
			// Prevent dragging standard nodes out of their parent visually
			extent: "parent",
			draggable: false, // Maybe make these non-draggable? Adjust as needed.
		});

		// 3. Process Children
		programNode.children.forEach((child) => {
			// Create edges connecting the *standard* nodes (original IDs)
			edges.push({
				id: `e-${programNode.id}-${child.id}`,
				source: programNode.id, // Source is the standard node ID
				target: child.id, // Target is the child's standard node ID
				type: "default", // Or custom edge type
				animated: true,
				style: { stroke: "#334155" },
			});

			// Recurse for children, passing the current node's *group ID* as the parentGroupId
			processNode(child, groupId);
		});
	}

	processNode(program); // Start processing from the root (no parentGroupId)
	return { nodes, edges };
}
