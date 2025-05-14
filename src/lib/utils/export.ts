import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetches program outputs from Supabase and initiates a CSV download.
 * Each row in the CSV corresponds to the metadata of an output.
 * The filename will be "[Project Name] outputs.csv".
 *
 * @param programId The ID of the program whose outputs are to be downloaded.
 */
export const downloadProgramOutputs = async (programId: string): Promise<void> => {
	const supabase: SupabaseClient = createClient();

	// 1. Fetch Project Name
	let projectName = "Project"; // Default project name
	try {
		const { data: programDetails, error: programError } = await supabase
			.from("programs")
			.select(
				`
				project_id,
				project:projects (name)
			`
			)
			.eq("id", programId)
			.single();

		if (programError) {
			console.error(`Error fetching project name for program ${programId}:`, programError.message);
		} else if (programDetails?.project && typeof programDetails.project === "object" && "name" in programDetails.project) {
			projectName = String(programDetails.project.name) || "Project";
		} else if (programDetails && !programDetails.project) {
			console.warn(`Project details not found for program ${programId}, though program exists.`);
		}
	} catch (e) {
		console.error("Exception while fetching project name:", e);
	}

	// 2. Fetch Outputs
	try {
		const { data: outputsData, error: outputsError } = await supabase.from("outputs").select("metadata").eq("program_id", programId);

		if (outputsError) {
			console.error(`Error fetching outputs for program ${programId}:`, outputsError.message);
			// TODO: Inform user about the error (e.g., toast notification)
			return;
		}

		if (!outputsData || outputsData.length === 0) {
			console.warn(`No outputs found for program ${programId}.`);
			// TODO: Inform user (e.g., toast notification that no data is available)
			// Optionally, download an empty CSV or a CSV with a "no data" message.
			const emptyCsvContent = "No output metadata found for this program.";
			const emptyBlob = new Blob([emptyCsvContent], { type: "text/plain;charset=utf-8;" });
			const emptyLink = document.createElement("a");
			const emptyUrl = URL.createObjectURL(emptyBlob);
			emptyLink.setAttribute("href", emptyUrl);
			emptyLink.setAttribute("download", `${projectName.replace(/[^a-z0-9_-\s]/gi, "_")}_outputs_empty.txt`);
			emptyLink.style.visibility = "hidden";
			document.body.appendChild(emptyLink);
			emptyLink.click();
			document.body.removeChild(emptyLink);
			URL.revokeObjectURL(emptyUrl);
			return;
		}

		const allMetadata = outputsData.map((o) => o.metadata).filter((m) => m && typeof m === "object") as Record<string, unknown>[];

		if (allMetadata.length === 0) {
			console.warn(`No valid metadata objects found in outputs for program ${programId}.`);
			// Similar handling as no outputsData
			return;
		}

		// 3. Generate CSV Content
		const allKeys = new Set<string>();
		allMetadata.forEach((meta) => {
			Object.keys(meta).forEach((key) => allKeys.add(key));
		});
		const headers = Array.from(allKeys);

		const csvRows = [headers.join(",")]; // First row is headers

		allMetadata.forEach((meta) => {
			const rowValues = headers.map((header) => {
				const value = meta[header];
				if (value === null || typeof value === "undefined") return "";
				if (typeof value === "object") return JSON.stringify(value); // Handles arrays and nested objects

				const stringValue = String(value);
				if (stringValue.includes(",")) {
					return `"${stringValue.replace(/"/g, '""')}"`;
				}
				return stringValue;
			});
			csvRows.push(rowValues.join(","));
		});

		const csvContent = csvRows.join("\n");

		// 4. Trigger Download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		const safeProjectName = projectName.replace(/[^a-z0-9_-\s]/gi, "_").trim() || "project";
		link.setAttribute("download", `${safeProjectName}_outputs.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error("Failed to download program outputs as CSV:", error);
		// TODO: Inform user about the error (e.g., toast notification)
	}
};
