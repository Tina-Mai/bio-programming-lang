"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Project } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { SupabaseProgram } from "@/lib/utils/program";

// define ProjectJSON based on what Supabase 'projects' table returns
export interface ProjectJSON {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
}

type Mode = "graph" | "code";

// convert ProjectJSON to Project
const mapProjectJsonToProject = (p: ProjectJSON): Project => ({
	id: p.id,
	name: p.name,
	createdAt: new Date(p.created_at),
	updatedAt: p.updated_at ? new Date(p.updated_at) : new Date(p.created_at),
});

// sort projects
const sortProjects = (projects: Project[]): Project[] => {
	return [...projects].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

interface GlobalContextType {
	mode: Mode;
	setMode: (mode: Mode) => void;
	projects: Project[];
	currentProject: Project | null;
	setCurrentProject: (project: Project | null) => void;
	fetchProjects: () => Promise<void>;
	createNewProject: () => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
	duplicateProject: (projectId: string) => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<Mode>("graph");
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const supabase: SupabaseClient = createClient();

	// --- Internal Helper Functions ---

	const _fetchProjectsFromDB = useCallback(async (): Promise<Project[]> => {
		console.log("Fetching projects from Supabase...");
		const { data, error } = await supabase.from("projects").select<"*", ProjectJSON>("*");
		if (error) {
			console.error("Error fetching projects:", error);
			throw error;
		}
		return data ? data.map(mapProjectJsonToProject) : [];
	}, [supabase]);

	const _createProjectInDB = useCallback(async (): Promise<{ project: ProjectJSON; initialProgram: SupabaseProgram }> => {
		const baseName = "New design";
		let finalName = baseName;
		let counter = 1;

		const { data: existingProjects, error: fetchError } = await supabase.from("projects").select("name").like("name", `${baseName}%`);

		if (fetchError) {
			console.error("Error fetching existing project names:", fetchError);
			throw fetchError;
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

		// create the project
		const { data: newProjectData, error: projectError } = await supabase.from("projects").insert({ name: finalName }).select().single();
		if (projectError) throw projectError;
		if (!newProjectData) throw new Error("Failed to create project, no data returned.");
		const projectJson = newProjectData as ProjectJSON;

		// create an initial default program
		const now = new Date().toISOString();
		const initialProgramPayload = {
			project_id: projectJson.id,
			created_at: now,
		};
		const { data: newProgramData, error: programError } = await supabase.from("programs").insert(initialProgramPayload).select().single();
		if (programError) {
			console.error("Failed to create initial program for new project. Full error object:", JSON.stringify(programError, null, 2));
			// Attempt to delete the just-created project if program creation fails
			await supabase.from("projects").delete().eq("id", projectJson.id);
			throw new Error(`Failed to create initial program: ${programError.message}`);
		}
		if (!newProgramData) throw new Error("Failed to create initial program, no data returned.");

		return { project: projectJson, initialProgram: newProgramData as SupabaseProgram };
	}, [supabase]);

	const _deleteProjectFromDB = useCallback(
		async (projectId: string): Promise<void> => {
			console.log(`Deleting project data from DB for project: ${projectId}...`);

			// 1. fetch all program IDs for the project
			const { data: programs, error: fetchProgramsError } = await supabase.from("programs").select("id").eq("project_id", projectId);

			if (fetchProgramsError) {
				console.error(`Error fetching programs for project ${projectId}: ${fetchProgramsError.message}`);
				throw fetchProgramsError;
			}

			const programIds = programs?.map((p) => p.id) || [];

			if (programIds.length > 0) {
				console.log(`Found ${programIds.length} programs to delete for project ${projectId}:`, programIds);

				// 2. For each program, delete its associated data
				// Note: Most associated data will be cascade deleted due to foreign key constraints
				// We need to handle constructs and their related data
				for (const programId of programIds) {
					console.log(`Deleting data for program ${programId}...`);

					// Get constructs for this program (just to check for errors)
					const { error: constructsError } = await supabase.from("constructs").select("id").eq("program_id", programId);

					if (constructsError) {
						console.warn(`Error fetching constructs for program ${programId}: ${constructsError.message}`);
					}

					// Cascade delete will handle:
					// - construct_segment_order
					// - outputs linked to constructs
					// - constraints and constraint_segment_links
					// - generators and generator_segment_links
				}

				// 3. delete all programs for the project (cascade will handle related data)
				console.log(`Deleting programs for project ${projectId}...`);
				const { error: deleteProgramsError } = await supabase.from("programs").delete().in("id", programIds);
				if (deleteProgramsError) {
					console.error(`Error deleting programs for project ${projectId}: ${deleteProgramsError.message}`);
					throw deleteProgramsError;
				}
			}

			// 4. finally, delete the main project entry
			console.log(`Deleting project entry ${projectId}...`);
			const { error: projectError } = await supabase.from("projects").delete().eq("id", projectId);
			if (projectError) {
				console.error(`Failed to delete project ${projectId} itself:`, projectError.message);
				throw projectError;
			}
			console.log(`Project ${projectId} and its associated data deleted.`);
		},
		[supabase]
	);

	const _duplicateProjectInDB = useCallback(
		async (originalProjectId: string): Promise<{ duplicatedProject: ProjectJSON; newProgramId?: string }> => {
			console.log(`Duplicating project in DB: ${originalProjectId}...`);

			// 1. fetch original project details
			const { data: originalProjectData, error: fetchOrigError } = await supabase.from("projects").select("name").eq("id", originalProjectId).single();
			if (fetchOrigError) throw new Error(`Failed to fetch original project for duplication: ${fetchOrigError.message}`);
			if (!originalProjectData) throw new Error("Original project not found for duplication.");

			// 2. create new project entry
			const newProjectName = `(Copy) ${originalProjectData.name}`;
			const { data: newProjectResult, error: createProjectError } = await supabase.from("projects").insert({ name: newProjectName }).select("id, name, created_at, updated_at").single();
			if (createProjectError) throw createProjectError;
			if (!newProjectResult) throw new Error("Failed to create duplicated project entry.");
			const newProjectId = newProjectResult.id;
			const duplicatedProjectJSON = newProjectResult as ProjectJSON;

			// 3. fetch the most recent program from the original project
			const { data: originalProgramsData, error: fetchProgramsError } = await supabase
				.from("programs")
				.select<"*", SupabaseProgram>("*")
				.eq("project_id", originalProjectId)
				.order("updated_at", { ascending: false })
				.limit(1);

			if (fetchProgramsError) {
				await supabase.from("projects").delete().eq("id", newProjectId);
				throw new Error(`Failed to fetch original program for duplication: ${fetchProgramsError.message}`);
			}

			const mostRecentOriginalProgram = originalProgramsData && originalProgramsData.length > 0 ? originalProgramsData[0] : null;

			let newProgramIdForDuplication: string | undefined = undefined;

			// 4. if a most recent program exists, duplicate it and its contents
			if (mostRecentOriginalProgram) {
				const originalProgram = mostRecentOriginalProgram;
				const segmentIdMap = new Map<string, string>();
				const constraintIdMap = new Map<string, string>();
				const generatorIdMap = new Map<string, string>();
				const constructIdMap = new Map<string, string>();

				const newProgramId = uuidv4();
				newProgramIdForDuplication = newProgramId;
				const now = new Date().toISOString();
				const newProgramPayload = {
					id: newProgramId,
					project_id: newProjectId,
					created_at: now,
				};
				const { error: createProgramError } = await supabase.from("programs").insert(newProgramPayload);
				if (createProgramError) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					console.error("Failed to create duplicated program entry. Full error object:", JSON.stringify(createProgramError, null, 2));
					throw new Error(`Failed to create duplicated program entry: ${createProgramError.message}`);
				}

				// Fetch all data related to the original program
				const [constructsResult, constraintsResult, generatorsResult] = await Promise.all([
					supabase.from("constructs").select("*").eq("program_id", originalProgram.id),
					supabase.from("constraints").select("*").eq("program_id", originalProgram.id),
					supabase.from("generators").select("*").eq("program_id", originalProgram.id),
				]);

				if (constructsResult.error || constraintsResult.error || generatorsResult.error) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error("Failed to fetch original program data for duplication");
				}

				const originalConstructs = constructsResult.data || [];
				const originalConstraints = constraintsResult.data || [];
				const originalGenerators = generatorsResult.data || [];

				// Fetch segments and their relationships for all constructs
				interface SegmentData {
					id: string;
					length: number;
					label?: string;
					created_at?: string;
					updated_at?: string;
				}

				interface SegmentOrder {
					construct_id: string;
					segment_id: string;
					order_idx: number;
					segments?: SegmentData;
				}

				interface SegmentLink {
					constraint_id?: string;
					generator_id?: string;
					segment_id: string;
				}

				let allSegments: SegmentData[] = [];
				let allSegmentOrders: SegmentOrder[] = [];
				let allConstraintLinks: SegmentLink[] = [];
				let allGeneratorLinks: SegmentLink[] = [];

				if (originalConstructs.length > 0) {
					const constructIds = originalConstructs.map((c) => c.id);

					// Fetch construct-segment orders
					const { data: segmentOrders, error: orderError } = await supabase.from("construct_segment_order").select("*, segments(*)").in("construct_id", constructIds);

					if (orderError) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error("Failed to fetch segment orders");
					}

					allSegmentOrders = segmentOrders || [];

					// Extract unique segments
					const segmentMap = new Map();
					allSegmentOrders.forEach((order) => {
						if (order.segments) {
							segmentMap.set(order.segments.id, order.segments);
						}
					});
					allSegments = Array.from(segmentMap.values());

					// Fetch constraint and generator links
					if (allSegments.length > 0) {
						const segmentIds = allSegments.map((s) => s.id);

						const [constraintLinksResult, generatorLinksResult] = await Promise.all([
							supabase.from("constraint_segment_links").select("*").in("segment_id", segmentIds),
							supabase.from("generator_segment_links").select("*").in("segment_id", segmentIds),
						]);

						allConstraintLinks = constraintLinksResult.data || [];
						allGeneratorLinks = generatorLinksResult.data || [];
					}
				}

				// Duplicate segments first
				interface NewSegment {
					id: string;
					length: number;
					label?: string;
				}

				const newSegments: NewSegment[] = [];
				for (const segment of allSegments) {
					const newSegmentId = uuidv4();
					segmentIdMap.set(segment.id, newSegmentId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id, created_at, updated_at, ...segmentData } = segment;
					newSegments.push({ id: newSegmentId, ...segmentData });
				}

				if (newSegments.length > 0) {
					const { error } = await supabase.from("segments").insert(newSegments);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate segments: ${error.message}`);
					}
				}

				// Duplicate constraints
				interface NewConstraint {
					id: string;
					program_id: string;
					key?: string;
					label?: string;
				}
				const newConstraints: NewConstraint[] = [];
				for (const constraint of originalConstraints) {
					const newConstraintId = uuidv4();
					constraintIdMap.set(constraint.id, newConstraintId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id, created_at, updated_at, program_id, ...constraintData } = constraint;
					newConstraints.push({ id: newConstraintId, program_id: newProgramId, ...constraintData });
				}

				if (newConstraints.length > 0) {
					const { error } = await supabase.from("constraints").insert(newConstraints);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate constraints: ${error.message}`);
					}
				}

				// Duplicate generators
				interface NewGenerator {
					id: string;
					program_id: string;
					key?: string;
					label?: string;
				}
				const newGenerators: NewGenerator[] = [];
				for (const generator of originalGenerators) {
					const newGeneratorId = uuidv4();
					generatorIdMap.set(generator.id, newGeneratorId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id, created_at, updated_at, program_id, ...generatorData } = generator;
					newGenerators.push({ id: newGeneratorId, program_id: newProgramId, ...generatorData });
				}

				if (newGenerators.length > 0) {
					const { error } = await supabase.from("generators").insert(newGenerators);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate generators: ${error.message}`);
					}
				}

				// Duplicate constructs
				interface NewConstruct {
					id: string;
					program_id: string;
				}
				const newConstructs: NewConstruct[] = [];
				for (const construct of originalConstructs) {
					const newConstructId = uuidv4();
					constructIdMap.set(construct.id, newConstructId);
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { id, created_at, updated_at, program_id, output_id, ...constructData } = construct;
					newConstructs.push({ id: newConstructId, program_id: newProgramId, ...constructData });
				}

				if (newConstructs.length > 0) {
					const { error } = await supabase.from("constructs").insert(newConstructs);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate constructs: ${error.message}`);
					}
				}

				// Duplicate construct-segment orders
				interface NewSegmentOrder {
					construct_id: string;
					segment_id: string;
					order_idx: number;
				}
				const newSegmentOrders: NewSegmentOrder[] = [];
				for (const order of allSegmentOrders) {
					const newConstructId = constructIdMap.get(order.construct_id);
					const newSegmentId = segmentIdMap.get(order.segment_id);

					if (newConstructId && newSegmentId) {
						newSegmentOrders.push({
							construct_id: newConstructId,
							segment_id: newSegmentId,
							order_idx: order.order_idx,
						});
					}
				}

				if (newSegmentOrders.length > 0) {
					const { error } = await supabase.from("construct_segment_order").insert(newSegmentOrders);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate construct segment orders: ${error.message}`);
					}
				}

				// Duplicate constraint-segment links
				interface NewConstraintLink {
					constraint_id: string;
					segment_id: string;
				}
				const newConstraintLinks: NewConstraintLink[] = [];
				for (const link of allConstraintLinks) {
					if (link.constraint_id) {
						const newConstraintId = constraintIdMap.get(link.constraint_id);
						const newSegmentId = segmentIdMap.get(link.segment_id);

						if (newConstraintId && newSegmentId) {
							newConstraintLinks.push({
								constraint_id: newConstraintId,
								segment_id: newSegmentId,
							});
						}
					}
				}

				if (newConstraintLinks.length > 0) {
					const { error } = await supabase.from("constraint_segment_links").insert(newConstraintLinks);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate constraint segment links: ${error.message}`);
					}
				}

				// Duplicate generator-segment links
				interface NewGeneratorLink {
					generator_id: string;
					segment_id: string;
				}
				const newGeneratorLinks: NewGeneratorLink[] = [];
				for (const link of allGeneratorLinks) {
					if (link.generator_id) {
						const newGeneratorId = generatorIdMap.get(link.generator_id);
						const newSegmentId = segmentIdMap.get(link.segment_id);

						if (newGeneratorId && newSegmentId) {
							newGeneratorLinks.push({
								generator_id: newGeneratorId,
								segment_id: newSegmentId,
							});
						}
					}
				}

				if (newGeneratorLinks.length > 0) {
					const { error } = await supabase.from("generator_segment_links").insert(newGeneratorLinks);
					if (error) {
						await supabase.from("projects").delete().eq("id", newProjectId);
						throw new Error(`Failed to duplicate generator segment links: ${error.message}`);
					}
				}

				console.log(`Successfully duplicated program ${originalProgram.id} to ${newProgramId} for project ${newProjectId}`);
			} else {
				console.log(`No programs found in original project ${originalProjectId}. Creating a default initial program for duplicated project ${newProjectId}.`);
				// create a default initial program for the new project
				const now = new Date().toISOString();
				const initialProgramPayload = {
					project_id: newProjectId,
					created_at: now,
				};
				const { data: newProgramData, error: programError } = await supabase.from("programs").insert(initialProgramPayload).select().single();
				if (programError) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error(`Failed to create initial program for duplicated project: ${programError.message}`);
				}
				if (!newProgramData) {
					await supabase.from("projects").delete().eq("id", newProjectId);
					throw new Error("Failed to create initial program for duplicated project, no data returned.");
				}
				newProgramIdForDuplication = (newProgramData as SupabaseProgram).id;
				console.log(`Created default initial program ${newProgramIdForDuplication} for duplicated project ${newProjectId}.`);
			}

			return { duplicatedProject: duplicatedProjectJSON, newProgramId: newProgramIdForDuplication };
		},
		[supabase]
	);

	// --- Public API ---

	const fetchProjects = useCallback(async () => {
		try {
			const fetchedProjects = await _fetchProjectsFromDB();
			const sortedProjects = sortProjects(fetchedProjects);
			setProjects(sortedProjects);

			if (sortedProjects.length > 0) {
				const currentStillExists = currentProject && sortedProjects.some((p) => p.id === currentProject.id);
				if (!currentStillExists || !currentProject) {
					setCurrentProject(sortedProjects[0]);
				}
			} else {
				setCurrentProject(null);
			}
			console.log("Projects fetched and state updated. Current project:", currentProject?.id ?? "None");
		} catch (err: unknown) {
			console.error("Error in fetchProjects:", err);
			setProjects([]);
			setCurrentProject(null);
		}
	}, [_fetchProjectsFromDB, currentProject, setCurrentProject]);

	const createNewProject = useCallback(async () => {
		console.log("Creating new project and initial program...");
		try {
			const { project: newProjectJson, initialProgram } = await _createProjectInDB();
			const newProject = mapProjectJsonToProject(newProjectJson);

			setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
			setCurrentProject(newProject);

			console.log(`New project ${newProject.id} and initial program ${initialProgram.id} created successfully.`);
		} catch (err: unknown) {
			console.error("Error creating new project:", err);
		}
	}, [_createProjectInDB, setProjects, setCurrentProject]);

	const deleteProject = useCallback(
		async (projectId: string) => {
			console.log(`Deleting project: ${projectId}...`);
			try {
				await _deleteProjectFromDB(projectId);

				// update local state
				let nextCurrentProject: Project | null = null;
				const remainingProjects = projects.filter((p) => p.id !== projectId);

				if (remainingProjects.length > 0) {
					if (currentProject?.id === projectId) {
						nextCurrentProject = remainingProjects[0];
					} else {
						nextCurrentProject = currentProject;
					}
				} else {
					nextCurrentProject = null;
				}

				setProjects(remainingProjects);
				setCurrentProject(nextCurrentProject);

				console.log(`Project ${projectId} deleted successfully. Current project set to: ${nextCurrentProject?.id ?? "None"}`);
			} catch (err: unknown) {
				console.error("Error deleting project:", err);
			}
		},
		[_deleteProjectFromDB, projects, currentProject, setProjects, setCurrentProject]
	);

	const duplicateProject = useCallback(
		async (projectId: string) => {
			console.log(`Attempting to duplicate project: ${projectId}...`);
			try {
				const { duplicatedProject: dupProjectJson, newProgramId } = await _duplicateProjectInDB(projectId);
				const duplicatedProject = mapProjectJsonToProject(dupProjectJson);
				setProjects((prevProjects) => sortProjects([duplicatedProject, ...prevProjects]));
				setCurrentProject(duplicatedProject);
				console.log(`Project ${duplicatedProject.id} duplicated successfully. ${newProgramId ? `New program ${newProgramId} created.` : "No program was duplicated."}`);
			} catch (err: unknown) {
				console.error("Error duplicating project:", err);
				// TODO: add user-facing error message
			}
		},
		[_duplicateProjectInDB, setProjects, setCurrentProject]
	);

	// --- Effects ---

	useEffect(() => {
		fetchProjects();
	}, [fetchProjects]);

	return (
		<GlobalContext.Provider
			value={{
				mode,
				setMode,
				projects,
				currentProject,
				setCurrentProject,
				fetchProjects,
				createNewProject,
				deleteProject,
				duplicateProject,
			}}
		>
			{children}
		</GlobalContext.Provider>
	);
}

export function useGlobal() {
	const context = useContext(GlobalContext);
	if (context === undefined) {
		throw new Error("useGlobal must be used within a GlobalProvider");
	}
	return context;
}
