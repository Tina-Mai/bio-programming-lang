import React, { createContext, useCallback, useContext, ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import {
	SupabaseProgram,
	SupabaseConstruct,
	SupabaseConstraint,
	SupabaseGenerator,
	SupabaseConstructSegmentOrder,
	SupabaseConstraintSegmentLink,
	SupabaseGeneratorSegmentLink,
	transformConstructWithSegments,
	transformConstraintWithSegments,
	transformGeneratorWithSegments,
} from "@/lib/utils/program";
import { Construct, ConstraintInstance, GeneratorInstance, Segment } from "@/types";
import { createConstruct as dbCreateConstruct, createSegment as dbCreateSegment, deleteSegment as dbDeleteSegment } from "@/lib/utils/database";

interface ProgramProviderProps {
	children: ReactNode;
	currentProgram: SupabaseProgram | null;
	currentProjectId: string | undefined;
	onProgramModified: (updatedProgram?: SupabaseProgram) => Promise<void>;
}

interface ProgramContextProps {
	constructs: Construct[];
	constraints: ConstraintInstance[];
	generators: GeneratorInstance[];
	isLoading: boolean;
	error: string | null;
	refreshProgramData: () => Promise<void>;
	reorderSegments: (constructId: string, segmentIds: string[]) => Promise<void>;
	updateSegmentLength: (segmentId: string, newLength: number) => Promise<void>;
	createConstruct: () => Promise<void>;
	createSegment: (constructId: string) => Promise<void>;
	deleteSegment: (segmentId: string) => Promise<void>;
	updateConstraintKey: (constraintId: string, newKey: string) => Promise<void>;
	updateGeneratorForSegment: (segmentId: string, newKey: string) => Promise<void>;
}

const ProgramContext = createContext<ProgramContextProps | undefined>(undefined);

export const ProgramProvider = ({ children, currentProgram }: ProgramProviderProps) => {
	const [constructs, setConstructs] = useState<Construct[]>([]);
	const [constraints, setConstraints] = useState<ConstraintInstance[]>([]);
	const [generators, setGenerators] = useState<GeneratorInstance[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const supabase: SupabaseClient = createClient();

	const fetchProgramData = useCallback(async () => {
		if (!currentProgram?.id) {
			setConstructs([]);
			setConstraints([]);
			setGenerators([]);
			setIsLoading(false);
			setError(null);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const programId = currentProgram.id;
			console.log(`ProgramProvider: Fetching data for program ID: ${programId}`);

			// fetch constructs, constraints, and generators
			const [constructsResult, constraintsResult, generatorsResult] = await Promise.all([
				supabase.from("constructs").select("*").eq("program_id", programId),
				supabase.from("constraints").select("*").eq("program_id", programId),
				supabase.from("generators").select("*").eq("program_id", programId),
			]);

			if (constructsResult.error) throw new Error(`Failed to fetch constructs: ${constructsResult.error.message}`);
			if (constraintsResult.error) throw new Error(`Failed to fetch constraints: ${constraintsResult.error.message}`);
			if (generatorsResult.error) throw new Error(`Failed to fetch generators: ${generatorsResult.error.message}`);

			const fetchedConstructs = (constructsResult.data as SupabaseConstruct[]) || [];
			const fetchedConstraints = (constraintsResult.data as SupabaseConstraint[]) || [];
			const fetchedGenerators = (generatorsResult.data as SupabaseGenerator[]) || [];

			// fetch segment data for constructs
			let segmentOrders: SupabaseConstructSegmentOrder[] = [];
			if (fetchedConstructs.length > 0) {
				const constructIds = fetchedConstructs.map((c) => c.id);
				const { data: orderData, error: orderError } = await supabase
					.from("construct_segment_order")
					.select("*, segments!inner(*)")
					.in("construct_id", constructIds)
					.order("order_idx", { ascending: true });

				if (orderError) throw new Error(`Failed to fetch segment orders: ${orderError.message}`);
				segmentOrders = orderData || [];
				console.log("Fetched segment orders:", segmentOrders);
			}

			// fetch constraint and generator segment links
			let constraintLinks: SupabaseConstraintSegmentLink[] = [];
			let generatorLinks: SupabaseGeneratorSegmentLink[] = [];

			if (fetchedConstraints.length > 0) {
				const constraintIds = fetchedConstraints.map((c) => c.id);
				const { data: linkData, error: linkError } = await supabase.from("constraint_segment_links").select("*").in("constraint_id", constraintIds);

				if (linkError) throw new Error(`Failed to fetch constraint links: ${linkError.message}`);
				constraintLinks = linkData || [];
			}

			if (fetchedGenerators.length > 0) {
				const generatorIds = fetchedGenerators.map((g) => g.id);
				const { data: linkData, error: linkError } = await supabase.from("generator_segment_links").select("*").in("generator_id", generatorIds);

				if (linkError) throw new Error(`Failed to fetch generator links: ${linkError.message}`);
				generatorLinks = linkData || [];
			}

			// transform the data
			const transformedConstructs = fetchedConstructs.map((construct) => transformConstructWithSegments(construct, segmentOrders));
			const transformedConstraints = fetchedConstraints.map((constraint) => transformConstraintWithSegments(constraint, constraintLinks));
			const transformedGenerators = fetchedGenerators.map((generator) => transformGeneratorWithSegments(generator, generatorLinks));
			console.log("Transformed constructs:", transformedConstructs);
			setConstructs(transformedConstructs);
			setConstraints(transformedConstraints);
			setGenerators(transformedGenerators);
		} catch (error: unknown) {
			console.error("ProgramProvider: Error fetching program data:", error);
			setError(error instanceof Error ? error.message : "An unknown error occurred");
			setConstructs([]);
			setConstraints([]);
			setGenerators([]);
		} finally {
			setIsLoading(false);
		}
	}, [currentProgram, supabase]);

	const updateConstraintKey = useCallback(
		async (constraintId: string, newKey: string) => {
			const originalConstraints = constraints;

			// Optimistic update
			setConstraints((prevConstraints) => prevConstraints.map((c) => (c.id === constraintId ? { ...c, key: newKey } : c)));

			try {
				const response = await fetch(`/api/constraints/${constraintId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ key: newKey }),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to update constraint key");
				}
			} catch (err) {
				setConstraints(originalConstraints);
				console.error("Error updating constraint key:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to update constraint key";
				setError(errorMessage);
				throw err;
			}
		},
		[constraints]
	);

	const updateGeneratorForSegment = useCallback(
		async (segmentId: string, newKey: string) => {
			if (!currentProgram?.id) {
				throw new Error("Cannot update generator without a program");
			}

			const originalGenerators = generators;
			const oldGenerator = originalGenerators.find((g) => g.segments.includes(segmentId));
			if (!oldGenerator) {
				console.error(`Could not find a generator instance for segment ${segmentId}`);
				return;
			}

			// Optimistic update
			const newTempId = `temp-${Date.now()}`;
			setGenerators((prev) => {
				const updatedGenerators = prev.map((g) => {
					if (g.id === oldGenerator.id) {
						// Remove segment from old generator
						return { ...g, segments: g.segments.filter((s) => s !== segmentId) };
					}
					return g;
				});

				// Add new generator optimistically
				updatedGenerators.push({
					id: newTempId,
					program_id: currentProgram.id,
					key: newKey,
					label: newKey,
					created_at: new Date().toISOString(),
					segments: [segmentId],
				});
				return updatedGenerators;
			});

			try {
				// 1. Create a new generator instance
				const { data: newGenerator, error: createError } = await supabase.from("generators").insert({ program_id: currentProgram.id, key: newKey, label: newKey }).select().single();

				if (createError) throw new Error(`Failed to create new generator: ${createError.message}`);

				// 2. Remove the link from the old generator to this segment
				const { error: deleteLinkError } = await supabase.from("generator_segment_links").delete().match({ generator_id: oldGenerator.id, segment_id: segmentId });

				if (deleteLinkError) throw new Error(`Failed to unlink old generator: ${deleteLinkError.message}`);

				// 3. Link the new generator to the segment
				const { error: createLinkError } = await supabase.from("generator_segment_links").insert({ generator_id: newGenerator.id, segment_id: segmentId });

				if (createLinkError) throw new Error(`Failed to link new generator: ${createLinkError.message}`);

				// 4. If the old generator has no more segments, delete it
				const { data: remainingLinks, error: checkError } = await supabase.from("generator_segment_links").select("segment_id").eq("generator_id", oldGenerator.id);

				if (checkError) {
					console.warn(`Could not check for orphaned generator: ${checkError.message}`);
				} else if (remainingLinks && remainingLinks.length === 0) {
					const { error: deleteGenError } = await supabase.from("generators").delete().eq("id", oldGenerator.id);
					if (deleteGenError) console.warn(`Failed to delete orphaned generator: ${deleteGenError.message}`);
				}

				await fetchProgramData();
			} catch (err) {
				setGenerators(originalGenerators);
				console.error("Error updating generator for segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to update generator for segment";
				setError(errorMessage);
				throw err;
			}
		},
		[generators, currentProgram, supabase, fetchProgramData]
	);

	const reorderSegments = useCallback(
		async (constructId: string, segmentIds: string[]) => {
			const originalConstructs = constructs;

			setConstructs((prevConstructs) =>
				prevConstructs.map((c) => {
					if (c.id === constructId && c.segments) {
						const constructToUpdate = { ...c };
						const segmentMap = new Map(c.segments.map((s) => [s.id, s]));
						const reorderedSegments = segmentIds.map((id) => segmentMap.get(id)).filter((s): s is Segment => !!s);

						if (reorderedSegments.length === segmentIds.length) {
							constructToUpdate.segments = reorderedSegments;
						} else {
							console.error("Segment ID mismatch during optimistic reorder.");
						}
						return constructToUpdate;
					}
					return c;
				})
			);

			try {
				const { error } = await supabase.rpc("reorder_segments", {
					p_construct_id: constructId,
					p_segment_ids: segmentIds,
				});

				if (error) {
					throw new Error(`Failed to reorder segments: ${error.message}`);
				}
			} catch (err) {
				setConstructs(originalConstructs);
				console.error("Error reordering segments:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to reorder segments";
				setError(errorMessage);
				throw err;
			}
		},
		[constructs, supabase]
	);

	const updateSegmentLength = useCallback(
		async (segmentId: string, newLength: number) => {
			const originalConstructs = constructs;

			// optimistic update
			setConstructs((prevConstructs) =>
				prevConstructs.map((c) => ({
					...c,
					segments: c.segments ? c.segments.map((s) => (s.id === segmentId ? { ...s, length: newLength } : s)) : [],
				}))
			);

			try {
				const { error } = await supabase.from("segments").update({ length: newLength }).eq("id", segmentId);

				if (error) {
					throw new Error(`Failed to update segment length: ${error.message}`);
				}
			} catch (err) {
				setConstructs(originalConstructs);
				console.error("Error updating segment length:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to update segment length";
				setError(errorMessage);
				throw err;
			}
		},
		[constructs, supabase]
	);

	const createConstruct = useCallback(async () => {
		if (!currentProgram?.id) {
			throw new Error("No current program to add construct to");
		}

		try {
			const newConstruct = await dbCreateConstruct(supabase, currentProgram.id);
			console.log("Successfully created new construct:", newConstruct.id);
			await fetchProgramData();
		} catch (err) {
			console.error("Error creating construct:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to create construct";
			setError(errorMessage);
			throw err;
		}
	}, [currentProgram, supabase, fetchProgramData]);

	const createSegment = useCallback(
		async (constructId: string) => {
			if (!currentProgram?.id) {
				throw new Error("No current program to add segment to");
			}

			try {
				const newSegment = await dbCreateSegment(supabase, constructId);
				console.log("Successfully created new segment for construct:", constructId);
				setConstructs((prevConstructs) =>
					prevConstructs.map((c) => {
						if (c.id === constructId) {
							return {
								...c,
								segments: c.segments ? [...c.segments, newSegment] : [newSegment],
							};
						}
						return c;
					})
				);
			} catch (err) {
				console.error("Error creating segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to create segment";
				setError(errorMessage);
				throw err;
			}
		},
		[currentProgram, supabase]
	);

	const deleteSegment = useCallback(
		async (segmentId: string) => {
			const originalConstructs = constructs;
			setConstructs((prevConstructs) =>
				prevConstructs.map((c) => ({
					...c,
					segments: c.segments ? c.segments.filter((s) => s.id !== segmentId) : [],
				}))
			);
			try {
				await dbDeleteSegment(supabase, segmentId);
				console.log("Successfully deleted segment:", segmentId);
			} catch (err) {
				setConstructs(originalConstructs);
				console.error("Error deleting segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to delete segment";
				setError(errorMessage);
				throw err;
			}
		},
		[supabase, constructs]
	);

	// fetch data when program changes
	useEffect(() => {
		fetchProgramData();
	}, [fetchProgramData]);

	const value: ProgramContextProps = {
		constructs,
		constraints,
		generators,
		isLoading,
		error,
		refreshProgramData: fetchProgramData,
		reorderSegments,
		updateSegmentLength,
		createConstruct,
		createSegment,
		deleteSegment,
		updateConstraintKey,
		updateGeneratorForSegment,
	};

	return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
};

export const useProgram = (): ProgramContextProps => {
	const context = useContext(ProgramContext);
	if (!context) {
		throw new Error("useProgram must be used within a ProgramProvider");
	}
	return context;
};
