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
