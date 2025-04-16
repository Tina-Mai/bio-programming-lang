import { Program, ProgramNode, Constraint, NodeData } from "@/types";
import { Node, Edge } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";

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

	if (typeof node.id !== "string" || !Array.isArray(node.children) || !Array.isArray(node.constraints)) {
		return false;
	}
	if (!node.constraints.every(isConstraint)) {
		return false;
	}
	if (!node.children.every(isProgramNode)) {
		return false;
	}
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

	// process each node in program structure
	function processNode(programNode: ProgramNode, depth: number, parentGroupId?: string) {
		const groupId = `group-${programNode.id}`;
		const backgroundColor = layerColors[depth % layerColors.length];

		// 1. create Container/Group Node
		nodes.push({
			id: groupId,
			type: "group",
			position: { ...position },
			data: {
				programNodeId: programNode.id,
				constraints: programNode.constraints,
				label: programNode.label,
				depth: depth,
			},
			style: {
				backgroundColor: backgroundColor,
			},
			draggable: false,
			...(parentGroupId && { parentId: parentGroupId }),
		});

		// 2. create Standard Node
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
			processNode(child, depth + 1, groupId);
		});
	}

	processNode(program, 0); // start processing from the root (depth 0)
	return { nodes, edges };
}

export const layerColors = ["rgba(255, 250, 227, 0.4)", "rgba(235, 244, 255, 0.4)", "rgba(226, 232, 240, 0.4)", "rgba(220, 240, 255, 0.4)"];

// create a stable string representation of constraints for comparison
const getConstraintsKey = (constraints: Constraint[]): string => {
	return constraints
		.map((c) => c.name.toLowerCase())
		.sort()
		.join(",");
};

// Recursively get a structural key for a node and its descendants.
// Memoization map to avoid redundant calculations within a single generateLabels call.
const structuralKeyMemo = new Map<NodeData, string>();

function getStructuralKey(node: NodeData): string {
	if (structuralKeyMemo.has(node)) {
		return structuralKeyMemo.get(node)!;
	}

	const constraintKey = getConstraintsKey(node.constraints || []); // Ensure constraints is an array
	const children = node.children || []; // Ensure children is an array

	if (children.length === 0) {
		// Leaf node key depends only on constraints
		const key = `leaf:[${constraintKey}]`;
		structuralKeyMemo.set(node, key);
		return key;
	} else {
		// Intermediate node key depends on own constraints and the sorted keys of children
		const childrenKeys = children.map((child) => getStructuralKey(child)).sort();
		const key = `node:[${constraintKey}]_children:[${childrenKeys.join(";")}]`;
		structuralKeyMemo.set(node, key);
		return key;
	}
}

// convert a number to its subscript string representation
const toSubscript = (num: number): string => {
	const subscriptDigits: { [key: string]: string } = {
		"0": "₀",
		"1": "₁",
		"2": "₂",
		"3": "₃",
		"4": "₄",
		"5": "₅",
		"6": "₆",
		"7": "₇",
		"8": "₈",
		"9": "₉",
	};
	return String(num)
		.split("")
		.map((digit) => subscriptDigits[digit] || digit)
		.join("");
};

// Helper to ensure node properties exist, providing defaults if not.
function ensureNodeDefaults(node: NodeData): Required<NodeData> {
	return {
		id: node.id, // id is required
		constraints: node.constraints ?? [],
		children: node.children ?? [],
		label: node.label ?? "",
		// constraintWeights is not part of ProgramNode/NodeData, removed
	};
}

// Generate labels using a robust 3-pass approach
export function generateLabels(data: NodeData): NodeData {
	structuralKeyMemo.clear(); // Clear memoization
	const letterLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	// --- Pass 1: Collect Keys and First Encounter Order ---+
	const nodeInfoMap = new Map<string, { structuralKey: string; leafKey?: string }>(); // Map<node.id, keys>
	const orderedUniqueIntermediateKeys = new Map<number, string[]>(); // Map<level, ordered structuralKey[]>
	const orderedUniqueLeafKeys: string[] = [];
	const seenIntermediateKeys = new Map<number, Set<string>>(); // Map<level, Set<structuralKey>>
	const seenLeafKeys = new Set<string>();

	function collectKeys(node: NodeData, level: number, parentStructuralKey: string | null) {
		const safeNode = ensureNodeDefaults(node);
		const currentStructuralKey = getStructuralKey(safeNode);
		let currentLeafKey: string | undefined = undefined;

		nodeInfoMap.set(safeNode.id, { structuralKey: currentStructuralKey });

		if (safeNode.children.length > 0) {
			// Intermediate Node
			if (!seenIntermediateKeys.has(level)) {
				seenIntermediateKeys.set(level, new Set());
				orderedUniqueIntermediateKeys.set(level, []);
			}
			if (!seenIntermediateKeys.get(level)!.has(currentStructuralKey)) {
				seenIntermediateKeys.get(level)!.add(currentStructuralKey);
				orderedUniqueIntermediateKeys.get(level)!.push(currentStructuralKey);
			}

			// Recurse for children
			safeNode.children.forEach((child) => collectKeys(child, level + 1, currentStructuralKey));
		} else {
			// Leaf Node
			const constraintKey = getConstraintsKey(safeNode.constraints);
			currentLeafKey = `parentKey:[${parentStructuralKey || "root"}]_constraints:[${constraintKey}]`;
			nodeInfoMap.get(safeNode.id)!.leafKey = currentLeafKey; // Store leaf key too

			if (!seenLeafKeys.has(currentLeafKey)) {
				seenLeafKeys.add(currentLeafKey);
				orderedUniqueLeafKeys.push(currentLeafKey);
			}
		}
	}

	collectKeys(data, 0, null);

	// --- Pass 2: Assign Labels to Keys ---+
	const xLabelAssignments = new Map<string, string>(); // Map<structuralKey, X_label>
	const leafLabelAssignments = new Map<string, string>(); // Map<leafKey, Letter>

	// Assign X labels (Root is always X_1)
	const rootStructuralKey = getStructuralKey(ensureNodeDefaults(data));
	xLabelAssignments.set(rootStructuralKey, `X${toSubscript(1)}`);
	orderedUniqueIntermediateKeys.forEach((keys, level) => {
		if (level === 0) return; // Skip root, already handled
		keys.forEach((key, index) => {
			// X index starts from level + 1 and increments based on encounter order at that level
			const xIndex = level + 1 + index;
			xLabelAssignments.set(key, `X${toSubscript(xIndex)}`);
		});
	});

	// Assign Leaf labels (A, B, C... based on global encounter order)
	orderedUniqueLeafKeys.forEach((leafKey, index) => {
		const letterIndex = index % letterLabels.length;
		// TODO: Handle running out of letters
		leafLabelAssignments.set(leafKey, letterLabels[letterIndex]);
	});

	// --- Pass 3: Apply Labels to Nodes ---+
	function applyLabels(node: NodeData) {
		const safeNode = ensureNodeDefaults(node);
		const nodeInfo = nodeInfoMap.get(safeNode.id);

		if (!nodeInfo) {
			console.warn(`Label application: Node info not found for ID ${safeNode.id}`);
			node.label = "?";
			return;
		}

		if (safeNode.children.length > 0) {
			// Intermediate node
			node.label = xLabelAssignments.get(nodeInfo.structuralKey) || "?";
			safeNode.children.forEach(applyLabels); // Recurse
		} else {
			// Leaf node
			if (!nodeInfo.leafKey) {
				console.warn(`Label application: Leaf key missing for leaf node ID ${safeNode.id}`);
				node.label = "?";
				return;
			}
			node.label = leafLabelAssignments.get(nodeInfo.leafKey) || "?";
		}
	}

	applyLabels(data);

	structuralKeyMemo.clear(); // Final clear

	return data;
}

// --- Program Structure Manipulation Helpers ---

// Helper function to find a node in the program tree and remove it along with its descendants
export const findAndRemoveNodeFromProgram = (programNode: ProgramNode, targetId: string): boolean => {
	// Check children first
	const initialLength = programNode.children.length;
	programNode.children = programNode.children.filter((child) => child.id !== targetId);

	// If a child was removed, we're done in this branch
	if (programNode.children.length < initialLength) {
		return true;
	}

	// If not found in direct children, recurse into remaining children
	for (const child of programNode.children) {
		if (findAndRemoveNodeFromProgram(child, targetId)) {
			return true; // Found and removed in a deeper branch
		}
	}

	// Not found in this subtree
	return false;
};

// Deep duplicates a ProgramNode and its descendants, assigning new UUIDs
const deepDuplicateNode = (node: ProgramNode): ProgramNode => {
	const newId = uuidv4();
	const duplicatedNode: ProgramNode = {
		...node, // Copy constraints, potentially label (will be regenerated later), etc.
		id: newId,
		children: node.children.map(deepDuplicateNode), // Recursively duplicate children
		// Reset label, as it will be regenerated based on new structure/position
		label: undefined,
	};
	return duplicatedNode;
};

// Helper function to find a node and duplicate it (including children) as a sibling
export const findAndDuplicateNodeInProgram = (programNode: ProgramNode, targetId: string): boolean => {
	// Check children of the current node
	const targetIndex = programNode.children.findIndex((child) => child.id === targetId);

	if (targetIndex !== -1) {
		// Found the node to duplicate as a child of the current programNode
		const nodeToDuplicate = programNode.children[targetIndex];
		const duplicatedNode = deepDuplicateNode(nodeToDuplicate);
		// Insert the duplicated node right after the original in the children array
		programNode.children.splice(targetIndex + 1, 0, duplicatedNode);
		return true; // Duplication successful
	}

	// If not found in direct children, recurse into the children
	for (const child of programNode.children) {
		if (findAndDuplicateNodeInProgram(child, targetId)) {
			return true; // Found and duplicated in a deeper branch
		}
	}

	// Target node not found in this subtree
	return false;
};
