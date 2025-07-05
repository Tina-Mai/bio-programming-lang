import React, { createContext, useCallback, useContext, ReactNode, useEffect, useState } from "react";
import { SupabaseProgram } from "@/lib/utils/program";
import { useGlobal } from "./GlobalContext";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { ProgramProvider, useProgram } from "./ProgramContext";
import { createProgram as dbCreateProgram } from "@/lib/utils/database";

interface ProjectContextProps {
	currentProgram: SupabaseProgram | null;
	setCurrentProgramById: (programId: string) => void;
	isLoadingProjectPrograms: boolean;
	projectProgramsError: string | null;
	projectPrograms: SupabaseProgram[];
	refreshPrograms: () => void;
	createProgram: () => Promise<SupabaseProgram>;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject } = useGlobal();
	const [currentProgram, setCurrentProgram] = useState<SupabaseProgram | null>(null);
	const [isLoadingProjectPrograms, setIsLoadingProjectPrograms] = useState<boolean>(false);
	const [projectProgramsError, setProjectProgramsError] = useState<string | null>(null);
	const [projectPrograms, setProjectPrograms] = useState<SupabaseProgram[]>([]);

	const supabase: SupabaseClient = createClient();

	const fetchProjectPrograms = useCallback(async () => {
		const programIdToTryAndPreserve = currentProgram?.id;

		if (!currentProject?.id) {
			setCurrentProgram(null);
			setProjectPrograms([]);
			setIsLoadingProjectPrograms(false);
			setProjectProgramsError(null);
			return;
		}

		setIsLoadingProjectPrograms(true);
		setProjectProgramsError(null);

		try {
			const projectId = currentProject.id;
			const { data: programsData, error: programsError } = await supabase
				.from("programs")
				.select("*")
				.eq("project_id", projectId)
				.order("updated_at", { ascending: false })
				.order("created_at", { ascending: false });

			if (programsError) throw new Error(`Supabase fetch error (programs): ${programsError.message}`);

			const fetchedPrograms = (programsData as SupabaseProgram[]) || [];

			setProjectPrograms(fetchedPrograms);

			if (fetchedPrograms.length === 0) {
				setCurrentProgram(null);
			} else {
				let programToSet: SupabaseProgram | undefined = undefined;
				if (programIdToTryAndPreserve) {
					programToSet = fetchedPrograms.find((p) => p.id === programIdToTryAndPreserve);
				}

				if (programToSet) {
					setCurrentProgram(programToSet);
				} else {
					const latestProgram = fetchedPrograms[0];
					setCurrentProgram(latestProgram);
				}
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "An unknown error occurred";
			setProjectProgramsError(`Failed to load project programs: ${message}`);
			setCurrentProgram(null);
			setProjectPrograms([]);
		} finally {
			setIsLoadingProjectPrograms(false);
		}
	}, [currentProject?.id, supabase, currentProgram?.id]);

	const handleProgramModified = useCallback(
		async (updatedProgram?: SupabaseProgram) => {
			await fetchProjectPrograms();

			if (updatedProgram) {
				setCurrentProgram((prevProgram) => {
					if (prevProgram && prevProgram.id === updatedProgram.id) {
						return updatedProgram;
					}
					return prevProgram;
				});
			}
		},
		[fetchProjectPrograms]
	);

	useEffect(() => {
		if (currentProject?.id) {
			fetchProjectPrograms();
		} else {
			setCurrentProgram(null);
			setProjectPrograms([]);
			setIsLoadingProjectPrograms(false);
			setProjectProgramsError(null);
		}
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

	const createProgram = useCallback(async (): Promise<SupabaseProgram> => {
		if (!currentProject?.id) {
			throw new Error("No current project to create program for");
		}

		try {
			const result = await dbCreateProgram(supabase, currentProject.id);

			await fetchProjectPrograms();

			return result.program;
		} catch (error) {
			console.error("Error creating program:", error);
			throw error;
		}
	}, [currentProject, supabase, fetchProjectPrograms]);

	const value: ProjectContextProps = {
		currentProgram,
		setCurrentProgramById,
		isLoadingProjectPrograms,
		projectProgramsError,
		projectPrograms,
		refreshPrograms: fetchProjectPrograms,
		createProgram,
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
