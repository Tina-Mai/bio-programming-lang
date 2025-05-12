import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Node as FlowNode, Edge as FlowEdge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState } from "@xyflow/react";
import {
	// Types from @/types/Node.ts representing DB table structures (camelCased)
	SequenceNode as AppSequenceNode,
	ConstraintNode as AppConstraintNode,
	GeneratorNode as AppGeneratorNode,
	Edge as AppDBEdgeDefinition, // Renamed to avoid confusion with FlowEdge
	Constraint, // General Constraint type for constraint definitions within a node, if needed.
} from "@/types";

import { convertProjectDataToFlow, SupabaseSequenceNode, SupabaseConstraintNode, SupabaseGeneratorNode, SupabaseDBEdge } from "@/lib/utils/flowUtils";
import { getLayoutedElements, defaultElkOptions } from "@/lib/utils/layout";

import { useGlobal } from "./GlobalContext";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

// Structure for the raw graph data fetched from Supabase (using types from flowUtils)
export interface ProjectGraphData {
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

	isGraphLoading: boolean;
	graphError: string | null;
	currentProjectGraphData: ProjectGraphData | null;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject, updateProjectTimestamp } = useGlobal();
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

	const [currentProjectGraphData, setCurrentProjectGraphData] = useState<ProjectGraphData | null>(null);
	const [isGraphLoading, setIsGraphLoading] = useState<boolean>(false);
	const [graphError, setGraphError] = useState<string | null>(null);
	const supabase: SupabaseClient = createClient();

	// Simplified helper for now, mainly for timestamp updates after an operation.
	// Specific DB operations will be more direct.
	const _markProjectUpdated = useCallback(async () => {
		if (!currentProject?.id) return;
		const newTimestamp = new Date();
		const { error: projectUpdateError } = await supabase.from("projects").update({ updated_at: newTimestamp.toISOString() }).eq("id", currentProject.id);
		if (projectUpdateError) {
			console.warn(`Failed to update project updated_at timestamp: ${projectUpdateError.message}`);
		}
		updateProjectTimestamp(currentProject.id, newTimestamp);
	}, [currentProject, supabase, updateProjectTimestamp]);

	// Fetch project graph data when current project changes
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

				// Fetch nodes first
				const [cnResult, snResult, gnResult] = await Promise.all([
					supabase.from("constraint_nodes").select("*").eq("project_id", projectId),
					supabase.from("sequence_nodes").select("*").eq("project_id", projectId),
					supabase.from("generator_nodes").select("*").eq("project_id", projectId),
				]);

				if (cnResult.error) throw new Error(`Supabase fetch error (constraint_nodes): ${cnResult.error.message}`);
				if (snResult.error) throw new Error(`Supabase fetch error (sequence_nodes): ${snResult.error.message}`);
				if (gnResult.error) throw new Error(`Supabase fetch error (generator_nodes): ${gnResult.error.message}`);

				const fetchedConstraintNodes = (cnResult.data as SupabaseConstraintNode[]) || [];
				const fetchedSequenceNodes = (snResult.data as SupabaseSequenceNode[]) || [];
				const fetchedGeneratorNodes = (gnResult.data as SupabaseGeneratorNode[]) || [];

				let fetchedEdges: SupabaseDBEdge[] = [];
				const constraintNodeIds = fetchedConstraintNodes.map((n) => n.id);
				const sequenceNodeIdsSet = new Set(fetchedSequenceNodes.map((n) => n.id)); // For efficient lookup

				if (constraintNodeIds.length > 0) {
					const { data: dbEdges, error: edgeError } = await supabase.from("edges").select("*").in("constraint_id", constraintNodeIds);

					if (edgeError) throw new Error(`Supabase fetch error (edges): ${edgeError.message}`);

					if (dbEdges) {
						// Filter edges to ensure they connect to sequence nodes also in this project
						fetchedEdges = (dbEdges as SupabaseDBEdge[]).filter((edge) => sequenceNodeIdsSet.has(edge.sequence_id));
					}
				} else {
					// No constraint nodes, so no edges to fetch based on them
					fetchedEdges = [];
				}

				const fetchedData: ProjectGraphData = {
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

	// Layout calculation effect
	useEffect(() => {
		let isMounted = true;
		if (!currentProjectGraphData || isGraphLoading) {
			if (!isGraphLoading && isMounted) {
				// Only clear if not loading and no data
				setNodes([]);
				setEdges([]);
			}
			return;
		}

		const { nodes: convertedNodes, edges: convertedEdges } = convertProjectDataToFlow(currentProjectGraphData);
		console.log("Converted to flow: ", { convertedNodes, convertedEdges });

		if (convertedNodes.length > 0 || convertedEdges.length > 0) {
			getLayoutedElements(convertedNodes, convertedEdges, defaultElkOptions)
				.then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
					if (isMounted) {
						console.log("Applying layout: ", { layoutedNodes, layoutedEdges });
						setNodes(layoutedNodes);
						setEdges(layoutedEdges);
					}
				})
				.catch((error) => {
					console.error("Error during layout calculation:", error);
					if (isMounted) {
						console.warn("Falling back to non-layouted nodes/edges due to layout error.");
						setNodes(convertedNodes);
						setEdges(convertedEdges);
					}
				});
		} else {
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
				// project_id: currentProject.id, // Not needed if edges table doesn't have it
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

	const value: ProjectContextProps = {
		nodes,
		edges,
		setNodes,
		setEdges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		isGraphLoading,
		graphError,
		currentProjectGraphData,
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
