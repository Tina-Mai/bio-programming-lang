import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Node, Edge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState } from "@xyflow/react";
import { ProgramNode, Constraint } from "@/types";
import {
	parseProgramJSON,
	convertProgramToFlow,
	generateLabels,
	findAndRemoveNodeFromProgram,
	findAndDuplicateNodeInProgram,
	findAndAddChildInProgram,
	findAndUpdateNodeConstraints,
	getLayoutedElements,
	defaultElkOptions,
} from "@/lib/utils";
import { useGlobal } from "./GlobalContext";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

// --- ElkJS Layout Logic Removed ---

interface ProjectContextProps {
	nodes: Node[];
	edges: Edge[];
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	onConnect: (connection: Connection) => void;
	addChildNode: (parentId: string) => Promise<void>;
	updateNodeConstraints: (nodeId: string, newConstraints: Constraint[]) => Promise<void>;
	deleteNode: (nodeId: string) => Promise<void>;
	duplicateNode: (nodeId: string) => Promise<void>;
	isProgramLoading: boolean;
	programError: string | null;
	currentProgram: ProgramNode | null;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject, updateProjectTimestamp } = useGlobal();
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [currentProgram, setCurrentProgram] = useState<ProgramNode | null>(null);
	const [isProgramLoading, setIsProgramLoading] = useState<boolean>(false);
	const [programError, setProgramError] = useState<string | null>(null);
	const supabase: SupabaseClient = createClient();

	// --- Internal Helper Functions ---

	// update program in state and DB, and update project timestamp
	const _updateProgramAndTimestamp = useCallback(
		async (programUpdater: (programCopy: ProgramNode) => ProgramNode | null | void, operationName: string) => {
			if (!currentProject || !currentProject.id) {
				console.error(`Cannot ${operationName}: No current project selected.`);
				setProgramError(`Cannot ${operationName}: No current project selected.`);
				return;
			}
			if (!currentProgram) {
				console.error(`Cannot ${operationName}: Program data is not available.`);
				setProgramError(`Cannot ${operationName}: Program data is not available.`);
				return;
			}

			setIsProgramLoading(true);
			setProgramError(null);

			try {
				let programCopy: ProgramNode;
				try {
					programCopy = structuredClone(currentProgram);
				} catch (e) {
					console.warn("structuredClone failed, falling back to JSON methods", e);
					try {
						programCopy = JSON.parse(JSON.stringify(currentProgram));
					} catch (jsonError) {
						console.error("CRITICAL: Failed to deep copy program data.", jsonError);
						throw new Error("Failed to process program data.");
					}
				}

				const updateResult = programUpdater(programCopy);
				if (updateResult === null) {
					throw new Error("Failed to process program data.");
				}

				const { error: updateError } = await supabase.from("programs").update({ program: programCopy }).eq("project_id", currentProject.id);
				if (updateError) {
					throw new Error(`Supabase program update error: ${updateError.message}`);
				}

				const newTimestamp = new Date();
				const { error: projectUpdateError } = await supabase.from("projects").update({ updated_at: newTimestamp.toISOString() }).eq("id", currentProject.id);
				if (projectUpdateError) {
					console.warn(`Failed to update project updated_at timestamp: ${projectUpdateError.message}`);
				}

				setCurrentProgram(programCopy);
				updateProjectTimestamp(currentProject.id, newTimestamp);

				console.log(`Program ${operationName} successful for project ${currentProject.id}`);
			} catch (error: unknown) {
				console.error(`Error during ${operationName}:`, error);
				const message = error instanceof Error ? error.message : "An unknown error occurred";
				setProgramError(`Failed to ${operationName}: ${message}`);
			} finally {
				setIsProgramLoading(false);
			}
		},
		[currentProject, currentProgram, supabase, setCurrentProgram, setProgramError, setIsProgramLoading, updateProjectTimestamp]
	);

	// --- Effects ---

	// fetch program data when current project changes
	useEffect(() => {
		const fetchProgram = async () => {
			if (!currentProject?.id) {
				setCurrentProgram(null);
				setNodes([]);
				setEdges([]);
				setIsProgramLoading(false);
				setProgramError(null);
				console.log("No current project ID, clearing program state.");
				return;
			}

			console.log(`Fetching program for project ID: ${currentProject.id}`);
			setIsProgramLoading(true);
			setProgramError(null);
			setCurrentProgram(null);
			setNodes([]);
			setEdges([]);

			try {
				const { data, error } = await supabase.from("programs").select("program").eq("project_id", currentProject.id).maybeSingle();

				if (error) {
					throw new Error(`Supabase fetch error: ${error.message}`);
				}

				if (data?.program) {
					const parsedProgram = parseProgramJSON(data.program);
					if (parsedProgram) {
						setCurrentProgram(parsedProgram as ProgramNode);
						console.log(`Successfully fetched and parsed program for project: ${currentProject.id}`);
					} else {
						throw new Error("Failed to parse fetched program data.");
					}
				} else {
					console.log(`No program found for project ID: ${currentProject.id}. A default might be created if needed.`);
					setCurrentProgram(null);
				}
			} catch (error: unknown) {
				console.error("Error fetching or processing program:", error);
				const message = error instanceof Error ? error.message : "An unknown error occurred";
				setProgramError(`Failed to load program: ${message}`);
				setCurrentProgram(null);
			} finally {
				setIsProgramLoading(false);
			}
		};
		fetchProgram();
	}, [currentProject?.id, supabase, setNodes, setEdges]);

	// layout calculation when program changes or loading finishes
	useEffect(() => {
		let isMounted = true;
		console.log(`Layout effect triggered. Has program: ${!!currentProgram}, Loading: ${isProgramLoading}`);

		if (!currentProgram) {
			if (!isProgramLoading && isMounted) {
				console.log("No program data OR loading finished with no program. Clearing canvas.");
				setNodes([]);
				setEdges([]);
			}
			return;
		}

		// create temp copy for processing (labeling)
		let programToProcess: ProgramNode;
		try {
			programToProcess = structuredClone(currentProgram);
		} catch (e) {
			console.warn("structuredClone failed for layout, falling back to JSON methods", e);
			try {
				programToProcess = JSON.parse(JSON.stringify(currentProgram));
			} catch (jsonError) {
				console.error("CRITICAL: Failed to deep copy program data for layout. Aborting layout.", jsonError);
				if (isMounted) setProgramError("Failed to process program data for layout.");
				return;
			}
		}

		// generate labels & convert to flow structure
		const programWithLabels = generateLabels(programToProcess);
		const { nodes: flowNodes, edges: flowEdges } = convertProgramToFlow(programWithLabels);

		if (flowNodes.length > 0) {
			// apply layout algorithm
			getLayoutedElements(flowNodes, flowEdges, defaultElkOptions)
				.then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
					if (isMounted) {
						console.log("Applying layout to nodes and edges.");
						setNodes(layoutedNodes);
						setEdges(layoutedEdges);
					}
				})
				.catch((error) => {
					console.error("Error during layout calculation:", error);
					if (isMounted) {
						console.warn("Falling back to non-layouted nodes/edges due to layout error.");
						setNodes(flowNodes);
						setEdges(flowEdges);
					}
				});
		} else {
			if (isMounted) {
				console.warn("Program converted to empty nodes/edges array. Clearing canvas.");
				setNodes([]);
				setEdges([]);
			}
		}
		return () => {
			isMounted = false;
			console.log("Layout effect cleanup.");
		};
	}, [currentProgram, isProgramLoading, setNodes, setEdges]);

	// --- Public API Methods ---

	// connect two nodes
	const onConnect = useCallback(
		(connection: Connection) => {
			const newEdge: Edge = {
				id: `e-${connection.source}-${connection.target}`,
				source: connection.source!,
				target: connection.target!,
				type: "default",
				animated: true,
				style: { stroke: "#334155" },
			};
			setEdges((eds) => addEdge(newEdge, eds));
			console.warn("Edge added visually. Persistence to program structure is not implemented.");
		},
		[setEdges]
	);

	// add a child node to a parent node
	const addChildNode = useCallback(
		async (parentId: string) => {
			await _updateProgramAndTimestamp((programCopy) => {
				const newChildId = uuidv4();
				const newProgramNode: ProgramNode = {
					id: newChildId,
					children: [],
					constraints: [],
				};
				const added = findAndAddChildInProgram(programCopy, parentId, newProgramNode);
				if (!added) {
					throw new Error(`Could not find parent node with ID ${parentId} to add child.`);
				}
			}, "add child node");
		},
		[_updateProgramAndTimestamp]
	);

	// update constraints for a node
	const updateNodeConstraints = useCallback(
		async (nodeId: string, newConstraints: Constraint[]) => {
			await _updateProgramAndTimestamp((programCopy) => {
				const updated = findAndUpdateNodeConstraints(programCopy, nodeId, newConstraints);
				if (!updated) {
					throw new Error(`Could not find node with ID ${nodeId} to update constraints.`);
				}
			}, "update node constraints");
		},
		[_updateProgramAndTimestamp]
	);

	// delete a node (and its children)
	const deleteNode = useCallback(
		async (nodeId: string) => {
			// prevent deleting root node
			if (currentProgram?.id === nodeId) {
				console.warn("Attempted to delete the root node.");
				setProgramError("Cannot delete the root node.");
				return;
			}

			await _updateProgramAndTimestamp((programCopy) => {
				const removed = findAndRemoveNodeFromProgram(programCopy, nodeId);
				if (!removed) {
					throw new Error(`Could not find node with ID ${nodeId} to delete.`);
				}
			}, "delete node");
		},
		[currentProgram?.id, _updateProgramAndTimestamp, setProgramError]
	);

	// duplicate a node (and its children)
	const duplicateNode = useCallback(
		async (nodeId: string) => {
			// prevent duplicating root node
			if (currentProgram?.id === nodeId) {
				console.warn("Attempted to duplicate the root node.");
				setProgramError("Cannot duplicate the root node.");
				return;
			}

			await _updateProgramAndTimestamp((programCopy) => {
				const duplicated = findAndDuplicateNodeInProgram(programCopy, nodeId);
				if (!duplicated) {
					throw new Error(`Could not find node with ID ${nodeId} to duplicate.`);
				}
			}, "duplicate node");
		},
		[currentProgram?.id, _updateProgramAndTimestamp, setProgramError]
	);

	// --- Context Provider Value ---

	const value: ProjectContextProps = {
		nodes,
		edges,
		setNodes,
		setEdges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		addChildNode,
		updateNodeConstraints,
		deleteNode,
		duplicateNode,
		isProgramLoading,
		programError,
		currentProgram,
	};

	return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

// --- Hook ---

export const useProject = (): ProjectContextProps => {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error("useProject must be used within a ProjectProvider");
	}
	return context;
};
