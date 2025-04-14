import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Define the structure of a node (adjust based on your actual data structure if needed)
interface Constraint {
	name: string;
	// add other potential properties if they exist
}

export interface NodeData {
	id: string;
	children: NodeData[];
	constraints: Constraint[];
	label?: string; // Add label as optional, it will be generated
}

// Helper to create a stable string representation of constraints for comparison
const getConstraintsKey = (constraints: Constraint[]): string => {
	// Sort constraints by name to ensure consistent key regardless of order
	return constraints
		.map((c) => c.name)
		.sort()
		.join(",");
};

// Recursive helper to get a structural key for a node and its descendants
// This key aims to be identical for structurally identical subtrees (constraints + children structure)
function getStructuralKey(node: NodeData): string {
	const constraintKey = getConstraintsKey(node.constraints);
	if (!node.children || node.children.length === 0) {
		return `leaf:[${constraintKey}]`;
	} else {
		// Key depends on own constraints and the sorted keys of children
		const childrenKeys = node.children.map((child) => getStructuralKey(child)).sort();
		return `node:[${constraintKey}]_children:[${childrenKeys.join(";")}]`;
	}
}

// Helper to convert a number to its subscript string representation
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

// Function to generate labels recursively based on level and structural similarity
export function generateLabels(data: NodeData): NodeData {
	const letterLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	// Maps keyed by level number. Value is another map for that level's unique structures.
	const intermediateLevelLabels = new Map<number, Map<string, string>>(); // level -> { structuralKey -> label }
	const leafLevelLabels = new Map<number, Map<string, string>>(); // level -> { constraintsKey -> label }
	// Keep track of the next X index to use for new structures at each level
	const nextXIndexForLevel = new Map<number, number>(); // level -> next X index (starts at level+1)

	function traverse(node: NodeData, level: number, parentLabel: string | null) {
		// Ensure maps exist for the current level
		if (!intermediateLevelLabels.has(level)) intermediateLevelLabels.set(level, new Map<string, string>());
		if (!leafLevelLabels.has(level)) leafLevelLabels.set(level, new Map<string, string>());
		// Initialize next X index for the level if not present (starts at level + 1)
		if (!nextXIndexForLevel.has(level)) {
			nextXIndexForLevel.set(level, level + 1);
		}

		const currentIntermediateMap = intermediateLevelLabels.get(level)!;
		const currentLeafMap = leafLevelLabels.get(level)!;

		let currentLabel: string | undefined;

		if (level === 0) {
			currentLabel = `X${toSubscript(1)}`; // Use subscript for level 0
		} else if (node.children && node.children.length > 0) {
			// Intermediate node
			const structuralKey = getStructuralKey(node); // Use the recursive structural key

			if (!currentIntermediateMap.has(structuralKey)) {
				// This structure is new for this level. Assign the next sequential X label.
				const currentXIndex = nextXIndexForLevel.get(level)!;
				const newLabel = `X${toSubscript(currentXIndex)}`;

				currentIntermediateMap.set(structuralKey, newLabel);
				// Increment the index for the next different structure at this level
				nextXIndexForLevel.set(level, currentXIndex + 1);
			}
			currentLabel = currentIntermediateMap.get(structuralKey);
		} else {
			// Leaf node (no children)
			const constraintsKey = getConstraintsKey(node.constraints);
			// Key combines parent label and constraints for uniqueness
			const leafKey = `parent:${parentLabel}_constraints:[${constraintsKey}]`;

			// Sticking with the previous leaf logic: assign A, B, C based on *new* combined keys found *at this level*.
			if (!currentLeafMap.has(leafKey)) {
				// Use the combined leafKey
				const usedLettersCount = currentLeafMap.size;
				const letterIndex = usedLettersCount % letterLabels.length; // Cycle through A-Z
				const newLabel = letterLabels[letterIndex];
				currentLeafMap.set(leafKey, newLabel); // Use the combined leafKey
			}
			currentLabel = currentLeafMap.get(leafKey);
		}

		// Assign the determined label to the node
		node.label = currentLabel;

		// Recursively process children, passing the current node's label as parentLabel
		if (node.children && node.children.length > 0) {
			node.children.forEach((child) => traverse(child, level + 1, currentLabel!)); // Pass currentLabel
		}
	}

	// Start traversal from the root node (level 0) with null parent label
	traverse(data, 0, null);

	return data; // Return the modified data structure with labels
}

// Example Usage (assuming you load program.json into a variable called jsonData)
// import jsonData from './data/mock/program.json'; // Adjust path as needed
// const dataWithLabels = generateLabels(jsonData as NodeData); // Cast or ensure type compatibility
// console.log(JSON.stringify(dataWithLabels, null, 2));
