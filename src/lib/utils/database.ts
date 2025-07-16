import { SupabaseClient } from "@supabase/supabase-js";
import { ProjectJSON } from "@/context/GlobalContext";
import { SupabaseProgram } from "./program";
import { Segment, GeneratorInstance, ConstraintInstance } from "@/types";

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

export async function deleteConstraint(supabase: SupabaseClient, constraintId: string): Promise<void> {
	const { error } = await supabase.from("constraints").delete().eq("id", constraintId);

	if (error) {
		throw new Error(`Failed to delete constraint: ${error.message}`);
	}
}

export async function linkConstraintToSegment(supabase: SupabaseClient, constraintId: string, segmentId: string): Promise<void> {
	const { error } = await supabase.from("constraint_segment_links").insert({ constraint_id: constraintId, segment_id: segmentId });

	if (error) {
		if (error.code === "23505") {
			console.log("Link already exists.");
			return;
		}
		throw new Error(`Failed to link constraint to segment: ${error.message}`);
	}
}

export async function createConstraint(supabase: SupabaseClient, programId: string): Promise<ConstraintInstance> {
	const { data, error } = await supabase.from("constraints").insert({ program_id: programId, key: null, label: null }).select().single();

	if (error) {
		throw new Error(`Failed to create constraint: ${error.message}`);
	}

	if (!data) {
		throw new Error("Failed to create constraint, no data returned");
	}

	return {
		...data,
		segments: [],
	};
}

export async function createSegment(supabase: SupabaseClient, constructId: string): Promise<Segment> {
	// 1. Get program_id from construct
	const { data: constructData, error: constructError } = await supabase.from("constructs").select("program_id").eq("id", constructId).single();

	if (constructError || !constructData) {
		throw new Error(`Failed to find construct with id ${constructId}: ${constructError?.message}`);
	}
	const programId = constructData.program_id;

	const { data: maxOrderData, error: maxOrderError } = await supabase
		.from("construct_segment_order")
		.select("order_idx")
		.eq("construct_id", constructId)
		.order("order_idx", { ascending: false })
		.limit(1);

	if (maxOrderError) {
		throw new Error(`Failed to get max order index for construct: ${maxOrderError.message}`);
	}

	const newOrderIdx = (maxOrderData?.[0]?.order_idx ?? -1) + 1;

	// Create segment first
	const { data: segmentData, error: segmentError } = await supabase.from("segments").insert({ label: "Segment", length: 100 }).select("*").single();

	if (segmentError) {
		throw new Error(`Failed to create segment: ${segmentError.message}`);
	}

	if (!segmentData) {
		throw new Error("Failed to create segment, no data returned");
	}

	// Create a default generator for the new segment, linking it via segment_id
	const { data: generatorData, error: generatorError } = await supabase.from("generators").insert({ program_id: programId, segment_id: segmentData.id, key: null, label: null }).select().single();

	if (generatorError || !generatorData?.id) {
		// Rollback segment creation if generator creation fails
		await supabase.from("segments").delete().eq("id", segmentData.id);
		throw new Error(`Failed to create default generator. Error: ${generatorError?.message}`);
	}

	const { error: linkError } = await supabase.from("construct_segment_order").insert({
		construct_id: constructId,
		segment_id: segmentData.id,
		order_idx: newOrderIdx,
	});

	if (linkError) {
		// Rollback segment and generator creation
		await supabase.from("segments").delete().eq("id", segmentData.id);
		// The generator should be deleted by cascade if the foreign key is set up correctly.
		// If not, we might need to delete it manually:
		// await supabase.from("generators").delete().eq("id", generatorData.id);
		throw new Error(`Failed to link segment to construct: ${linkError.message}`);
	}

	// Combine segment data with the full generator object
	const newSegment: Segment = {
		...segmentData,
		generator: generatorData as GeneratorInstance,
	};

	return newSegment;
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
