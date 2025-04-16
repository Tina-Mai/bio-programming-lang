"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Project, ProjectJSON, ProgramNode } from "@/types";
import { v4 as uuidv4 } from "uuid";

type Mode = "blocks" | "code";

// convert ProjectJSON to Project
const mapProjectJsonToProject = (p: ProjectJSON): Project => ({
	id: p.id,
	name: p.name,
	createdAt: new Date(p.createdAt),
	updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt),
});

// sort projects
const sortProjects = (projects: Project[]): Project[] => {
	// TODO: remove sorting for now because it's not working :(
	// return [...projects].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	return projects;
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
	updateProjectTimestamp: (projectId: string, newTimestamp: Date) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<Mode>("blocks");
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

	const _createProjectInDB = useCallback(async (): Promise<{ project: ProjectJSON; program: ProgramNode | null }> => {
		// 1. Determine the next available project name
		const baseName = "New design";
		let finalName = baseName;
		let counter = 1; // Start checking from "New design 2" if "New design" exists

		// Fetch existing names like "New design", "New design 2", ...
		const { data: existingProjects, error: fetchError } = await supabase.from("projects").select("name").like("name", `${baseName}%`);

		if (fetchError) {
			console.error("Error fetching existing project names:", fetchError);
			throw fetchError; // Propagate the error
		}

		if (existingProjects && existingProjects.length > 0) {
			const existingNames = new Set(existingProjects.map((p) => p.name));

			// Check if the base name itself exists
			if (existingNames.has(baseName)) {
				counter = 2; // Start checking from "New design 2"
				while (existingNames.has(`${baseName} ${counter}`)) {
					counter++;
				}
				finalName = `${baseName} ${counter}`;
			}
			// If baseName doesn't exist, finalName remains baseName
		}
		// If no projects starting with baseName exist, finalName remains baseName

		console.log(`Creating new project in DB with name: "${finalName}"`);

		// 2. create project entry with the unique name
		const { data: newProjectData, error: projectError } = await supabase
			.from("projects")
			.insert({ name: finalName }) // Use the determined finalName
			.select()
			.single();

		if (projectError) throw projectError;
		if (!newProjectData) throw new Error("Failed to create project, no data returned.");

		// 3. create default program entry
		const defaultProgram: ProgramNode = { id: uuidv4(), children: [], constraints: [] };
		const { error: programError } = await supabase.from("programs").insert({
			project_id: newProjectData.id,
			program: defaultProgram,
		});

		if (programError) {
			console.error("Error creating program, attempting to roll back project creation:", programError);
			await supabase.from("projects").delete().eq("id", newProjectData.id); // Rollback
			throw programError;
		}

		return { project: newProjectData, program: defaultProgram };
	}, [supabase]);

	const _deleteProjectFromDB = useCallback(
		async (projectId: string): Promise<void> => {
			console.log(`Deleting project from DB: ${projectId}...`);
			// 1. delete associated program (handle potential non-existence gracefully)
			const { error: programError } = await supabase.from("programs").delete().eq("project_id", projectId);
			if (programError && programError.code !== "PGRST204") {
				// PGRST204: No rows found - this is okay
				throw new Error(`Failed to delete associated program: ${programError.message}`);
			}

			// 2. delete project
			const { error: projectError } = await supabase.from("projects").delete().eq("id", projectId);
			if (projectError) throw projectError;
		},
		[supabase]
	);

	const _duplicateProjectInDB = useCallback(
		async (projectId: string): Promise<{ duplicatedProject: ProjectJSON; duplicatedProgram: ProgramNode | null }> => {
			console.log(`Duplicating project in DB: ${projectId}...`);
			// 1. fetch original project & program
			const { data: originalProjectData, error: fetchProjectError } = await supabase.from("projects").select("name").eq("id", projectId).single();
			if (fetchProjectError) throw new Error(`Failed to fetch original project: ${fetchProjectError.message}`);
			if (!originalProjectData) throw new Error("Original project not found.");

			const { data: originalProgramData, error: fetchProgramError } = await supabase.from("programs").select("program").eq("project_id", projectId).maybeSingle();
			if (fetchProgramError) throw new Error(`Failed to fetch original program: ${fetchProgramError.message}`);
			const originalProgram = originalProgramData?.program || { id: uuidv4(), children: [], constraints: [] }; // Use default if none exists

			// 2. create new project
			const newProjectName = `(Copy) ${originalProjectData.name}`;
			const { data: newProjectData, error: createProjectError } = await supabase.from("projects").insert({ name: newProjectName }).select().single();
			if (createProjectError) throw createProjectError;
			if (!newProjectData) throw new Error("Failed to create duplicated project, no data returned.");

			// 3. create new program
			const { error: createProgramError } = await supabase.from("programs").insert({
				project_id: newProjectData.id,
				program: originalProgram,
			});

			if (createProgramError) {
				console.error("Error creating duplicated program, rolling back duplicated project:", createProgramError);
				await supabase.from("projects").delete().eq("id", newProjectData.id); // Rollback
				throw createProgramError;
			}

			return { duplicatedProject: newProjectData, duplicatedProgram: originalProgram };
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
				// determine the next current project
				const currentStillExists = currentProject && sortedProjects.some((p) => p.id === currentProject.id);
				if (!currentStillExists) {
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
	}, [_fetchProjectsFromDB, currentProject]);

	const createNewProject = useCallback(async () => {
		console.log("Creating new project...");
		try {
			const { project: newProjectJson } = await _createProjectInDB();
			const newProject = mapProjectJsonToProject(newProjectJson);

			// update local state
			setProjects((prevProjects) => sortProjects([newProject, ...prevProjects]));
			setCurrentProject(newProject);

			console.log("New project created successfully:", newProject.id);
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
			console.log(`Duplicating project: ${projectId}...`);
			try {
				const { duplicatedProject: dupProjectJson } = await _duplicateProjectInDB(projectId);
				const duplicatedProject = mapProjectJsonToProject(dupProjectJson);

				// update local state
				setProjects((prevProjects) => sortProjects([duplicatedProject, ...prevProjects]));
				setCurrentProject(duplicatedProject);

				console.log("Project duplicated successfully:", duplicatedProject.id);
			} catch (err: unknown) {
				console.error("Error duplicating project:", err);
			}
		},
		[_duplicateProjectInDB, setProjects, setCurrentProject]
	);

	const updateProjectTimestamp = useCallback((projectId: string, newTimestamp: Date) => {
		setProjects((prevProjects) => {
			const updatedProjects = prevProjects.map((project) => (project.id === projectId ? { ...project, updatedAt: newTimestamp } : project));
			return sortProjects(updatedProjects);
		});
	}, []);

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
				updateProjectTimestamp,
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
