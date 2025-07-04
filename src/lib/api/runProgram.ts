export interface ProgramValidationError {
	nodeId: string | null; // null for program-wide errors like "no sequence nodes"
	message: string;
	nodeType?: "sequence" | "constraint";
}

export function validateProgramGraph(): ProgramValidationError[] {
	// TODO: implement
	// - must have at least one segment
	// - all segments must have a generator
	// - all generator nodes must have a generator selected (key)
	// - all constraints must have a constraint selected (key)
	// - all [constructs?] must have a sequence type selected
	const errors: ProgramValidationError[] = [];
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
	// Expecting { final_output_id: string, status: "complete" } or an error structure
	return res.json() as Promise<{ final_output_id: string; status: string; message?: string }>;
}
