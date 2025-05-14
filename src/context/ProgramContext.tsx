import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState, useRef } from "react";
import { Node as FlowNode, Edge as FlowEdge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState } from "@xyflow/react";
import { convertProjectDataToFlow, SupabaseSequenceNode, SupabaseConstraintNode, SupabaseGeneratorNode, SupabaseDBEdge, RawProgramGraphData, SupabaseProgram } from "@/lib/utils";
import { getLayoutedElements } from "@/lib/utils/layout";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Constraint } from "@/types/Constraint";
import { SequenceType } from "@/types/Node";
import { Generator } from "@/types/Generator";

interface ProgramProviderProps {
	children: ReactNode;
	currentProgram: SupabaseProgram | null;
	currentProjectId: string | undefined;
	onProgramModified: (programId: string, newTimestamp: Date) => void;
}

interface ProgramContextProps {
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
	currentProgramGraphData: RawProgramGraphData | null;
	updateConstraintNodeConstraint: (nodeId: string, constraint: Constraint) => Promise<void>;
	updateSequenceNodeType: (nodeId: string, type: SequenceType) => Promise<void>;
	updateSequenceNodeGenerator: (nodeId: string, generator: Generator) => Promise<void>;
	applyLayout: () => void;
	deleteNode: (nodeId: string) => Promise<void>;
	duplicateNode: (nodeId: string) => Promise<void>;
	addConstraintNode: () => Promise<void>;
	addSequenceNode: () => Promise<void>;
}

const ProgramContext = createContext<ProgramContextProps | undefined>(undefined);

export const ProgramProvider = ({ children, currentProgram, currentProjectId, onProgramModified }: ProgramProviderProps) => {
	const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

	// Refs to hold the latest nodes and edges for use in effects without adding them as dependencies
	const nodesRef = useRef(nodes);
	useEffect(() => {
		nodesRef.current = nodes;
	}, [nodes]);

	const edgesRef = useRef(edges);
	useEffect(() => {
		edgesRef.current = edges;
	}, [edges]);

	const [currentProgramGraphData, setCurrentProgramGraphData] = useState<RawProgramGraphData | null>(null);
	const [isGraphLoading, setIsGraphLoading] = useState<boolean>(false);
	const [graphError, setGraphError] = useState<string | null>(null);
	const supabase: SupabaseClient = createClient();

	const _markProgramUpdated = useCallback(async () => {
		if (!currentProgram?.id) return;
		const newTimestamp = new Date();
		onProgramModified(currentProgram.id, newTimestamp);
	}, [currentProgram, onProgramModified]);

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
			let findQuery = supabase.from("generators").select("*").eq("key", generator.key);

			const selectedHParams = generator.hyperparameters;
			if (selectedHParams === undefined || (typeof selectedHParams === "object" && Object.keys(selectedHParams).length === 0)) {
				findQuery = findQuery.or("hyperparameters.is.null,hyperparameters.eq.{}");
			} else {
				findQuery = findQuery.eq("hyperparameters", selectedHParams);
			}

			findQuery = findQuery.or(userId ? `user_id.eq.${userId},user_id.is.null` : "user_id.is.null").limit(1);
			const { data: existingGenerators, error: fetchGenError } = await findQuery;

			if (fetchGenError) throw new Error(`Supabase fetch error (generators): ${fetchGenError.message}`);

			if (existingGenerators && existingGenerators.length > 0) {
				return {
					generatorId: existingGenerators[0].id,
					generatorNode: existingGenerators[0] as SupabaseGeneratorNode,
					isNew: false,
				};
			}

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

			return {
				generatorId: newGeneratorData.id,
				generatorNode: newGeneratorData as SupabaseGeneratorNode,
				isNew: true,
			};
		},
		[supabase]
	);

	useEffect(() => {
		const fetchProgramGraphDetail = async () => {
			if (!currentProgram?.id) {
				setCurrentProgramGraphData(null);
				setNodes([]);
				setEdges([]);
				setIsGraphLoading(false);
				setGraphError(null);
				return;
			}

			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const programId = currentProgram.id;
				console.log(`ProgramProvider: Fetching graph data for program ID: ${programId}`);

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

				const { data: dbEdges, error: edgeError } = await supabase.from("edges").select("*").eq("program_id", programId);
				if (edgeError) throw new Error(`Supabase fetch error (edges): ${edgeError.message}`);

				const fetchedConstraintNodeIds = new Set(fetchedConstraintNodes.map((n) => n.id));
				const fetchedSequenceNodeIds = new Set(fetchedSequenceNodes.map((n) => n.id));
				let fetchedEdges: SupabaseDBEdge[] = [];
				if (dbEdges) {
					fetchedEdges = (dbEdges as SupabaseDBEdge[]).filter((edge) => fetchedConstraintNodeIds.has(edge.constraint_id) && fetchedSequenceNodeIds.has(edge.sequence_id));
				}

				const graphData: RawProgramGraphData = {
					program: currentProgram,
					constraintNodes: fetchedConstraintNodes,
					sequenceNodes: fetchedSequenceNodes,
					generatorNodes: fetchedGeneratorNodes,
					edges: fetchedEdges,
				};
				setCurrentProgramGraphData(graphData);
			} catch (error: unknown) {
				console.error("ProgramProvider: Error fetching program graph data:", error);
				setGraphError(error instanceof Error ? error.message : "An unknown error occurred");
				setCurrentProgramGraphData(null);
				setNodes([]);
				setEdges([]);
			} finally {
				setIsGraphLoading(false);
			}
		};

		if (currentProgram?.id) {
			setNodes([]);
			setEdges([]);
			setCurrentProgramGraphData(null);
			fetchProgramGraphDetail();
		} else {
			setNodes([]);
			setEdges([]);
			setCurrentProgramGraphData(null);
			setIsGraphLoading(false);
			setGraphError(null);
		}
	}, [currentProgram, supabase, setNodes, setEdges]);

	const applyLayout = useCallback(() => {
		setNodes((currentNodes) => {
			setEdges((currentEdges) => {
				if (currentNodes.length === 0 && currentEdges.length === 0) return currentEdges;
				const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(currentNodes, currentEdges);
				queueMicrotask(() => setNodes(layoutedNodes));
				return layoutedEdges;
			});
			return currentNodes;
		});
	}, [setNodes, setEdges]);

	useEffect(() => {
		let isMounted = true;
		if (!currentProgramGraphData || isGraphLoading) {
			if (!isGraphLoading && isMounted && !currentProgramGraphData) {
				if (isMounted) {
					setNodes([]);
					setEdges([]);
				}
			}
			return () => {
				isMounted = false;
			};
		}

		const { nodes: convertedNodes, edges: convertedEdges } = convertProjectDataToFlow(currentProgramGraphData, nodesRef.current);
		// console.log("ProgramProvider: Converted to flow using nodesRef: ", { convertedNodes, convertedEdges });

		if (isMounted) {
			setNodes(convertedNodes);
			setEdges(convertedEdges);
		}
		return () => {
			isMounted = false;
		};
	}, [currentProgramGraphData, isGraphLoading, setNodes, setEdges]);

	const onConnect = useCallback(
		async (connection: Connection) => {
			if (!currentProjectId || !currentProgram || !currentProgram.id || !connection.source || !connection.target) {
				setGraphError("Cannot connect: missing project, program, or node information.");
				return;
			}
			const sourceNode = nodes.find((n) => n.id === connection.source);
			const targetNode = nodes.find((n) => n.id === connection.target);

			if (sourceNode?.type !== "constraint" || targetNode?.type !== "sequence") {
				setGraphError("Invalid connection: Edges can only go from Constraint to Sequence nodes.");
				return;
			}
			const existingEdge = currentProgramGraphData?.edges.find((edge) => edge.constraint_id === connection.source && edge.sequence_id === connection.target);
			if (existingEdge) {
				setGraphError("An edge already exists between these two nodes.");
				return;
			}
			const newEdgePayload = { constraint_id: connection.source, sequence_id: connection.target, program_id: currentProgram.id };
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { data: insertedEdge, error: insertError } = await supabase.from("edges").insert(newEdgePayload).select().single();
				if (insertError) throw new Error(`Supabase edge insert error: ${insertError.message}`);
				if (!insertedEdge) throw new Error("No data returned from edge insertion.");
				const reactFlowEdge: FlowEdge = { id: insertedEdge.id, source: insertedEdge.constraint_id, target: insertedEdge.sequence_id };
				setEdges((eds) => addEdge(reactFlowEdge, eds));
				await _markProgramUpdated();
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return { ...prevData, edges: [...prevData.edges, insertedEdge as SupabaseDBEdge] };
				});
			} catch (error: unknown) {
				setGraphError(`Failed to add edge: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[currentProjectId, currentProgram, supabase, _markProgramUpdated, setEdges, nodes, currentProgramGraphData, setCurrentProgramGraphData]
	);

	const updateConstraintNodeConstraint = useCallback(
		async (nodeId: string, constraint: Constraint) => {
			if (!currentProgram?.id) {
				setGraphError("No active program");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("constraint_nodes").update({ key: constraint.key }).eq("id", nodeId).eq("program_id", currentProgram.id);
				if (error) throw new Error(error.message);
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return { ...prevData, constraintNodes: prevData.constraintNodes.map((cn) => (cn.id === nodeId ? { ...cn, key: constraint.key } : cn)) };
				});
				setNodes((prevNodes) => prevNodes.map((node) => (node.id === nodeId && node.type === "constraint" ? { ...node, data: { ...node.data, constraint } } : node)));
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update constraint: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProgramUpdated, setCurrentProgramGraphData, currentProgram?.id]
	);

	const updateSequenceNodeType = useCallback(
		async (nodeId: string, type: SequenceType) => {
			if (!currentProgram?.id) {
				setGraphError("No active program");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("sequence_nodes").update({ type }).eq("id", nodeId).eq("program_id", currentProgram.id);
				if (error) throw new Error(error.message);
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return { ...prevData, sequenceNodes: prevData.sequenceNodes.map((sn) => (sn.id === nodeId ? { ...sn, type: type } : sn)) };
				});
				setNodes((prevNodes) =>
					prevNodes.map((node) => {
						if (node.id === nodeId && node.type === "sequence") {
							const currentSequenceData = (node.data && (node.data as { sequence?: Record<string, unknown> }).sequence) || {};
							return { ...node, data: { ...node.data, sequence: { ...currentSequenceData, type } } };
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
		[supabase, setNodes, _markProgramUpdated, setCurrentProgramGraphData, currentProgram?.id]
	);

	const updateSequenceNodeGenerator = useCallback(
		async (nodeId: string, generator: Generator) => {
			if (!currentProgram?.id) {
				setGraphError("No active program");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				const userId = user?.id;
				const { generatorId, generatorNode } = await _getOrCreateGenerator(generator, userId);
				const { error: updateSeqError } = await supabase.from("sequence_nodes").update({ generator_id: generatorId }).eq("id", nodeId).eq("program_id", currentProgram.id);
				if (updateSeqError) throw new Error(`Supabase sequence_node update error: ${updateSeqError.message}`);
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					const updatedSequenceNodes = prevData.sequenceNodes.map((sn) => (sn.id === nodeId ? { ...sn, generator_id: generatorId } : sn));
					const updatedGeneratorNodes = [...prevData.generatorNodes];
					if (!updatedGeneratorNodes.some((gn) => gn.id === generatorId)) {
						updatedGeneratorNodes.push(generatorNode);
					}
					return { ...prevData, sequenceNodes: updatedSequenceNodes, generatorNodes: updatedGeneratorNodes };
				});
				setNodes((prevNodes) =>
					prevNodes.map((node) => {
						if (node.id === nodeId && node.type === "sequence") {
							const currentSequenceData = (node.data && (node.data as { sequence?: Record<string, unknown> }).sequence) || {};
							return { ...node, data: { ...node.data, sequence: { ...currentSequenceData, generator: generator } } };
						}
						return node;
					})
				);
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to update generator: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setNodes, _markProgramUpdated, setCurrentProgramGraphData, _getOrCreateGenerator, currentProgram?.id]
	);

	const deleteEdge = useCallback(
		async (edgeId: string) => {
			if (!currentProgram?.id) {
				setGraphError("No active program");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const { error } = await supabase.from("edges").delete().eq("id", edgeId).eq("program_id", currentProgram.id);
				if (error) throw new Error(`Supabase edge delete error: ${error.message}`);
				setEdges((eds) => eds.filter((e) => e.id !== edgeId));
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return { ...prevData, edges: prevData.edges.filter((e) => e.id !== edgeId) };
				});
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to delete edge: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, setEdges, _markProgramUpdated, setCurrentProgramGraphData, currentProgram?.id]
	);

	const deleteNode = useCallback(
		async (nodeId: string) => {
			if (!currentProgram?.id) {
				setGraphError("No active program");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const nodeToDelete = nodes.find((n) => n.id === nodeId);
				if (!nodeToDelete) throw new Error(`Node with ID ${nodeId} not found.`);
				const nodeTable = nodeToDelete.type === "constraint" ? "constraint_nodes" : "sequence_nodes";

				const { error: edgeDeleteError } = await supabase.from("edges").delete().eq("program_id", currentProgram.id).or(`constraint_id.eq.${nodeId},sequence_id.eq.${nodeId}`);
				if (edgeDeleteError) throw new Error(`Supabase edge delete error for node ${nodeId}: ${edgeDeleteError.message}`);

				const { error: nodeDeleteError } = await supabase.from(nodeTable).delete().eq("id", nodeId).eq("program_id", currentProgram.id);
				if (nodeDeleteError) throw new Error(`Supabase ${nodeTable} delete error: ${nodeDeleteError.message}`);

				setNodes((nds) => nds.filter((n) => n.id !== nodeId));
				setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
				setCurrentProgramGraphData((prevData) => {
					if (!prevData) return null;
					return {
						...prevData,
						constraintNodes: prevData.constraintNodes.filter((cn) => cn.id !== nodeId),
						sequenceNodes: prevData.sequenceNodes.filter((sn) => sn.id !== nodeId),
						edges: prevData.edges.filter((e) => e.constraint_id !== nodeId && e.sequence_id !== nodeId),
					};
				});
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to delete node: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, nodes, setNodes, setEdges, _markProgramUpdated, setCurrentProgramGraphData, currentProgram?.id]
	);

	const duplicateNode = useCallback(
		async (nodeId: string) => {
			if (!currentProjectId || !currentProgram?.id) {
				setGraphError("Cannot duplicate: Missing project/program ID.");
				return;
			}
			setIsGraphLoading(true);
			setGraphError(null);
			try {
				const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
				if (!nodeToDuplicate) throw new Error(`Node ID ${nodeId} not found.`);
				const originalNodeData =
					currentProgramGraphData &&
					(nodeToDuplicate.type === "constraint"
						? currentProgramGraphData.constraintNodes.find((cn) => cn.id === nodeId)
						: currentProgramGraphData.sequenceNodes.find((sn) => sn.id === nodeId));
				if (!originalNodeData) throw new Error(`Original data for node ID ${nodeId} not found.`);

				let newDbNode: SupabaseConstraintNode | SupabaseSequenceNode | null = null;
				let newFlowNode: FlowNode | null = null;
				const positionOffset = { x: (nodeToDuplicate.position?.x ?? 0) + 20, y: (nodeToDuplicate.position?.y ?? 0) + 20 };

				if (nodeToDuplicate.type === "constraint" && "key" in originalNodeData) {
					const payload = { key: originalNodeData.key, project_id: currentProjectId, program_id: currentProgram.id };
					const { data, error } = await supabase.from("constraint_nodes").insert(payload).select().single();
					if (error) throw error;
					newDbNode = data as SupabaseConstraintNode;
					newFlowNode = { id: newDbNode.id, type: "constraint", position: positionOffset, data: { constraint: { key: newDbNode.key } } };
				} else if (nodeToDuplicate.type === "sequence" && "type" in originalNodeData) {
					const typedOriginalNodeData = originalNodeData as SupabaseSequenceNode;
					const payload = {
						type: typedOriginalNodeData.type,
						generator_id: typedOriginalNodeData.generator_id,
						project_id: currentProjectId,
						program_id: currentProgram.id,
						sequence: typedOriginalNodeData.sequence,
						metadata: typedOriginalNodeData.metadata,
					};
					const { data, error } = await supabase.from("sequence_nodes").insert(payload).select().single();
					if (error) throw error;
					newDbNode = data as SupabaseSequenceNode;
					const generatorData = currentProgramGraphData?.generatorNodes.find((gn) => gn.id === typedOriginalNodeData.generator_id);
					newFlowNode = {
						id: newDbNode.id,
						type: "sequence",
						position: positionOffset,
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
					throw new Error("Unknown or mismatched node type for duplication.");
				}

				if (newFlowNode) setNodes((nds) => [...nds, newFlowNode]);
				setCurrentProgramGraphData((prevData) => {
					if (!prevData || !newDbNode) return prevData;
					const updatedConstraintNodes = [...prevData.constraintNodes];
					const updatedSequenceNodes = [...prevData.sequenceNodes];
					if (newDbNode.program_id === currentProgram?.id) {
						if ("key" in newDbNode) updatedConstraintNodes.push(newDbNode as SupabaseConstraintNode);
						else if ("type" in newDbNode) updatedSequenceNodes.push(newDbNode as SupabaseSequenceNode);
					}
					return { ...prevData, constraintNodes: updatedConstraintNodes, sequenceNodes: updatedSequenceNodes };
				});
				await _markProgramUpdated();
			} catch (error: unknown) {
				setGraphError(`Failed to duplicate node: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsGraphLoading(false);
			}
		},
		[supabase, nodes, currentProjectId, currentProgram, currentProgramGraphData, setNodes, _markProgramUpdated, setCurrentProgramGraphData]
	);

	const addConstraintNode = useCallback(async () => {
		if (!currentProjectId || !currentProgram?.id) {
			setGraphError("Cannot add node: Missing project/program ID.");
			return;
		}
		setIsGraphLoading(true);
		setGraphError(null);
		try {
			const payload = { key: null, project_id: currentProjectId, program_id: currentProgram.id };
			const { data, error } = await supabase.from("constraint_nodes").insert(payload).select().single();
			if (error) throw error;
			const newDbNode = data as SupabaseConstraintNode;
			const newFlowNode: FlowNode = { id: newDbNode.id, type: "constraint", position: { x: 100, y: 100 }, data: { constraint: null } };
			setNodes((nds) => [...nds, newFlowNode]);
			setCurrentProgramGraphData((prevData) => {
				if (!prevData) return null;
				return { ...prevData, constraintNodes: [...prevData.constraintNodes, newDbNode] };
			});
			await _markProgramUpdated();
		} catch (error: unknown) {
			setGraphError(`Failed to add constraint node: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsGraphLoading(false);
		}
	}, [currentProjectId, currentProgram?.id, supabase, setNodes, setCurrentProgramGraphData, _markProgramUpdated]);

	const addSequenceNode = useCallback(async () => {
		if (!currentProjectId || !currentProgram?.id) {
			setGraphError("Cannot add node: Missing project/program ID.");
			return;
		}
		setIsGraphLoading(true);
		setGraphError(null);
		try {
			const payload = { type: null, sequence: null, project_id: currentProjectId, program_id: currentProgram.id, generator_id: null };
			const { data, error } = await supabase.from("sequence_nodes").insert(payload).select().single();
			if (error) throw error;
			const newDbNode = data as SupabaseSequenceNode;
			const newFlowNode: FlowNode = {
				id: newDbNode.id,
				type: "sequence",
				position: { x: 150, y: 150 },
				data: { sequence: { id: newDbNode.id, type: newDbNode.type, sequence: newDbNode.sequence, project_id: newDbNode.project_id, program_id: newDbNode.program_id } },
			};
			setNodes((nds) => [...nds, newFlowNode]);
			setCurrentProgramGraphData((prevData) => {
				if (!prevData) return null;
				return { ...prevData, sequenceNodes: [...prevData.sequenceNodes, newDbNode] };
			});
			await _markProgramUpdated();
		} catch (error: unknown) {
			setGraphError(`Failed to add sequence node: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsGraphLoading(false);
		}
	}, [currentProjectId, currentProgram?.id, supabase, setNodes, setCurrentProgramGraphData, _markProgramUpdated]);

	const value: ProgramContextProps = {
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
		updateConstraintNodeConstraint,
		updateSequenceNodeType,
		updateSequenceNodeGenerator,
		applyLayout,
		deleteNode,
		duplicateNode,
		addConstraintNode,
		addSequenceNode,
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
