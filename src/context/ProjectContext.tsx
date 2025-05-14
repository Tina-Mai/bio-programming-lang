import React, { createContext, useCallback, useContext, ReactNode, useEffect, useState } from "react";
import { SupabaseProgram } from "@/lib/utils";
import { useGlobal } from "./GlobalContext";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { ProgramProvider, useProgram } from "./ProgramContext";

interface ProjectContextProps {
	currentProgram: SupabaseProgram | null;
	setCurrentProgramById: (programId: string) => void;
	isLoadingProjectPrograms: boolean;
	projectProgramsError: string | null;
	projectPrograms: SupabaseProgram[];
	refreshPrograms: () => void;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject, updateProjectTimestamp } = useGlobal();

	const [currentProgram, setCurrentProgram] = useState<SupabaseProgram | null>(null);

	const [isLoadingProjectPrograms, setIsLoadingProjectPrograms] = useState<boolean>(false);
	const [projectProgramsError, setProjectProgramsError] = useState<string | null>(null);
	const [projectPrograms, setProjectPrograms] = useState<SupabaseProgram[]>([]);

	const supabase: SupabaseClient = createClient();

	const handleProgramModified = useCallback(
		async (programId: string, modificationTimestamp: Date) => {
			const { error: programUpdateError } = await supabase.from("programs").update({ updated_at: modificationTimestamp.toISOString() }).eq("id", programId);

			if (programUpdateError) {
				console.warn(`Failed to update program updated_at timestamp: ${programUpdateError.message}`);
			} else {
				setCurrentProgram((prev) => (prev?.id === programId ? { ...prev, updated_at: modificationTimestamp.toISOString() } : prev));
				setProjectPrograms((prevs) => prevs.map((p) => (p.id === programId ? { ...p, updated_at: modificationTimestamp.toISOString() } : p)));
			}

			if (currentProject?.id) {
				updateProjectTimestamp(currentProject.id, modificationTimestamp);
			}
		},
		[supabase, updateProjectTimestamp, currentProject?.id]
	);

	const fetchProjectPrograms = useCallback(async () => {
		if (!currentProject?.id) {
			setCurrentProgram(null);
			setProjectPrograms([]);
			setIsLoadingProjectPrograms(false);
			setProjectProgramsError(null);
			console.log("No current project ID, clearing program list and current program.");
			return;
		}

		console.log(`Fetching programs for project ID: ${currentProject.id}`);
		setIsLoadingProjectPrograms(true);
		setProjectProgramsError(null);
		setCurrentProgram(null);
		setProjectPrograms([]);

		try {
			const projectId = currentProject.id;
			const { data: programsData, error: programsError } = await supabase
				.from("programs")
				.select("*")
				.eq("project_id", projectId)
				.order("updated_at", { ascending: false })
				.order("created_at", { ascending: false });

			if (programsError) throw new Error(`Supabase fetch error (programs): ${programsError.message}`);

			if (!programsData || programsData.length === 0) {
				console.log(`No programs found for project ${projectId}.`);
				setCurrentProgram(null);
				setProjectPrograms([]);
				setIsLoadingProjectPrograms(false);
				return;
			}

			const fetchedPrograms = programsData as SupabaseProgram[];
			setProjectPrograms(fetchedPrograms);

			if (fetchedPrograms.length > 0) {
				const latestProgram = fetchedPrograms[0];
				setCurrentProgram(latestProgram);
				console.log(`Set current program to ID: ${latestProgram.id} (updated: ${latestProgram.updated_at})`);
			} else {
				setCurrentProgram(null);
			}
		} catch (error: unknown) {
			console.error("Error fetching project programs:", error);
			const message = error instanceof Error ? error.message : "An unknown error occurred";
			setProjectProgramsError(`Failed to load project programs: ${message}`);
			setCurrentProgram(null);
			setProjectPrograms([]);
		} finally {
			setIsLoadingProjectPrograms(false);
		}
	}, [currentProject?.id, supabase, updateProjectTimestamp]);

	useEffect(() => {
		fetchProjectPrograms();
	}, [currentProject?.id, fetchProjectPrograms]);

	const setCurrentProgramById = useCallback(
		(programId: string) => {
			const programToSet = projectPrograms.find((p) => p.id === programId);
			if (programToSet) {
				setCurrentProgram(programToSet);
			} else {
				console.warn(`Program with ID ${programId} not found in project programs list.`);
			}
		},
		[projectPrograms]
	);

	const value: ProjectContextProps = {
		currentProgram,
		setCurrentProgramById,
		isLoadingProjectPrograms,
		projectProgramsError,
		projectPrograms,
		refreshPrograms: fetchProjectPrograms,
	};

	return (
		<ProjectContext.Provider value={value}>
			{currentProject && (
				<ProgramProvider currentProgram={currentProgram} currentProjectId={currentProject.id} onProgramModified={handleProgramModified}>
					{children}
				</ProgramProvider>
			)}
			{!currentProject && children}
		</ProjectContext.Provider>
	);
};

export const useProject = (): ProjectContextProps => {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error("useProject must be used within a ProjectProvider");
	}
	return context;
};

export { useProgram };
