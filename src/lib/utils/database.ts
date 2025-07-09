import { SupabaseClient } from "@supabase/supabase-js";
import { ProjectJSON } from "@/context/GlobalContext";
import { SupabaseProgram } from "./program";

export async function createProject(
	supabase: SupabaseClient,
	name?: string
): Promise<{
	project: ProjectJSON;
	program: SupabaseProgram;
	construct: { id: string };
}> {
	const baseName = name || "New design";
	let finalName = baseName;
	let counter = 1;

	// check for existing project names to avoid duplicates
	const { data: existingProjects, error: fetchError } = await supabase.from("projects").select("name").like("name", `${baseName}%`);

	if (fetchError) {
		throw new Error(`Error fetching existing project names: ${fetchError.message}`);
	}

	if (existingProjects && existingProjects.length > 0) {
		const existingNames = new Set(existingProjects.map((p: { name: string }) => p.name));
		if (existingNames.has(baseName)) {
			counter = 2;
			while (existingNames.has(`${baseName} ${counter}`)) {
				counter++;
			}
			finalName = `${baseName} ${counter}`;
		}
	}

	let project: ProjectJSON | null = null;
	let program: SupabaseProgram | null = null;

	try {
		const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: finalName }).select().single();

		if (projectError) {
			throw new Error(`Failed to create project: ${projectError.message}`);
		}

		if (!newProjectData) {
			throw new Error("Failed to create project, no data returned");
		}

		project = newProjectData as ProjectJSON;

		// default create a program for the project
		const programResult = await createProgram(supabase, project.id);
		program = programResult.program;

		return {
			project,
			program,
			construct: programResult.construct,
		};
	} catch (error) {
		if (project) {
			await supabase.from("projects").delete().eq("id", project.id);
		}
		throw error;
	}
}

export async function createProgram(
	supabase: SupabaseClient,
	projectId: string
): Promise<{
	program: SupabaseProgram;
	construct: { id: string };
}> {
	const programPayload = {
		project_id: projectId,
	};

	let program: SupabaseProgram | null = null;

	try {
		const { data: programData, error: programError } = await supabase.from("programs").insert(programPayload).select().single();

		if (programError) {
			throw new Error(`Failed to create program: ${programError.message}`);
		}

		if (!programData) {
			throw new Error("Failed to create program, no data returned");
		}

		program = programData as SupabaseProgram;

		// default create a construct for the program
		const construct = await createConstruct(supabase, program.id);

		return { program, construct };
	} catch (error) {
		if (program) {
			await supabase.from("programs").delete().eq("id", program.id);
		}
		throw error;
	}
}

export async function createConstruct(supabase: SupabaseClient, programId: string): Promise<{ id: string }> {
	const constructPayload = {
		program_id: programId,
	};

	const { data: constructData, error: constructError } = await supabase.from("constructs").insert(constructPayload).select().single();

	if (constructError) {
		throw new Error(`Failed to create construct: ${constructError.message}`);
	}

	if (!constructData) {
		throw new Error("Failed to create construct, no data returned");
	}

	return constructData;
}

export async function createSegment(supabase: SupabaseClient, constructId: string): Promise<{ id: string }> {
	const { data: maxOrderData, error: maxOrderError } = await supabase
		.from("construct_segment_order")
		.select("order_idx")
		.eq("construct_id", constructId)
		.order("order_idx", { ascending: false })
		.limit(1)
		.single();

	if (maxOrderError && maxOrderError.code !== "PGRST116") {
		throw new Error(`Failed to get max order index for construct: ${maxOrderError.message}`);
	}

	const newOrderIdx = (maxOrderData?.order_idx ?? -1) + 1;

	const { data: segmentData, error: segmentError } = await supabase.from("segments").insert({ label: "Segment", length: 100 }).select("id").single();

	if (segmentError) {
		throw new Error(`Failed to create segment: ${segmentError.message}`);
	}

	if (!segmentData) {
		throw new Error("Failed to create segment, no data returned");
	}

	const { error: linkError } = await supabase.from("construct_segment_order").insert({
		construct_id: constructId,
		segment_id: segmentData.id,
		order_idx: newOrderIdx,
	});

	if (linkError) {
		await supabase.from("segments").delete().eq("id", segmentData.id);
		throw new Error(`Failed to link segment to construct: ${linkError.message}`);
	}

	return segmentData;
}

export async function deleteProject(supabase: SupabaseClient, projectId: string): Promise<void> {
	const { error } = await supabase.from("projects").delete().eq("id", projectId);

	if (error) {
		throw new Error(`Failed to delete project: ${error.message}`);
	}
}

export async function deleteProgram(supabase: SupabaseClient, programId: string): Promise<void> {
	const { error } = await supabase.from("programs").delete().eq("id", programId);

	if (error) {
		throw new Error(`Failed to delete program: ${error.message}`);
	}
}

export async function deleteConstruct(supabase: SupabaseClient, constructId: string): Promise<void> {
	const { error } = await supabase.from("constructs").delete().eq("id", constructId);

	if (error) {
		throw new Error(`Failed to delete construct: ${error.message}`);
	}
}

export async function deleteSegment(supabase: SupabaseClient, segmentId: string): Promise<void> {
	const { error } = await supabase.from("segments").delete().eq("id", segmentId);

	if (error) {
		throw new Error(`Failed to delete segment: ${error.message}`);
	}
}
