import { Program, ProgramNode, Constraint, NodeData } from "@/types";
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
		.map((c) => c.name)
		.sort()
		.join(",");
};

// recursively get a structural key for a node and its descendants
// this key aims to be identical for structurally identical subtrees (constraints + children structure)
function getStructuralKey(node: NodeData): string {
	const constraintKey = getConstraintsKey(node.constraints);
	if (!node.children || node.children.length === 0) {
		return `leaf:[${constraintKey}]`;
	} else {
		// key depends on own constraints and the sorted keys of children
		const childrenKeys = node.children.map((child) => getStructuralKey(child)).sort();
		return `node:[${constraintKey}]_children:[${childrenKeys.join(";")}]`;
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

// generate labels recursively based on level and structural similarity
export function generateLabels(data: NodeData): NodeData {
	const letterLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const intermediateLevelLabels = new Map<number, Map<string, string>>();
	const leafLevelLabels = new Map<number, Map<string, string>>();
	const nextXIndexForLevel = new Map<number, number>();

	function traverse(node: NodeData, level: number, parentLabel: string | null) {
		if (!intermediateLevelLabels.has(level)) intermediateLevelLabels.set(level, new Map<string, string>());
		if (!leafLevelLabels.has(level)) leafLevelLabels.set(level, new Map<string, string>());
		if (!nextXIndexForLevel.has(level)) {
			nextXIndexForLevel.set(level, level + 1);
		}

		const currentIntermediateMap = intermediateLevelLabels.get(level)!;
		const currentLeafMap = leafLevelLabels.get(level)!;

		let currentLabel: string | undefined;

		if (level === 0) {
			currentLabel = `X${toSubscript(1)}`;
		} else if (node.children && node.children.length > 0) {
			const structuralKey = getStructuralKey(node);

			if (!currentIntermediateMap.has(structuralKey)) {
				const currentXIndex = nextXIndexForLevel.get(level)!;
				const newLabel = `X${toSubscript(currentXIndex)}`;

				currentIntermediateMap.set(structuralKey, newLabel);
				nextXIndexForLevel.set(level, currentXIndex + 1);
			}
			currentLabel = currentIntermediateMap.get(structuralKey);
		} else {
			const constraintsKey = getConstraintsKey(node.constraints);
			const leafKey = `parent:${parentLabel}_constraints:[${constraintsKey}]`;

			if (!currentLeafMap.has(leafKey)) {
				const usedLettersCount = currentLeafMap.size;
				const letterIndex = usedLettersCount % letterLabels.length;
				const newLabel = letterLabels[letterIndex];
				currentLeafMap.set(leafKey, newLabel);
			}
			currentLabel = currentLeafMap.get(leafKey);
		}

		node.label = currentLabel;

		// recursively process children
		if (node.children && node.children.length > 0) {
			node.children.forEach((child) => traverse(child, level + 1, currentLabel!));
		}
	}

	// start traversal from the root node (level 0) with null parent label
	traverse(data, 0, null);

	return data;
}
