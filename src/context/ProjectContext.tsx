import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Node as FlowNode, Edge as FlowEdge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState } from "@xyflow/react";
import { convertProjectDataToFlow, SupabaseSequenceNode, SupabaseConstraintNode, SupabaseGeneratorNode, SupabaseDBEdge } from "@/lib/utils";
import { getLayoutedElements } from "@/lib/utils/layout";
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

	// Add a new method to trigger layout
	applyLayout: () => void;

	// Add a new method to delete a node
	deleteNode: (nodeId: string) => Promise<void>;

	// Add a new method to duplicate a node
	duplicateNode: (nodeId: string) => Promise<void>;
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

	// Apply layout to current nodes and edges
	const applyLayout = useCallback(() => {
		// Apply layout to edges
		setEdges((edges) => {
			const { edges: layoutedEdges } = getLayoutedElements(nodes, edges);
			return layoutedEdges;
		});

		// Apply layout to nodes
		setNodes((nodes) => {
			const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);
			return layoutedNodes;
		});
	}, [setNodes, setEdges, edges, nodes]);

	// effect to convert raw graph data to flow elements
	useEffect(() => {
		let isMounted = true;
		if (!currentProjectGraphData || isGraphLoading) {
			if (!isGraphLoading && isMounted) {
				setNodes([]);
				setEdges([]);
			}
			return;
		}

		// MODIFIED: Pass current nodes state to preserve positions
		const { nodes: convertedNodes, edges: convertedEdges } = convertProjectDataToFlow(currentProjectGraphData, nodes);
		console.log("Converted to flow (preserving positions): ", { convertedNodes, convertedEdges });

		// Apply the converted nodes and edges directly
		if (isMounted) {
			setNodes(convertedNodes);
			setEdges(convertedEdges);
			// REMOVED comment about layout being applied here
		}

		return () => {
			isMounted = false;
		};
		// MODIFIED: Removed nodes from dependency array to break loop
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

			// Check for existing edge
			const existingEdge = currentProjectGraphData?.edges.find((edge) => edge.constraint_id === connection.source && edge.sequence_id === connection.target);

			if (existingEdge) {
				setGraphError("An edge already exists between these two nodes.");
				console.warn("Attempt to create duplicate edge prevented:", connection);
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

				// find or create the generator
				const { generatorId, generatorNode, isNew } = await _getOrCreateGenerator(generator, userId);

				// update sequence node with generator ID
				const { error: updateSeqError } = await supabase.from("sequence_nodes").update({ generator_id: generatorId }).eq("id", nodeId);

				if (updateSeqError) throw new Error(`Supabase sequence_node update error: ${updateSeqError.message}`);

				// update currentProjectGraphData
				setCurrentProjectGraphData((prevData) => {
					if (!prevData) return null;

					const updatedSequenceNodes = prevData.sequenceNodes.map((sn) => (sn.id === nodeId ? { ...sn, generator_id: generatorId } : sn));
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

				// update currentProjectGraphData
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

	// delete a node and its connected edges
	const deleteNode = useCallback(
		async (nodeId: string) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const nodeToDelete = nodes.find((n) => n.id === nodeId);
				if (!nodeToDelete) {
					throw new Error(`Node with ID ${nodeId} not found in local state.`);
				}

				// Determine node type and table
				let nodeTable: string;
				if (nodeToDelete.type === "constraint") {
					nodeTable = "constraint_nodes";
				} else if (nodeToDelete.type === "sequence") {
					nodeTable = "sequence_nodes";
				} else {
					throw new Error(`Unknown node type: ${nodeToDelete.type}`);
				}

				// 1. Delete connected edges from Supabase
				// Edges are stored with constraint_id and sequence_id.
				// If it's a constraint node, find edges where constraint_id = nodeId
				// If it's a sequence node, find edges where sequence_id = nodeId
				const { error: edgeDeleteError } = await supabase.from("edges").delete().or(`constraint_id.eq.${nodeId},sequence_id.eq.${nodeId}`);

				if (edgeDeleteError) {
					throw new Error(`Supabase edge delete error for node ${nodeId}: ${edgeDeleteError.message}`);
				}

				// 2. Delete the node from Supabase
				const { error: nodeDeleteError } = await supabase.from(nodeTable).delete().eq("id", nodeId);

				if (nodeDeleteError) {
					throw new Error(`Supabase ${nodeTable} delete error: ${nodeDeleteError.message}`);
				}

				// 3. Update local React Flow state
				setNodes((nds) => nds.filter((n) => n.id !== nodeId));
				setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

				// 4. Update currentProjectGraphData
				setCurrentProjectGraphData((prevData) => {
					if (!prevData) return null;
					const updatedConstraintNodes = prevData.constraintNodes.filter((cn) => cn.id !== nodeId);
					const updatedSequenceNodes = prevData.sequenceNodes.filter((sn) => sn.id !== nodeId);
					const updatedEdges = prevData.edges.filter((e) => e.constraint_id !== nodeId && e.sequence_id !== nodeId);

					return {
						...prevData,
						constraintNodes: updatedConstraintNodes,
						sequenceNodes: updatedSequenceNodes,
						edges: updatedEdges,
					};
				});

				await _markProjectUpdated();
				console.log(`Node ${nodeId} and its connected edges deleted successfully`);
			} catch (error: unknown) {
				setGraphError(`Failed to delete node: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to delete node:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, nodes, setNodes, setEdges, _markProjectUpdated, setCurrentProjectGraphData]
	);

	// duplicate a node
	const duplicateNode = useCallback(
		async (nodeId: string) => {
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
				if (!nodeToDuplicate) {
					throw new Error(`Node with ID ${nodeId} not found in local state.`);
				}

				const originalNodeData =
					currentProjectGraphData &&
					(nodeToDuplicate.type === "constraint"
						? currentProjectGraphData.constraintNodes.find((cn) => cn.id === nodeId)
						: currentProjectGraphData.sequenceNodes.find((sn) => sn.id === nodeId));

				if (!originalNodeData || !currentProject?.id) {
					throw new Error(`Original node data for ID ${nodeId} not found or project ID missing.`);
				}

				let newNode: FlowNode | null = null;
				let newDbNode: SupabaseConstraintNode | SupabaseSequenceNode | null = null;

				const positionOffset = 20;
				const newPosition = {
					x: (nodeToDuplicate.position?.x ?? 0) + positionOffset,
					y: (nodeToDuplicate.position?.y ?? 0) + positionOffset,
				};

				if (nodeToDuplicate.type === "constraint" && "key" in originalNodeData) {
					// duplicate constraint node
					const payload = {
						key: originalNodeData.key,
						project_id: currentProject.id,
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
					// duplicate sequence node
					const payload = {
						type: originalNodeData.type,
						generator_id: originalNodeData.generator_id,
						project_id: currentProject.id,
					};
					const { data, error } = await supabase.from("sequence_nodes").insert(payload).select().single();
					if (error) throw new Error(`Supabase sequence_node insert error: ${error.message}`);
					if (!data) throw new Error("No data returned from sequence_node insertion.");
					newDbNode = data as SupabaseSequenceNode;

					// find the generator data for the FlowNode
					const generatorData = currentProjectGraphData?.generatorNodes.find((gn) => gn.id === (newDbNode && "generator_id" in newDbNode ? newDbNode.generator_id : undefined));

					newNode = {
						id: newDbNode.id,
						type: "sequence",
						position: newPosition,
						data: {
							sequence: {
								id: newDbNode.id,
								type: newDbNode.type,
								generator_id: newDbNode.generator_id,
								generator: generatorData ? { id: generatorData.id, key: generatorData.key, name: generatorData.name, hyperparameters: generatorData.hyperparameters } : undefined,
							},
						},
					};
				} else {
					throw new Error(`Unknown or mismatched node type for duplication: ${nodeToDuplicate.type}`);
				}

				// update local React Flow state
				setNodes((nds) => [...nds, newNode as FlowNode]);

				// update currentProjectGraphData
				setCurrentProjectGraphData((prevData) => {
					if (!prevData || !newDbNode) return prevData;
					const updatedConstraintNodes = [...prevData.constraintNodes];
					const updatedSequenceNodes = [...prevData.sequenceNodes];

					if (newDbNode.project_id === currentProject?.id && "key" in newDbNode) {
						updatedConstraintNodes.push(newDbNode as SupabaseConstraintNode);
					} else if (newDbNode.project_id === currentProject?.id && "type" in newDbNode) {
						updatedSequenceNodes.push(newDbNode as SupabaseSequenceNode);
					}

					return {
						...prevData,
						constraintNodes: updatedConstraintNodes,
						sequenceNodes: updatedSequenceNodes,
					};
				});

				await _markProjectUpdated();
				console.log(`Node ${nodeId} duplicated successfully with new ID: ${newNode?.id}`);
			} catch (error: unknown) {
				setGraphError(`Failed to duplicate node: ${error instanceof Error ? error.message : String(error)}`);
				console.error("Failed to duplicate node:", error);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, nodes, currentProject?.id, currentProjectGraphData, setNodes, _markProjectUpdated, setCurrentProjectGraphData]
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
		applyLayout,
		deleteNode,
		duplicateNode,
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
