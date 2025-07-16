import React, { createContext, useCallback, useContext, ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseProgram, SupabaseConstruct, SupabaseConstraint, SupabaseConstructSegmentOrder, transformConstructWithSegments, transformConstraintWithSegments } from "@/lib/utils/program";
import { Construct, ConstraintInstance, GeneratorInstance, Segment } from "@/types";
import {
	createConstruct as dbCreateConstruct,
	createSegment as dbCreateSegment,
	deleteSegment as dbDeleteSegment,
	createConstraint as dbCreateConstraint,
	deleteConstraint as dbDeleteConstraint,
	linkConstraintToSegment as dbLinkConstraintToSegment,
	unlinkConstraintFromSegment as dbUnlinkConstraintFromSegment,
} from "@/lib/utils/database";

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
	createConstraint: () => Promise<void>;
	deleteConstraint: (constraintId: string) => Promise<void>;
	linkConstraintToSegment: (constraintId: string, segmentId: string) => Promise<void>;
	unlinkConstraintFromSegment: (constraintId: string, segmentId: string) => Promise<void>;
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
			const [constructsResult, constraintsResult] = await Promise.all([
				supabase.from("constructs").select("*").eq("program_id", programId),
				supabase.from("constraints").select("*, constraint_segment_links(segment_id)").eq("program_id", programId),
			]);

			if (constructsResult.error) throw new Error(`Failed to fetch constructs: ${constructsResult.error.message}`);
			if (constraintsResult.error) throw new Error(`Failed to fetch constraints: ${constraintsResult.error.message}`);

			const fetchedConstructs = (constructsResult.data as SupabaseConstruct[]) || [];
			const fetchedConstraints = (constraintsResult.data as SupabaseConstraint[]) || [];

			// fetch segment data for constructs
			let segmentOrders: SupabaseConstructSegmentOrder[] = [];
			if (fetchedConstructs.length > 0) {
				const constructIds = fetchedConstructs.map((c) => c.id);
				const { data: orderData, error: orderError } = await supabase
					.from("construct_segment_order")
					.select("*, segments!inner(*, generators(*))")
					.in("construct_id", constructIds)
					.order("order_idx", { ascending: true });

				if (orderError) throw new Error(`Failed to fetch segment orders: ${orderError.message}`);
				segmentOrders = orderData || [];
				console.log("Fetched segment orders:", segmentOrders);
			}

			// transform the data
			const transformedConstructs = fetchedConstructs.map((construct) => transformConstructWithSegments(construct, segmentOrders));
			const transformedConstraints = fetchedConstraints.map((constraint) => transformConstraintWithSegments(constraint));

			const allGenerators = transformedConstructs.flatMap((c) => c.segments?.map((s) => s.generator)).filter((g): g is GeneratorInstance => !!g);
			const uniqueGenerators = Array.from(new Map(allGenerators.map((g) => [g.id, g])).values());

			console.log("Transformed constructs:", transformedConstructs);
			setConstructs(transformedConstructs);
			setConstraints(transformedConstraints);
			setGenerators(uniqueGenerators);
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
			const originalConstructs = constructs;
			let originalGenerators = generators;

			let targetSegment: Segment | undefined;
			let targetConstruct: Construct | undefined;

			for (const construct of constructs) {
				const segment = construct.segments?.find((s) => s.id === segmentId);
				if (segment) {
					targetSegment = segment;
					targetConstruct = construct;
					break;
				}
			}

			if (!targetSegment || !targetConstruct) {
				throw new Error("Segment not found");
			}
			const generatorToUpdate = targetSegment.generator;
			originalGenerators = JSON.parse(JSON.stringify(generators));

			// Optimistic update
			setConstructs((prevConstructs) =>
				prevConstructs.map((c) => {
					if (c.id === targetConstruct?.id) {
						return {
							...c,
							segments: c.segments?.map((s) => {
								if (s.id === segmentId) {
									return {
										...s,
										generator: { ...s.generator, key: newKey, label: newKey },
									};
								}
								return s;
							}),
						};
					}
					return c;
				})
			);
			setGenerators((prevGens) => prevGens.map((g) => (g.id === generatorToUpdate.id ? { ...g, key: newKey, label: newKey } : g)));

			try {
				const { error } = await supabase.from("generators").update({ key: newKey, label: newKey }).eq("id", generatorToUpdate.id);

				if (error) {
					throw new Error(`Failed to update generator: ${error.message}`);
				}
			} catch (err) {
				setConstructs(originalConstructs);
				setGenerators(originalGenerators);
				console.error("Error updating generator for segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to update generator for segment";
				setError(errorMessage);
				throw err;
			}
		},
		[constructs, generators, supabase]
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

	const deleteConstraint = useCallback(
		async (constraintId: string) => {
			const originalConstraints = constraints;
			setConstraints((prev) => prev.filter((c) => c.id !== constraintId));

			try {
				await dbDeleteConstraint(supabase, constraintId);
				console.log("Successfully deleted constraint:", constraintId);
			} catch (err) {
				setConstraints(originalConstraints);
				console.error("Error deleting constraint:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to delete constraint";
				setError(errorMessage);
				throw err;
			}
		},
		[constraints, supabase]
	);

	const linkConstraintToSegment = useCallback(
		async (constraintId: string, segmentId: string) => {
			const originalConstraints = constraints;
			setConstraints((prev) =>
				prev.map((c) => {
					if (c.id === constraintId) {
						if (c.segments.includes(segmentId)) {
							return c;
						}
						return { ...c, segments: [...c.segments, segmentId] };
					}
					return c;
				})
			);

			try {
				await dbLinkConstraintToSegment(supabase, constraintId, segmentId);
			} catch (err) {
				setConstraints(originalConstraints);
				console.error("Error linking constraint to segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to link constraint to segment";
				setError(errorMessage);
				throw err;
			}
		},
		[constraints, supabase]
	);

	const unlinkConstraintFromSegment = useCallback(
		async (constraintId: string, segmentId: string) => {
			const originalConstraints = constraints;
			setConstraints((prev) =>
				prev.map((c) => {
					if (c.id === constraintId) {
						if (!c.segments.includes(segmentId)) {
							return c;
						}
						return { ...c, segments: c.segments.filter((sId) => sId !== segmentId) };
					}
					return c;
				})
			);

			try {
				await dbUnlinkConstraintFromSegment(supabase, constraintId, segmentId);
			} catch (err) {
				setConstraints(originalConstraints);
				console.error("Error unlinking constraint from segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to unlink constraint from segment";
				setError(errorMessage);
				throw err;
			}
		},
		[constraints, supabase]
	);

	const createConstraint = useCallback(async () => {
		if (!currentProgram?.id) {
			throw new Error("No current program to add constraint to");
		}

		try {
			const newConstraint = await dbCreateConstraint(supabase, currentProgram.id);
			console.log("Successfully created new constraint:", newConstraint.id);
			setConstraints((prev) => [...prev, newConstraint]);
		} catch (err) {
			console.error("Error creating constraint:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to create constraint";
			setError(errorMessage);
			throw err;
		}
	}, [currentProgram, supabase]);

	const createSegment = useCallback(
		async (constructId: string) => {
			if (!currentProgram?.id) {
				throw new Error("No current program to add segment to");
			}
			const originalConstructs = constructs;

			try {
				const newSegment = await dbCreateSegment(supabase, constructId);
				console.log("Successfully created new segment for construct:", constructId);

				setConstructs((prevConstructs) =>
					prevConstructs.map((c) => {
						if (c.id === constructId) {
							return {
								...c,
								segments: [...(c.segments || []), newSegment],
							};
						}
						return c;
					})
				);
				setGenerators((prev) => [...prev, newSegment.generator]);
			} catch (err) {
				setConstructs(originalConstructs);
				console.error("Error creating segment:", err);
				const errorMessage = err instanceof Error ? err.message : "Failed to create segment";
				setError(errorMessage);
				throw err;
			}
		},
		[currentProgram, supabase, constructs]
	);

	const deleteSegment = useCallback(
		async (segmentId: string) => {
			const originalConstructs = constructs;
			let segmentToDelete: Segment | undefined;
			for (const c of originalConstructs) {
				segmentToDelete = c.segments?.find((s) => s.id === segmentId);
				if (segmentToDelete) break;
			}

			setConstructs((prevConstructs) =>
				prevConstructs.map((c) => ({
					...c,
					segments: c.segments ? c.segments.filter((s) => s.id !== segmentId) : [],
				}))
			);
			if (segmentToDelete?.generator) {
				setGenerators((prev) => prev.filter((g) => g.id !== segmentToDelete?.generator.id));
			}

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
		createConstraint,
		deleteConstraint,
		linkConstraintToSegment,
		unlinkConstraintFromSegment,
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
