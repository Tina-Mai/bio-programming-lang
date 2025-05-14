import { RawProgramGraphData, SupabaseDBEdge } from "@/lib/utils";

export interface ProgramValidationError {
	nodeId: string | null; // null for program-wide errors like "no sequence nodes"
	message: string;
	nodeType?: "sequence" | "constraint";
}

export function validateProgramGraph(programGraphData: RawProgramGraphData | null): ProgramValidationError[] {
	const errors: ProgramValidationError[] = [];

	if (!programGraphData) {
		errors.push({ nodeId: null, message: "Program data is not loaded or available for validation" });
		return errors;
	}

	const { sequenceNodes = [], constraintNodes = [], edges = [] } = programGraphData;

	// Check 1: no sequence nodes
	if (sequenceNodes.length === 0) {
		errors.push({ nodeId: null, message: "Program must contain at least one sequence node" });
	} else {
		// Check 2: sequence nodes missing a generator or sequence type
		sequenceNodes.forEach((node) => {
			if (!node.type) {
				errors.push({
					nodeId: node.id,
					message: `Missing a sequence type`,
					nodeType: "sequence",
				});
			}
			if (!node.generator_id) {
				errors.push({
					nodeId: node.id,
					message: `Missing a generator`,
					nodeType: "sequence",
				});
			}
		});
	}

	// Check 3: constraint nodes missing a constraint (key)
	constraintNodes.forEach((node) => {
		if (!node.key) {
			errors.push({
				nodeId: node.id,
				message: `Missing a constraint selection`,
				nodeType: "constraint",
			});
		}
	});

	// Check 4: free-floating constraint nodes
	const allNodeIdsInEdges = new Set<string>();
	edges.forEach((edge: SupabaseDBEdge) => {
		if (edge.constraint_id) allNodeIdsInEdges.add(edge.constraint_id);
		if (edge.sequence_id) allNodeIdsInEdges.add(edge.sequence_id);
	});
	constraintNodes.forEach((node) => {
		if (!edges.some((edge) => edge.constraint_id === node.id)) {
			errors.push({
				nodeId: node.id,
				message: `Constraint node must be connected to a sequence node`,
				nodeType: "constraint",
			});
		}
	});

	return errors;
}

export async function runProgram(programId: string) {
	console.log("Frontend calling Next.js proxy for program:", programId);
	const res = await fetch(`/api/run_program`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ program_id: programId }),
	});

	if (!res.ok) {
		let errorPayload: { detail?: string; error?: string; message?: string } = { error: `API route error: ${res.status} ${res.statusText}` };
		try {
			const parsedJson = await res.json();
			errorPayload = { ...errorPayload, ...parsedJson };
		} catch {
			// ignore if response is not JSON
		}
		console.error("Next.js API route error response:", errorPayload);
		const errorMessage = errorPayload.message || errorPayload.detail || errorPayload.error || `API error: ${res.status}`;
		throw new Error(errorMessage);
	}
	return res.json();
}
