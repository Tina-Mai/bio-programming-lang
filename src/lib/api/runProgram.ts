// TODO: error checks
// - no sequence nodes
// - sequence nodes missing a generator or sequence type
// - constraint nodes missing a constraint
// - free-floating nodes (just ignore them? or throw an error? or popup that asks them if they want to compile anyway)
import { toast } from "sonner";

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
		toast.error(errorMessage);
		throw new Error(errorMessage);
	}
	return res.json();
}
