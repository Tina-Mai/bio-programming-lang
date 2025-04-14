import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Program, ProgramNode, Constraint } from "@/types";

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
