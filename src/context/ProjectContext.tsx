import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect } from "react";
import { Node, Edge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState, Position } from "@xyflow/react";
import ELK, { ElkNode, ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk.bundled.js";
import { Program, ProgramNode } from "@/types";
import { parseProgramJSON, convertProgramToFlow, generateLabels } from "@/lib";
import { NodeData } from "@/types";
import { useGlobal } from "./GlobalContext";
import { v4 as uuidv4 } from "uuid";

// --- ElkJS Layout Logic Start ---
const elk = new ELK();

const nodeWidth = 172;
const nodeHeight = 60;

// default ElkJS options
const elkOptions: LayoutOptions = {
	"elk.algorithm": "layered",
	"elk.direction": "DOWN",
	"elk.layered.spacing.nodeNodeBetweenLayers": "100",
	"elk.spacing.nodeNode": "80",
	"org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
	"elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};

// Type definition for layouted Elk nodes
interface LayoutedElkNode extends ElkNode {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	children?: LayoutedElkNode[];
	edges?: ElkExtendedEdge[];
}

const standardNodeWidth = 60;
const standardNodeTopPadding = 65;

// build nested Elk node structure
const buildElkHierarchy = (nodes: Node[]): ElkNode[] => {
	const elkNodeMap = new Map<string, ElkNode>();
	const rootElkNodes: ElkNode[] = [];

	// create ElkNode objects for all nodes
	nodes.forEach((node) => {
		const elkNode: ElkNode = {
			id: node.id,
			width: nodeWidth,
			height: nodeHeight,
			...(node.type === "group" && {
				layoutOptions: {
					"elk.padding": "[top=70,left=20,bottom=20,right=20]",
					"org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
				},
			}),
			children: [],
		};
		elkNodeMap.set(node.id, elkNode);
	});

	// build the hierarchy
	nodes.forEach((node) => {
		const elkNode = elkNodeMap.get(node.id)!;
		if (node.parentId && elkNodeMap.has(node.parentId)) {
			const parentElkNode = elkNodeMap.get(node.parentId)!;
			parentElkNode.children = parentElkNode.children || [];
			parentElkNode.children.push(elkNode);
		} else {
			rootElkNodes.push(elkNode);
		}
	});

	return rootElkNodes;
};

// recursively flatten layouted nodes and adjust positions
const flattenLayoutedNodes = (layoutedElkNodes: LayoutedElkNode[], isHorizontal: boolean, rfNodeMap: Map<string, Node>, layoutedGroupMap: Map<string, LayoutedElkNode>): Node[] => {
	let rfNodes: Node[] = [];
	layoutedElkNodes.forEach((elkNode) => {
		const originalNode = rfNodeMap.get(elkNode.id);
		if (!originalNode) {
			console.warn(`Original RF node not found for Elk node ID: ${elkNode.id}`);
			return;
		}

		let calculatedPosition = { x: elkNode.x ?? 0, y: elkNode.y ?? 0 };
		const isGroup = originalNode.type === "group";

		if (!isGroup && originalNode.parentId) {
			const parentGroup = layoutedGroupMap.get(originalNode.parentId);
			if (parentGroup) {
				const parentWidth = parentGroup.width ?? 0;

				calculatedPosition = {
					x: parentWidth / 2 - standardNodeWidth / 2,
					y: standardNodeTopPadding,
				};
			} else {
				console.warn(`Parent group node not found for standard node ID: ${elkNode.id}`);
			}
		}

		rfNodes.push({
			...originalNode,
			position: calculatedPosition,
			targetPosition: isHorizontal ? Position.Left : Position.Top,
			sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
			style: {
				...originalNode.style,
				...(isGroup && {
					width: elkNode.width,
					height: elkNode.height,
				}),
			},
		});

		if (elkNode.children && elkNode.children.length > 0) {
			rfNodes = rfNodes.concat(flattenLayoutedNodes(elkNode.children, isHorizontal, rfNodeMap, layoutedGroupMap));
		}
	});
	return rfNodes;
};

// get layouted elements using ElkJS
const getLayoutedElements = async (nodes: Node[], edges: Edge[], options: LayoutOptions = elkOptions): Promise<{ nodes: Node[]; edges: Edge[] }> => {
	const isHorizontal = options?.["elk.direction"] === "RIGHT" || options?.["elk.direction"] === "LEFT";
	const rfNodeMap = new Map<string, Node>(nodes.map((node) => [node.id, node]));
	const rfEdgeMap = new Map<string, Edge>(edges.map((edge) => [edge.id, edge]));
	const elkNodesHierarchy = buildElkHierarchy(nodes.map((n) => rfNodeMap.get(n.id)!));

	const graph: ElkNode = {
		id: "root",
		layoutOptions: options,
		children: elkNodesHierarchy,
		edges: edges.map(
			(edge): ElkExtendedEdge => ({
				id: edge.id,
				sources: [edge.source],
				targets: [edge.target],
			})
		),
	};

	try {
		const layoutedGraph = (await elk.layout(graph)) as LayoutedElkNode;

		// create a map of layouted group nodes for position calculation
		const layoutedGroupMap = new Map<string, LayoutedElkNode>();
		const collectGroups = (elkNodes: LayoutedElkNode[]) => {
			elkNodes.forEach((node) => {
				if (node.id.startsWith("group-")) {
					layoutedGroupMap.set(node.id, node);
				}
				if (node.children) {
					collectGroups(node.children);
				}
			});
		};
		collectGroups(layoutedGraph.children ?? []);

		// flatten the layouted nodes and adjust standard node positions
		const finalNodes = flattenLayoutedNodes(layoutedGraph.children ?? [], isHorizontal, rfNodeMap, layoutedGroupMap);

		// map layouted Elk edges back (retrieve original from map)
		const finalEdges =
			layoutedGraph.edges
				?.map((elkEdge: ElkExtendedEdge): Edge | undefined => {
					return rfEdgeMap.get(elkEdge.id);
				})
				.filter((edge): edge is Edge => edge !== undefined) ?? [];

		return { nodes: finalNodes, edges: finalEdges };
	} catch (error) {
		console.error("ElkJS layout failed:", error);
		return { nodes, edges };
	}
};
// --- ElkJS Layout Logic End ---

interface ProjectContextProps {
	nodes: Node[];
	edges: Edge[];
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	onConnect: (connection: Connection) => void;
	addChildNode: (parentId: string) => void;
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

// Helper function to find a node in the program tree and add a child
const findAndAddChildInProgram = (programNode: ProgramNode, parentId: string, newChild: ProgramNode): boolean => {
	if (programNode.id === parentId) {
		programNode.children.push(newChild);
		return true;
	}
	for (const child of programNode.children) {
		if (findAndAddChildInProgram(child, parentId, newChild)) {
			return true;
		}
	}
	return false;
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const { currentProject } = useGlobal();
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

	// run layout when currentProject changes
	useEffect(() => {
		let isMounted = true;

		if (currentProject && currentProject.program) {
			const parsedProgram = parseProgramJSON(currentProject.program);

			if (parsedProgram) {
				const programWithLabels = generateLabels(parsedProgram as NodeData);
				const { nodes: convertedNodes, edges: convertedEdges } = convertProgramToFlow(programWithLabels as Program);

				if (convertedNodes.length > 0) {
					getLayoutedElements(convertedNodes, convertedEdges, elkOptions)
						.then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
							if (isMounted) {
								setNodes(layoutedNodes);
								// Important: Use the layoutedEdges *returned by getLayoutedElements*
								setEdges(layoutedEdges);
								console.log("ElkJS layout applied for project:", currentProject.id);
							}
						})
						.catch((error) => {
							console.error("Error during ElkJS layout:", error);
							if (isMounted) {
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
			} else {
				console.error("Failed to parse program data for project:", currentProject.id);
				if (isMounted) {
					setNodes([]);
					setEdges([]);
				}
			}
		} else {
			if (isMounted) {
				setNodes([]);
				setEdges([]);
			}
		}

		return () => {
			isMounted = false;
		};
	}, [currentProject, setNodes, setEdges]);

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
		},
		[setEdges]
	);

	// Function to add a new child node, update program, relabel, and re-layout
	const addChildNode = useCallback(
		async (parentId: string) => {
			if (!currentProject || !currentProject.program) {
				console.error("Cannot add node: No current project or program data.");
				return;
			}

			// 1. Parse the current program structure
			// Create a deep copy to avoid mutating the original state directly before update
			const programCopy = JSON.parse(JSON.stringify(currentProject.program));
			const parsedProgram = parseProgramJSON(programCopy);

			if (!parsedProgram) {
				console.error("Failed to parse current program data.");
				return;
			}

			// 2. Create the new ProgramNode
			const newChildId = uuidv4();
			const newProgramNode: ProgramNode = {
				id: newChildId,
				children: [],
				constraints: [], // Start with empty constraints, can be modified later
				// label will be generated in the next step
			};

			// 3. Find the parent in the program structure and add the new child
			const added = findAndAddChildInProgram(parsedProgram, parentId, newProgramNode);

			if (!added) {
				console.error(`Could not find parent node with ID ${parentId} in the program structure.`);
				return;
			}

			// TODO: Persist the updated `parsedProgram` structure to the database
			// This would likely involve updating `currentProject` via `setCurrentProject`
			// and then triggering a save operation.

			// 4. Regenerate labels
			const programWithNewLabels = generateLabels(parsedProgram);

			// 5. Convert the updated program to flow elements
			const { nodes: convertedNodes, edges: convertedEdges } = convertProgramToFlow(programWithNewLabels);

			// 6. Apply layout
			try {
				const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(convertedNodes, convertedEdges, elkOptions);

				// 7. Update state
				setNodes(layoutedNodes);
				setEdges(layoutedEdges);
				console.log("Added new node, regenerated labels, and applied layout.");
			} catch (error) {
				console.error("Error during layout after adding node:", error);
				// Fallback: Update state with unlabeled/unlayouted nodes? Or show error?
				// For now, just log the error. The state won't be updated if layout fails.
			}
		},
		[currentProject, setNodes, setEdges]
	);

	const value: ProjectContextProps = {
		nodes,
		edges,
		setNodes,
		setEdges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		addChildNode,
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
