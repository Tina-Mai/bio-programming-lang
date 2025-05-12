import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Node as FlowNode, Edge as FlowEdge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState } from "@xyflow/react";
import { convertProjectDataToFlow, SupabaseSequenceNode, SupabaseConstraintNode, SupabaseGeneratorNode, SupabaseDBEdge } from "@/lib/utils";
import { getLayoutedElements, defaultElkOptions } from "@/lib/utils/layout";
import { useGlobal } from "./GlobalContext";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

// structure for the raw graph data fetched from Supabase (using types from flowUtils)
export interface GraphData {
	sequenceNodes: SupabaseSequenceNode[];
	constraintNodes: SupabaseConstraintNode[];
	generatorNodes: SupabaseGeneratorNode[];
	edges: SupabaseDBEdge[];
}

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
	currentProjectGraphData: GraphData | null;

	updateConstraintNodeConstraint: (nodeId: string, constraint: import("@/types/Constraint").Constraint) => Promise<void>;
	updateSequenceNodeType: (nodeId: string, type: import("@/types/Node").SequenceType) => Promise<void>;
	updateSequenceNodeGenerator: (nodeId: string, generator: import("@/types/Generator").Generator) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject, updateProjectTimestamp } = useGlobal();
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

	const [currentProjectGraphData, setCurrentProjectGraphData] = useState<GraphData | null>(null);
	const [isGraphLoading, setIsGraphLoading] = useState<boolean>(false);
	const [graphError, setGraphError] = useState<string | null>(null);
	const supabase: SupabaseClient = createClient();

	const _markProjectUpdated = useCallback(async () => {
		if (!currentProject?.id) return;
		const newTimestamp = new Date();
		const { error: projectUpdateError } = await supabase.from("projects").update({ updated_at: newTimestamp.toISOString() }).eq("id", currentProject.id);
		if (projectUpdateError) {
			console.warn(`Failed to update project updated_at timestamp: ${projectUpdateError.message}`);
		}
		updateProjectTimestamp(currentProject.id, newTimestamp);
	}, [currentProject, supabase, updateProjectTimestamp]);

	// Helper function to get an existing generator or create a new one
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
			// Try to find an existing generator first
			let findQuery = supabase.from("generators").select("*").eq("key", generator.key);

			const selectedHParams = generator.hyperparameters;
			if (selectedHParams === undefined || (typeof selectedHParams === "object" && Object.keys(selectedHParams).length === 0)) {
				findQuery = findQuery.or("hyperparameters.is.null,hyperparameters.eq.{}");
			} else {
				findQuery = findQuery.eq("hyperparameters", selectedHParams);
			}

			// Add user ownership / public constraint
			findQuery = findQuery.or(userId ? `user_id.eq.${userId},user_id.is.null` : "user_id.is.null").limit(1);
			const { data: existingGenerators, error: fetchGenError } = await findQuery;

			if (fetchGenError) throw new Error(`Supabase fetch error (generators): ${fetchGenError.message}`);

			// If existing generator found, return it
			if (existingGenerators && existingGenerators.length > 0) {
				return {
					generatorId: existingGenerators[0].id,
					generatorNode: existingGenerators[0] as SupabaseGeneratorNode,
					isNew: false,
				};
			}

			// Otherwise create a new generator
			const { data: newGeneratorData, error: insertGenError } = await supabase
				.from("generators")
				.insert({
					key: generator.key,
					name: generator.name,
					hyperparameters: currentHyperparams,
					user_id: userId,
				})
				.select("*") // Get all fields for the new generator
				.single();

			if (insertGenError) throw new Error(`Supabase generator insert error: ${insertGenError.message}`);
			if (!newGeneratorData || typeof newGeneratorData.id !== "string") {
				throw new Error("No valid ID returned from generator insertion.");
			}

			// Return the new generator data
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
				setCurrentProjectGraphData(null);
				setNodes([]);
				setEdges([]);
				setIsGraphLoading(false);
				setGraphError(null);
				console.log("No current project ID, clearing graph state.");
				return;
			}

			console.log(`Fetching graph data for project ID: ${currentProject.id}`);
			setIsGraphLoading(true);
			setGraphError(null);
			setCurrentProjectGraphData(null);
			setNodes([]);
			setEdges([]);

			try {
				const projectId = currentProject.id;

				// fetch constraint_nodes and sequence_nodes first
				const [cnResult, snResult] = await Promise.all([
					supabase.from("constraint_nodes").select("*").eq("project_id", projectId),
					supabase.from("sequence_nodes").select("*").eq("project_id", projectId),
				]);

				if (cnResult.error) throw new Error(`Supabase fetch error (constraint_nodes): ${cnResult.error.message}`);
				if (snResult.error) throw new Error(`Supabase fetch error (sequence_nodes): ${snResult.error.message}`);

				const fetchedConstraintNodes = (cnResult.data as SupabaseConstraintNode[]) || [];
				const fetchedSequenceNodes = (snResult.data as SupabaseSequenceNode[]) || [];

				let fetchedGeneratorNodes: SupabaseGeneratorNode[] = [];
				const generatorIds = fetchedSequenceNodes.map((sn) => sn.generator_id).filter((id): id is string => typeof id === "string" && id !== ""); // Get unique, non-null/empty generator_ids

				if (generatorIds.length > 0) {
					// deduplicate IDs before fetching
					const uniqueGeneratorIds = [...new Set(generatorIds)];
					const { data: gnData, error: gnError } = await supabase.from("generators").select("*").in("id", uniqueGeneratorIds);
					if (gnError) throw new Error(`Supabase fetch error (generators): ${gnError.message}`);
					fetchedGeneratorNodes = (gnData as SupabaseGeneratorNode[]) || [];
				}

				let fetchedEdges: SupabaseDBEdge[] = [];
				const constraintNodeIds = fetchedConstraintNodes.map((n) => n.id);
				const sequenceNodeIdsSet = new Set(fetchedSequenceNodes.map((n) => n.id)); // For efficient lookup

				if (constraintNodeIds.length > 0) {
					const { data: dbEdges, error: edgeError } = await supabase.from("edges").select("*").in("constraint_id", constraintNodeIds);

					if (edgeError) throw new Error(`Supabase fetch error (edges): ${edgeError.message}`);

					if (dbEdges) {
						// filter edges to ensure they connect to sequence nodes also in this project
						fetchedEdges = (dbEdges as SupabaseDBEdge[]).filter((edge) => sequenceNodeIdsSet.has(edge.sequence_id));
					}
				} else {
					fetchedEdges = [];
				}

				const fetchedData: GraphData = {
					constraintNodes: fetchedConstraintNodes,
					sequenceNodes: fetchedSequenceNodes,
					generatorNodes: fetchedGeneratorNodes,
					edges: fetchedEdges,
				};
				setCurrentProjectGraphData(fetchedData);
				console.log(`Successfully fetched graph data for project: ${currentProject.id}`, fetchedData);
			} catch (error: unknown) {
				console.error("Error fetching or processing project graph data:", error);
				const message = error instanceof Error ? error.message : "An unknown error occurred";
				setGraphError(`Failed to load project graph: ${message}`);
				setCurrentProjectGraphData(null);
			} finally {
				setIsGraphLoading(false);
			}
		};
		fetchProjectGraphData();
	}, [currentProject?.id, supabase, setNodes, setEdges]);

	// layout calculation effect
	useEffect(() => {
		let isMounted = true;
		if (!currentProjectGraphData || isGraphLoading) {
			if (!isGraphLoading && isMounted) {
				setNodes([]);
				setEdges([]);
			}
			return;
		}

		const { nodes: convertedNodes, edges: convertedEdges } = convertProjectDataToFlow(currentProjectGraphData);
		console.log("Converted to flow: ", { convertedNodes, convertedEdges });

		// Preserve existing node positions from the previous update
		const preservePositions = (newNodes: FlowNode[]) => {
			const existingNodeMap = new Map();
			setNodes((oldNodes) => {
				// Create a map of existing positions first
				oldNodes.forEach((node) => {
					existingNodeMap.set(node.id, node.position);
				});

				// Apply existing positions to new nodes where applicable
				return newNodes.map((node) => {
					const existingPosition = existingNodeMap.get(node.id);
					if (existingPosition) {
						return { ...node, position: existingPosition };
					}
					return node;
				});
			});
		};

		// Only apply layout if there are at least some nodes without positions
		if (convertedNodes.length > 0) {
			// First, directly use existing positions for what we have
			preservePositions(convertedNodes);

			// For initial layout or when there are new nodes, apply auto-layout
			getLayoutedElements(convertedNodes, convertedEdges, defaultElkOptions)
				.then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
					if (isMounted) {
						console.log("Applying layout: ", { layoutedNodes, layoutedEdges });
						// Apply layout but preserve any existing positions
						preservePositions(layoutedNodes);
						setEdges(layoutedEdges);
					}
				})
				.catch((error) => {
					console.error("Error during layout calculation:", error);
					if (isMounted) {
						console.warn("Falling back to non-layouted nodes/edges due to layout error.");
						// Still use the preservePositions function to maintain positions
						setEdges(convertedEdges);
					}
				});
		} else {
			// Empty flow
			if (isMounted) {
				setNodes([]);
				setEdges([]);
			}
		}

		return () => {
			isMounted = false;
		};
	}, [currentProjectGraphData, isGraphLoading, setNodes, setEdges]);

	const onConnect = useCallback(
		async (connection: Connection) => {
			if (!currentProject || !currentProject.id || !connection.source || !connection.target) {
				setGraphError("Cannot connect: missing project or node information.");
				return;
			}

			const sourceNode = nodes.find((n) => n.id === connection.source);
			const targetNode = nodes.find((n) => n.id === connection.target);

			if (sourceNode?.type !== "constraint" || targetNode?.type !== "sequence") {
				setGraphError("Invalid connection: Edges can only go from Constraint to Sequence nodes.");
				console.warn("Invalid connection attempt: ", { sourceNode, targetNode });
				return;
			}

			const newEdgePayload = {
				constraint_id: connection.source,
				sequence_id: connection.target,
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
				await _markProjectUpdated();
				setCurrentProjectGraphData((prevData) => {
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
		[currentProject, supabase, _markProjectUpdated, setEdges, nodes, setCurrentProjectGraphData]
	);

	// --- Update Functions ---
	const updateConstraintNodeConstraint = useCallback(
		async (nodeId: string, constraint: import("@/types/Constraint").Constraint) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("constraint_nodes").update({ key: constraint.key }).eq("id", nodeId);
				if (error) throw new Error(error.message);

				// update currentProjectGraphData
				setCurrentProjectGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						constraintNodes: prevData.constraintNodes.map((cn) => (cn.id === nodeId ? { ...cn, key: constraint.key } : cn)),
					};
				});

				// update React Flow nodes state
				setNodes((prevNodes) => prevNodes.map((node) => (node.id === nodeId && node.type === "constraint" ? { ...node, data: { ...node.data, constraint } } : node)));
				await _markProjectUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update constraint: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProjectUpdated, setCurrentProjectGraphData]
	);

	const updateSequenceNodeType = useCallback(
		async (nodeId: string, type: import("@/types/Node").SequenceType) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("sequence_nodes").update({ type }).eq("id", nodeId);
				if (error) throw new Error(error.message);

				// update currentProjectGraphData
				setCurrentProjectGraphData((prevData) => {
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
				await _markProjectUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update sequence type: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProjectUpdated, setCurrentProjectGraphData]
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

				// Find or create the generator
				const { generatorId, generatorNode, isNew } = await _getOrCreateGenerator(generator, userId);

				// Update the sequence node with the generator ID
				const { error: updateSeqError } = await supabase.from("sequence_nodes").update({ generator_id: generatorId }).eq("id", nodeId);

				if (updateSeqError) throw new Error(`Supabase sequence_node update error: ${updateSeqError.message}`);

				// Update currentProjectGraphData
				setCurrentProjectGraphData((prevData) => {
					if (!prevData) return null;

					// Update sequence node to point to this generator
					const updatedSequenceNodes = prevData.sequenceNodes.map((sn) => (sn.id === nodeId ? { ...sn, generator_id: generatorId } : sn));

					// Add generator to generatorNodes if not already there
					const updatedGeneratorNodes = [...prevData.generatorNodes];
					const generatorExists = updatedGeneratorNodes.some((gn) => gn.id === generatorId);

					if (!generatorExists) {
						console.log(`Adding ${isNew ? "new" : "existing"} generator with ID ${generatorId} to currentProjectGraphData`);
						updatedGeneratorNodes.push(generatorNode);
					}

					return {
						...prevData,
						sequenceNodes: updatedSequenceNodes,
						generatorNodes: updatedGeneratorNodes,
					};
				});

				// Update React Flow nodes state
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

				await _markProjectUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update generator: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to update generator:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProjectUpdated, setCurrentProjectGraphData, _getOrCreateGenerator]
	);

	// Add deleteEdge function
	const deleteEdge = useCallback(
		async (edgeId: string) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				// Delete the edge from the database
				const { error } = await supabase.from("edges").delete().eq("id", edgeId);
				if (error) throw new Error(`Supabase edge delete error: ${error.message}`);

				// Simply filter out the deleted edge without affecting nodes
				setEdges((eds) => eds.filter((e) => e.id !== edgeId));

				// Update currentProjectGraphData but don't trigger node layout
				setCurrentProjectGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						edges: prevData.edges.filter((e) => e.id !== edgeId),
					};
				});

				await _markProjectUpdated();
				console.log(`Edge ${edgeId} deleted successfully`);
			} catch (error: unknown) {
				setGraphError(`Failed to delete edge: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to delete edge:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setEdges, _markProjectUpdated, setCurrentProjectGraphData]
	);

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
		currentProjectGraphData,
		updateConstraintNodeConstraint,
		updateSequenceNodeType,
		updateSequenceNodeGenerator,
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
