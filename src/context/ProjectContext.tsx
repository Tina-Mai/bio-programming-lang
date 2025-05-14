import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Node as FlowNode, Edge as FlowEdge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState } from "@xyflow/react";
import { convertProjectDataToFlow, SupabaseSequenceNode, SupabaseConstraintNode, SupabaseGeneratorNode, SupabaseDBEdge, RawProgramGraphData, SupabaseProgram } from "@/lib/utils";
import { getLayoutedElements } from "@/lib/utils/layout";
import { useGlobal } from "./GlobalContext";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

// The GraphData interface that was here is now effectively RawProgramGraphData from program.ts
// We might still need a simplified version for the context value if RawProgramGraphData is too complex

interface ProjectContextProps {
	nodes: FlowNode[];
	edges: FlowEdge[];
	setNodes: Dispatch<SetStateAction<FlowNode[]>>;
	setEdges: Dispatch<SetStateAction<FlowEdge[]>>;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	onConnect: (connection: Connection) => Promise<void>;
	deleteEdge: (edgeId: string) => Promise<void>;
	isGraphLoading: boolean;
	graphError: string | null;
	currentProgramGraphData: RawProgramGraphData | null; // Updated type
	currentProgram: SupabaseProgram | null; // New state for the current program
	updateConstraintNodeConstraint: (nodeId: string, constraint: import("@/types/Constraint").Constraint) => Promise<void>;
	updateSequenceNodeType: (nodeId: string, type: import("@/types/Node").SequenceType) => Promise<void>;
	updateSequenceNodeGenerator: (nodeId: string, generator: import("@/types/Generator").Generator) => Promise<void>;
	applyLayout: () => void;
	deleteNode: (nodeId: string) => Promise<void>;
	duplicateNode: (nodeId: string) => Promise<void>;
	addConstraintNode: () => Promise<void>;
	addSequenceNode: () => Promise<void>;
	// Potentially add function to switch programs or create new one
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject, updateProjectTimestamp } = useGlobal();
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

	const [currentProgram, setCurrentProgram] = useState<SupabaseProgram | null>(null); // New state
	const [currentProgramGraphData, setCurrentProgramGraphData] = useState<RawProgramGraphData | null>(null); // Updated type
	const [isGraphLoading, setIsGraphLoading] = useState<boolean>(false);
	const [graphError, setGraphError] = useState<string | null>(null);
	const supabase: SupabaseClient = createClient();

	// Helper to update the 'updated_at' timestamp of the current program
	const _markProgramUpdated = useCallback(async () => {
		if (!currentProgram?.id) return;
		const newTimestamp = new Date();
		const { error: programUpdateError } = await supabase.from("programs").update({ updated_at: newTimestamp.toISOString() }).eq("id", currentProgram.id);

		if (programUpdateError) {
			console.warn(`Failed to update program updated_at timestamp: ${programUpdateError.message}`);
		} else {
			setCurrentProgram((prev) => (prev ? { ...prev, updated_at: newTimestamp.toISOString() } : null));
			// Also update the project's timestamp as an activity happened within it
			if (currentProject?.id) {
				updateProjectTimestamp(currentProject.id, newTimestamp);
			}
		}
	}, [currentProgram, supabase, updateProjectTimestamp, currentProject?.id]);

	// get an existing generator or create a new one
	const _getOrCreateGenerator = useCallback(
		async (
			generator: import("@/types/Generator").Generator,
			userId: string | undefined | null
		): Promise<{
			generatorId: string;
			generatorNode: SupabaseGeneratorNode;
			isNew: boolean;
		}> => {
			const currentHyperparams = generator.hyperparameters || {};
			// try to find an existing generator first
			let findQuery = supabase.from("generators").select("*").eq("key", generator.key);

			const selectedHParams = generator.hyperparameters;
			if (selectedHParams === undefined || (typeof selectedHParams === "object" && Object.keys(selectedHParams).length === 0)) {
				findQuery = findQuery.or("hyperparameters.is.null,hyperparameters.eq.{}");
			} else {
				findQuery = findQuery.eq("hyperparameters", selectedHParams);
			}

			// add user ownership / public constraint
			findQuery = findQuery.or(userId ? `user_id.eq.${userId},user_id.is.null` : "user_id.is.null").limit(1);
			const { data: existingGenerators, error: fetchGenError } = await findQuery;

			if (fetchGenError) throw new Error(`Supabase fetch error (generators): ${fetchGenError.message}`);

			// if existing generator found, return it
			if (existingGenerators && existingGenerators.length > 0) {
				return {
					generatorId: existingGenerators[0].id,
					generatorNode: existingGenerators[0] as SupabaseGeneratorNode,
					isNew: false,
				};
			}

			// otherwise create new generator
			const { data: newGeneratorData, error: insertGenError } = await supabase
				.from("generators")
				.insert({
					key: generator.key,
					name: generator.name,
					hyperparameters: currentHyperparams,
					user_id: userId,
				})
				.select("*")
				.single();

			if (insertGenError) throw new Error(`Supabase generator insert error: ${insertGenError.message}`);
			if (!newGeneratorData || typeof newGeneratorData.id !== "string") {
				throw new Error("No valid ID returned from generator insertion.");
			}

			// return new generator data
			return {
				generatorId: newGeneratorData.id,
				generatorNode: newGeneratorData as SupabaseGeneratorNode,
				isNew: true,
			};
		},
		[supabase]
	);

	// fetch project graph data when current project changes
	useEffect(() => {
		const fetchProjectGraphData = async () => {
			if (!currentProject?.id) {
				setCurrentProgram(null);
				setCurrentProgramGraphData(null);
				setNodes([]);
				setEdges([]);
				setIsGraphLoading(false);
				setGraphError(null);
				console.log("No current project ID, clearing graph state.");
				return;
			}

			console.log(`Fetching programs for project ID: ${currentProject.id}`);
			setIsGraphLoading(true);
			setGraphError(null);
			setCurrentProgram(null);
			setCurrentProgramGraphData(null);
			setNodes([]);
			setEdges([]);

			try {
				const projectId = currentProject.id;

				// 1. Fetch all programs for the current project
				const { data: programsData, error: programsError } = await supabase
					.from("programs")
					.select("*")
					.eq("project_id", projectId)
					.order("created_at", { ascending: false })
					.order("updated_at", { ascending: false }); // Secondary sort by updated_at

				if (programsError) throw new Error(`Supabase fetch error (programs): ${programsError.message}`);
				if (!programsData || programsData.length === 0) {
					console.log(`No programs found for project ${projectId}.`);
					// Potentially create a default program here if desired, or leave graph empty
					setIsGraphLoading(false);
					return;
				}

				const latestProgram = programsData[0] as SupabaseProgram;
				setCurrentProgram(latestProgram);
				console.log(`Using program ID: ${latestProgram.id} (created: ${latestProgram.created_at}, updated: ${latestProgram.updated_at})`);

				// 2. Fetch graph components for the latest program
				const programId = latestProgram.id;
				const [cnResult, snResult] = await Promise.all([
					supabase.from("constraint_nodes").select("*").eq("program_id", programId),
					supabase.from("sequence_nodes").select("*").eq("program_id", programId),
				]);

				if (cnResult.error) throw new Error(`Supabase fetch error (constraint_nodes): ${cnResult.error.message}`);
				if (snResult.error) throw new Error(`Supabase fetch error (sequence_nodes): ${snResult.error.message}`);

				const fetchedConstraintNodes = (cnResult.data as SupabaseConstraintNode[]) || [];
				const fetchedSequenceNodes = (snResult.data as SupabaseSequenceNode[]) || [];

				let fetchedGeneratorNodes: SupabaseGeneratorNode[] = [];
				const generatorIds = fetchedSequenceNodes.map((sn) => sn.generator_id).filter((id): id is string => typeof id === "string" && id !== "");

				if (generatorIds.length > 0) {
					const uniqueGeneratorIds = [...new Set(generatorIds)];
					const { data: gnData, error: gnError } = await supabase.from("generators").select("*").in("id", uniqueGeneratorIds);
					if (gnError) throw new Error(`Supabase fetch error (generators): ${gnError.message}`);
					fetchedGeneratorNodes = (gnData as SupabaseGeneratorNode[]) || [];
				}

				let fetchedEdges: SupabaseDBEdge[] = [];
				// Edges are linked to a program directly and connect nodes within that program.
				// We fetch edges belonging to the current programId.
				const { data: dbEdges, error: edgeError } = await supabase.from("edges").select("*").eq("program_id", programId);
				if (edgeError) throw new Error(`Supabase fetch error (edges): ${edgeError.message}`);

				// Filter edges to ensure their source (constraint) and target (sequence) nodes
				// were actually fetched for this program (belt-and-suspenders, good for data integrity checks)
				const fetchedConstraintNodeIds = new Set(fetchedConstraintNodes.map((n) => n.id));
				const fetchedSequenceNodeIds = new Set(fetchedSequenceNodes.map((n) => n.id));

				if (dbEdges) {
					fetchedEdges = (dbEdges as SupabaseDBEdge[]).filter((edge) => fetchedConstraintNodeIds.has(edge.constraint_id) && fetchedSequenceNodeIds.has(edge.sequence_id));
				}

				const fetchedGraphDataForProgram: RawProgramGraphData = {
					program: latestProgram,
					constraintNodes: fetchedConstraintNodes,
					sequenceNodes: fetchedSequenceNodes,
					generatorNodes: fetchedGeneratorNodes,
					edges: fetchedEdges,
				};
				setCurrentProgramGraphData(fetchedGraphDataForProgram);
				console.log(`Successfully fetched graph data for program: ${latestProgram.id} in project: ${currentProject.id}`, fetchedGraphDataForProgram);
			} catch (error: unknown) {
				console.error("Error fetching or processing project/program graph data:", error);
				const message = error instanceof Error ? error.message : "An unknown error occurred";
				setGraphError(`Failed to load project graph: ${message}`);
				setCurrentProgram(null);
				setCurrentProgramGraphData(null);
			} finally {
				setIsGraphLoading(false);
			}
		};
		fetchProjectGraphData();
	}, [currentProject?.id, supabase, setNodes, setEdges]);

	// apply layout to current nodes and edges
	const applyLayout = useCallback(() => {
		// Use functional updates to ensure we're working with the latest state
		setNodes((currentNodes) => {
			setEdges((currentEdges) => {
				// Only proceed if nodes and edges are available
				if (currentNodes.length === 0 && currentEdges.length === 0) {
					return currentEdges; // No layout needed for empty graph
				}
				const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(currentNodes, currentEdges);
				// Update nodes state outside the edges update
				// Note: This might cause a double render, but ensures atomicity for layout
				// Consider optimizing if performance becomes an issue.
				queueMicrotask(() => setNodes(layoutedNodes));
				return layoutedEdges;
			});
			// Return currentNodes initially, the actual update happens in the microtask
			return currentNodes;
		});
	}, [setNodes, setEdges]);

	// effect to convert raw graph data to flow elements
	useEffect(() => {
		let isMounted = true;
		if (!currentProgramGraphData || isGraphLoading) {
			if (!isGraphLoading && isMounted) {
				setNodes([]);
				setEdges([]);
			}
			return;
		}

		// pass current nodes state to preserve positions
		const { nodes: convertedNodes, edges: convertedEdges } = convertProjectDataToFlow(currentProgramGraphData, nodes);
		console.log("Converted to flow (preserving positions): ", { convertedNodes, convertedEdges });

		// apply the converted nodes and edges directly
		if (isMounted) {
			setNodes(convertedNodes);
			setEdges(convertedEdges);
			// The automatic applyLayout call previously here has been removed.
			// Initial layout is handled by GraphEditor.tsx's useEffect.
			// Subsequent layouts are triggered manually or by specific logic if needed elsewhere.
		}

		return () => {
			isMounted = false;
		};
		// applyLayout is now included as a dependency
	}, [currentProgramGraphData, isGraphLoading, setNodes, setEdges, applyLayout]);

	const onConnect = useCallback(
		async (connection: Connection) => {
			if (!currentProject || !currentProject.id || !currentProgram || !currentProgram.id || !connection.source || !connection.target) {
				setGraphError("Cannot connect: missing project, program, or node information.");
				return;
			}

			const sourceNode = nodes.find((n) => n.id === connection.source);
			const targetNode = nodes.find((n) => n.id === connection.target);

			if (sourceNode?.type !== "constraint" || targetNode?.type !== "sequence") {
				setGraphError("Invalid connection: Edges can only go from Constraint to Sequence nodes.");
				console.warn("Invalid connection attempt: ", { sourceNode, targetNode });
				return;
			}

			const existingEdge = currentProgramGraphData?.edges.find((edge) => edge.constraint_id === connection.source && edge.sequence_id === connection.target);

			if (existingEdge) {
				setGraphError("An edge already exists between these two nodes.");
				console.warn("Attempt to create duplicate edge prevented:", connection);
				return;
			}

			const newEdgePayload = {
				constraint_id: connection.source,
				sequence_id: connection.target,
				program_id: currentProgram.id,
			};

			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { data: insertedEdge, error: insertError } = await supabase.from("edges").insert(newEdgePayload).select().single();

				if (insertError) throw new Error(`Supabase edge insert error: ${insertError.message}`);
				if (!insertedEdge) throw new Error("No data returned from edge insertion.");

				console.log("Edge added to DB:", insertedEdge);
				const reactFlowEdge: FlowEdge = {
					id: insertedEdge.id,
					source: insertedEdge.constraint_id,
					target: insertedEdge.sequence_id,
				};
				setEdges((eds) => addEdge(reactFlowEdge, eds));
				await _markProgramUpdated();
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						edges: [...prevData.edges, insertedEdge as SupabaseDBEdge],
					};
				});
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : "An unknown error occurred";
				setGraphError(`Failed to add edge: ${message}`);
				console.error("Failed to add edge:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[currentProject, currentProgram, supabase, _markProgramUpdated, setEdges, nodes, setCurrentProgramGraphData, currentProgramGraphData?.edges]
	);

	// --- Update Functions ---
	const updateConstraintNodeConstraint = useCallback(
		async (nodeId: string, constraint: import("@/types/Constraint").Constraint) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("constraint_nodes").update({ key: constraint.key }).eq("id", nodeId);
				if (error) throw new Error(error.message);

				// update currentProgramGraphData
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						constraintNodes: prevData.constraintNodes.map((cn) => (cn.id === nodeId ? { ...cn, key: constraint.key } : cn)),
					};
				});

				// update React Flow nodes state
				setNodes((prevNodes) => prevNodes.map((node) => (node.id === nodeId && node.type === "constraint" ? { ...node, data: { ...node.data, constraint } } : node)));
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update constraint: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProgramUpdated, setCurrentProgramGraphData]
	);

	const updateSequenceNodeType = useCallback(
		async (nodeId: string, type: import("@/types/Node").SequenceType) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("sequence_nodes").update({ type }).eq("id", nodeId);
				if (error) throw new Error(error.message);

				// update currentProgramGraphData
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						sequenceNodes: prevData.sequenceNodes.map((sn) => (sn.id === nodeId ? { ...sn, type: type } : sn)),
					};
				});

				// update React Flow nodes state
				setNodes((prevNodes) =>
					prevNodes.map((node) => {
						if (node.id === nodeId && node.type === "sequence") {
							const currentSequenceData = (node.data && (node.data as { sequence?: Record<string, unknown> }).sequence) || {};
							return {
								...node,
								data: {
									...node.data,
									sequence: { ...currentSequenceData, type },
								},
							};
						}
						return node;
					})
				);
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update sequence type: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProgramUpdated, setCurrentProgramGraphData]
	);

	const updateSequenceNodeGenerator = useCallback(
		async (nodeId: string, generator: import("@/types/Generator").Generator) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				const userId = user?.id;

				// find or create the generator
				const { generatorId, generatorNode, isNew } = await _getOrCreateGenerator(generator, userId);

				// update sequence node with generator ID
				const { error: updateSeqError } = await supabase.from("sequence_nodes").update({ generator_id: generatorId }).eq("id", nodeId);

				if (updateSeqError) throw new Error(`Supabase sequence_node update error: ${updateSeqError.message}`);

				// update currentProgramGraphData
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;

					const updatedSequenceNodes = prevData.sequenceNodes.map((sn) => (sn.id === nodeId ? { ...sn, generator_id: generatorId } : sn));
					const updatedGeneratorNodes = [...prevData.generatorNodes];
					const generatorExists = updatedGeneratorNodes.some((gn) => gn.id === generatorId);

					if (!generatorExists) {
						console.log(`Adding ${isNew ? "new" : "existing"} generator with ID ${generatorId} to currentProgramGraphData`);
						updatedGeneratorNodes.push(generatorNode);
					}

					return {
						...prevData,
						sequenceNodes: updatedSequenceNodes,
						generatorNodes: updatedGeneratorNodes,
					};
				});

				// update React Flow nodes state
				setNodes((prevNodes) =>
					prevNodes.map((node) => {
						if (node.id === nodeId && node.type === "sequence") {
							const currentSequenceData = (node.data && (node.data as { sequence?: Record<string, unknown> }).sequence) || {};
							return {
								...node,
								data: {
									...node.data,
									sequence: { ...currentSequenceData, generator: generator },
								},
							};
						}
						return node;
					})
				);

				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update generator: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to update generator:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProgramUpdated, setCurrentProgramGraphData, _getOrCreateGenerator]
	);

	// delete an edge
	const deleteEdge = useCallback(
		async (edgeId: string) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				// delete from database
				const { error } = await supabase.from("edges").delete().eq("id", edgeId);
				if (error) throw new Error(`Supabase edge delete error: ${error.message}`);

				// filter out deleted edge without affecting nodes
				setEdges((eds) => eds.filter((e) => e.id !== edgeId));

				// update currentProgramGraphData
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						edges: prevData.edges.filter((e) => e.id !== edgeId),
					};
				});

				await _markProgramUpdated();
				console.log(`Edge ${edgeId} deleted successfully`);
			} catch (error: unknown) {
				setGraphError(`Failed to delete edge: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to delete edge:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setEdges, _markProgramUpdated, setCurrentProgramGraphData]
	);

	// delete a node and its connected edges
	const deleteNode = useCallback(
		async (nodeId: string) => {
			if (!currentProgram?.id) {
				setGraphError("Cannot delete node: No active program selected.");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const nodeToDelete = nodes.find((n) => n.id === nodeId);
				if (!nodeToDelete) {
					throw new Error(`Node with ID ${nodeId} not found in local state.`);
				}

				let nodeTable: string;
				if (nodeToDelete.type === "constraint") {
					nodeTable = "constraint_nodes";
				} else if (nodeToDelete.type === "sequence") {
					nodeTable = "sequence_nodes";
				} else {
					throw new Error(`Unknown node type: ${nodeToDelete.type}`);
				}

				// 1. Delete connected edges from Supabase, ensuring they belong to the current program
				const { error: edgeDeleteError } = await supabase.from("edges").delete().eq("program_id", currentProgram.id).or(`constraint_id.eq.${nodeId},sequence_id.eq.${nodeId}`);

				if (edgeDeleteError) {
					throw new Error(`Supabase edge delete error for node ${nodeId} in program ${currentProgram.id}: ${edgeDeleteError.message}`);
				}

				// 2. Delete the node from Supabase (it's already scoped by its own ID, program_id is on the record)
				const { error: nodeDeleteError } = await supabase.from(nodeTable).delete().eq("id", nodeId);

				if (nodeDeleteError) {
					throw new Error(`Supabase ${nodeTable} delete error: ${nodeDeleteError.message}`);
				}

				// 3. Update local React Flow state
				setNodes((nds) => nds.filter((n) => n.id !== nodeId));
				setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

				// 4. Update currentProgramGraphData
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					const updatedConstraintNodes = prevData.constraintNodes.filter((cn) => cn.id !== nodeId);
					const updatedSequenceNodes = prevData.sequenceNodes.filter((sn) => sn.id !== nodeId);
					// Edges are already updated in React Flow state, ensure consistency here from the program data
					const updatedEdges = prevData.edges.filter((e) => e.constraint_id !== nodeId && e.sequence_id !== nodeId);

					return {
						...prevData,
						constraintNodes: updatedConstraintNodes,
						sequenceNodes: updatedSequenceNodes,
						edges: updatedEdges,
					};
				});

				await _markProgramUpdated();
				console.log(`Node ${nodeId} and its connected edges deleted successfully from program ${currentProgram.id}`);
			} catch (error: unknown) {
				setGraphError(`Failed to delete node: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to delete node:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, nodes, setNodes, setEdges, _markProgramUpdated, setCurrentProgramGraphData, currentProgram?.id]
	);

	// duplicate a node
	const duplicateNode = useCallback(
		async (nodeId: string) => {
			if (!currentProject?.id || !currentProgram?.id) {
				setGraphError("Cannot duplicate node: No active project or program selected.");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
				if (!nodeToDuplicate) {
					throw new Error(`Node with ID ${nodeId} not found in local state.`);
				}

				const originalNodeData =
					currentProgramGraphData &&
					(nodeToDuplicate.type === "constraint"
						? currentProgramGraphData.constraintNodes.find((cn) => cn.id === nodeId)
						: currentProgramGraphData.sequenceNodes.find((sn) => sn.id === nodeId));

				if (!originalNodeData) {
					throw new Error(`Original node data for ID ${nodeId} not found or project/program ID missing.`);
				}

				let newNode: FlowNode | null = null;
				let newDbNode: SupabaseConstraintNode | SupabaseSequenceNode | null = null;

				const positionOffset = 20;
				const newPosition = {
					x: (nodeToDuplicate.position?.x ?? 0) + positionOffset,
					y: (nodeToDuplicate.position?.y ?? 0) + positionOffset,
				};

				if (nodeToDuplicate.type === "constraint" && "key" in originalNodeData) {
					const payload = {
						key: originalNodeData.key,
						project_id: currentProject.id,
						program_id: currentProgram.id,
					};
					const { data, error } = await supabase.from("constraint_nodes").insert(payload).select().single();
					if (error) throw new Error(`Supabase constraint_node insert error: ${error.message}`);
					if (!data) throw new Error("No data returned from constraint_node insertion.");
					newDbNode = data as SupabaseConstraintNode;
					newNode = {
						id: newDbNode.id,
						type: "constraint",
						position: newPosition,
						data: { constraint: { key: newDbNode.key } },
					};
				} else if (nodeToDuplicate.type === "sequence" && "type" in originalNodeData) {
					const typedOriginalNodeData = originalNodeData as SupabaseSequenceNode;
					const payload = {
						type: typedOriginalNodeData.type,
						generator_id: typedOriginalNodeData.generator_id,
						project_id: currentProject.id,
						program_id: currentProgram.id,
						sequence: typedOriginalNodeData.sequence,
						metadata: typedOriginalNodeData.metadata,
					};
					const { data, error } = await supabase.from("sequence_nodes").insert(payload).select().single();
					if (error) throw new Error(`Supabase sequence_node insert error: ${error.message}`);
					if (!data) throw new Error("No data returned from sequence_node insertion.");
					newDbNode = data as SupabaseSequenceNode;

					const generatorData = currentProgramGraphData?.generatorNodes.find((gn) => gn.id === typedOriginalNodeData.generator_id);

					newNode = {
						id: newDbNode.id,
						type: "sequence",
						position: newPosition,
						data: {
							sequence: {
								id: newDbNode.id,
								type: newDbNode.type,
								sequence: (newDbNode as SupabaseSequenceNode).sequence,
								metadata: (newDbNode as SupabaseSequenceNode).metadata,
								generator_id: (newDbNode as SupabaseSequenceNode).generator_id,
								generator: generatorData ? { id: generatorData.id, key: generatorData.key, name: generatorData.name, hyperparameters: generatorData.hyperparameters } : undefined,
								project_id: (newDbNode as SupabaseSequenceNode).project_id,
								program_id: (newDbNode as SupabaseSequenceNode).program_id,
							},
						},
					};
				} else {
					throw new Error(`Unknown or mismatched node type for duplication: ${nodeToDuplicate.type}`);
				}

				setNodes((nds) => [...nds, newNode as FlowNode]);

				setCurrentProgramGraphData((prevData) => {
					if (!prevData || !newDbNode) return prevData;
					const updatedConstraintNodes = [...prevData.constraintNodes];
					const updatedSequenceNodes = [...prevData.sequenceNodes];

					if (newDbNode.program_id === currentProgram?.id) {
						if ("key" in newDbNode) {
							updatedConstraintNodes.push(newDbNode as SupabaseConstraintNode);
						} else if ("type" in newDbNode) {
							updatedSequenceNodes.push(newDbNode as SupabaseSequenceNode);
						}
					}

					return {
						...prevData,
						constraintNodes: updatedConstraintNodes,
						sequenceNodes: updatedSequenceNodes,
					};
				});

				await _markProgramUpdated();
				console.log(`Node ${nodeId} duplicated successfully to program ${currentProgram.id} with new ID: ${newNode?.id}`);
			} catch (error: unknown) {
				setGraphError(`Failed to duplicate node: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to duplicate node:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, nodes, currentProject?.id, currentProgram?.id, currentProgramGraphData, setNodes, _markProgramUpdated, setCurrentProgramGraphData]
	);

	// --- Add new node functions ---
	const addConstraintNode = useCallback(async () => {
		if (!currentProject?.id || !currentProgram?.id) {
			setGraphError("Cannot add node: No active project or program selected.");
			return;
		}
		setIsGraphLoading(true);
		setGraphError(null);
		try {
			const payload = {
				key: null, // Default key, user can edit later
				project_id: currentProject.id,
				program_id: currentProgram.id,
			};
			const { data, error } = await supabase.from("constraint_nodes").insert(payload).select().single();
			if (error) throw new Error(`Supabase constraint_node insert error: ${error.message}`);
			if (!data) throw new Error("No data returned from constraint_node insertion.");

			const newDbNode = data as SupabaseConstraintNode;
			const newNode: FlowNode = {
				id: newDbNode.id,
				type: "constraint",
				position: { x: 100, y: 100 }, // Default position
				data: { constraint: null }, // Reflects the null key
			};

			setNodes((nds) => [...nds, newNode]);
			setCurrentProgramGraphData((prevData) => {
				if (!prevData) return null; // Should not happen if currentProgram is set
				return {
					...prevData,
					constraintNodes: [...prevData.constraintNodes, newDbNode],
				};
			});

			await _markProgramUpdated();
			console.log(`Constraint node added successfully with ID: ${newNode.id} to program ${currentProgram.id}`);
		} catch (error: unknown) {
			setGraphError(`Failed to add constraint node: ${error instanceof Error ? error.message : String(error)}`);
			console.error("Failed to add constraint node:", error);
		} finally {
			setIsGraphLoading(false);
		}
	}, [currentProject?.id, currentProgram?.id, supabase, setNodes, setCurrentProgramGraphData, _markProgramUpdated]);

	const addSequenceNode = useCallback(async () => {
		if (!currentProject?.id || !currentProgram?.id) {
			setGraphError("Cannot add node: No active project or program selected.");
			return;
		}
		setIsGraphLoading(true);
		setGraphError(null);
		try {
			const payload = {
				type: null, // Default type, user can edit later
				sequence: null, // Default sequence, user can edit later
				project_id: currentProject.id,
				program_id: currentProgram.id,
				generator_id: null,
			};
			const { data, error } = await supabase.from("sequence_nodes").insert(payload).select().single();
			if (error) throw new Error(`Supabase sequence_node insert error: ${error.message}`);
			if (!data) throw new Error("No data returned from sequence_node insertion.");

			const newDbNode = data as SupabaseSequenceNode;
			const newNode: FlowNode = {
				id: newDbNode.id,
				type: "sequence",
				position: { x: 150, y: 150 }, // Default position
				data: {
					sequence: {
						id: newDbNode.id,
						type: newDbNode.type,
						sequence: newDbNode.sequence,
						// No generator by default
						project_id: newDbNode.project_id, // Pass through for consistency if needed by component
						program_id: newDbNode.program_id, // Pass through for consistency if needed by component
					},
				},
			};

			setNodes((nds) => [...nds, newNode]);
			setCurrentProgramGraphData((prevData) => {
				if (!prevData) return null; // Should not happen
				return {
					...prevData,
					sequenceNodes: [...prevData.sequenceNodes, newDbNode],
				};
			});

			await _markProgramUpdated();
			console.log(`Sequence node added successfully with ID: ${newNode.id} to program ${currentProgram.id}`);
		} catch (error: unknown) {
			setGraphError(`Failed to add sequence node: ${error instanceof Error ? error.message : String(error)}`);
			console.error("Failed to add sequence node:", error);
		} finally {
			setIsGraphLoading(false);
		}
	}, [currentProject?.id, currentProgram?.id, supabase, setNodes, setCurrentProgramGraphData, _markProgramUpdated]);
	// --- End add new node functions ---

	const value: ProjectContextProps = {
		nodes,
		edges,
		setNodes,
		setEdges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		deleteEdge,
		isGraphLoading,
		graphError,
		currentProgramGraphData,
		currentProgram,
		updateConstraintNodeConstraint,
		updateSequenceNodeType,
		updateSequenceNodeGenerator,
		applyLayout,
		deleteNode,
		duplicateNode,
		addConstraintNode,
		addSequenceNode,
	};
	return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextProps => {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error("useProject must be used within a ProjectProvider");
	}
	return context;
};
