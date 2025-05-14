import React, { createContext, useCallback, useContext, ReactNode, useEffect, useState } from "react";
import { SupabaseProgram, SupabaseDBOutput, parseOutputMetadata } from "@/lib/utils/program";
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

			const hydratedPrograms = await Promise.all(
				fetchedPrograms.map(async (program) => {
					if (program.output && typeof program.output === "string") {
						const outputId = program.output;
						const { data: outputData, error: outputError } = await supabase.from("outputs").select("*, program_id, created_at, updated_at").eq("id", outputId).single();

						if (outputError) {
							console.error(`Failed to fetch output details for program ${program.id}, output ID ${outputId}:`, outputError.message);
							return { ...program, output: undefined }; // Set to undefined on error
						}

						if (outputData) {
							const parsedMeta = parseOutputMetadata(outputData.metadata as Record<string, unknown>);
							const fullOutput: SupabaseDBOutput = {
								id: outputData.id,
								program_id: outputData.program_id,
								metadata: parsedMeta,
								created_at: outputData.created_at,
								updated_at: outputData.updated_at,
							};
							return { ...program, output: fullOutput };
						}
						// If outputData is null/undefined (but no error), means output ID didn't match any row
						return { ...program, output: undefined }; // Set to undefined if no data found
					}
					// If program.output was not a string ID, or was already null/undefined, return as is.
					// This also handles cases where program.output might already be a SupabaseDBOutput object.
					return program;
				})
			);

			setProjectPrograms(hydratedPrograms as SupabaseProgram[]); // Assert type after mapping

			if (hydratedPrograms.length === 0) {
				setCurrentProgram(null);
			} else {
				let programToSet: SupabaseProgram | undefined = undefined;
				if (programIdToTryAndPreserve) {
					// Ensure we are finding from the correctly typed array
					programToSet = (hydratedPrograms as SupabaseProgram[]).find((p) => p.id === programIdToTryAndPreserve);
				}

				if (programToSet) {
					setCurrentProgram(programToSet);
				} else {
					// Ensure we are picking from the correctly typed array
					const latestProgram = (hydratedPrograms as SupabaseProgram[])[0];
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
	}, [currentProject?.id, supabase]);

	const handleProgramModified = useCallback(
		async (updatedProgramWithFullOutput?: SupabaseProgram) => {
			await fetchProjectPrograms();

			if (updatedProgramWithFullOutput?.output && typeof updatedProgramWithFullOutput.output === "object") {
				setCurrentProgram((prevProgramFromFetch) => {
					if (prevProgramFromFetch && prevProgramFromFetch.id === updatedProgramWithFullOutput.id) {
						return updatedProgramWithFullOutput;
					}
					return prevProgramFromFetch;
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
