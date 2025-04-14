import React, { createContext, useCallback, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Node, Edge, Connection, addEdge, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState, Position } from "@xyflow/react";
import ELK, { ElkNode, ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk.bundled.js"; // Import ELK and its types
import { Program } from "@/types";
import { parseProgramJSON, convertProgramToFlow } from "@/lib/utils";
import programData from "@/data/mock/program.json";

// --- ElkJS Layout Logic Start ---
const elk = new ELK();

const nodeWidth = 172;
const nodeHeight = 60;

// Default ElkJS options
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
	children?: LayoutedElkNode[]; // Add children to type for recursion
	edges?: ElkExtendedEdge[]; // Add edges to type for recursion
}

// Fixed dimensions for StandardNode (circle)
const standardNodeWidth = 60;
// const standardNodeHeight = 60; // Removed unused constant
// Define desired padding from the top of the container to the top of the standard node
const standardNodeTopPadding = 65; // Adjust this value for desired vertical spacing below constraints

// Helper function to build nested Elk node structure
const buildElkHierarchy = (nodes: Node[]): ElkNode[] => {
	const elkNodeMap = new Map<string, ElkNode>();
	const rootElkNodes: ElkNode[] = [];

	// First pass: Create ElkNode objects for all nodes
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
			children: [], // Initialize children array
		};
		elkNodeMap.set(node.id, elkNode);
	});

	// Second pass: Build the hierarchy
	nodes.forEach((node) => {
		const elkNode = elkNodeMap.get(node.id)!;
		if (node.parentId && elkNodeMap.has(node.parentId)) {
			const parentElkNode = elkNodeMap.get(node.parentId)!;
			parentElkNode.children = parentElkNode.children || []; // Ensure children array exists
			parentElkNode.children.push(elkNode);
		} else {
			// Node is a root node (no parentId or parent not found)
			rootElkNodes.push(elkNode);
		}
	});

	return rootElkNodes;
};

// Recursive function to flatten layouted nodes and adjust positions
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
			// This is a StandardNode inside a group
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
			position: calculatedPosition, // Use calculated position
			targetPosition: isHorizontal ? Position.Left : Position.Top,
			sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
			style: {
				...originalNode.style,
				// Use ElkJS calculated dimensions ONLY for groups
				...(isGroup && {
					width: elkNode.width,
					height: elkNode.height,
				}),
			},
		});

		// Recursively flatten children
		if (elkNode.children && elkNode.children.length > 0) {
			rfNodes = rfNodes.concat(flattenLayoutedNodes(elkNode.children, isHorizontal, rfNodeMap, layoutedGroupMap));
		}
	});
	return rfNodes;
};

// Async function to get layouted elements using ElkJS
const getLayoutedElements = async (nodes: Node[], edges: Edge[], options: LayoutOptions = elkOptions): Promise<{ nodes: Node[]; edges: Edge[] }> => {
	const isHorizontal = options?.["elk.direction"] === "RIGHT" || options?.["elk.direction"] === "LEFT";

	const rfNodeMap = new Map<string, Node>(nodes.map((node) => [node.id, node]));
	const rfEdgeMap = new Map<string, Edge>(edges.map((edge) => [edge.id, edge]));

	// Build the nested structure for ElkJS input
	// We need to map the *React Flow* nodes to *ElkJS* nodes here
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

		// Create a map of layouted group nodes for position calculation
		const layoutedGroupMap = new Map<string, LayoutedElkNode>();
		const collectGroups = (elkNodes: LayoutedElkNode[]) => {
			elkNodes.forEach((node) => {
				// Assuming group nodes have IDs starting with 'group-' from convertProgramToFlow
				if (node.id.startsWith("group-")) {
					layoutedGroupMap.set(node.id, node);
				}
				if (node.children) {
					collectGroups(node.children);
				}
			});
		};
		collectGroups(layoutedGraph.children ?? []);

		// Flatten the layouted nodes and adjust standard node positions
		const finalNodes = flattenLayoutedNodes(layoutedGraph.children ?? [], isHorizontal, rfNodeMap, layoutedGroupMap);

		// Map layouted Elk edges back (retrieve original from map)
		const finalEdges =
			layoutedGraph.edges
				?.map((elkEdge: ElkExtendedEdge): Edge | undefined => {
					return rfEdgeMap.get(elkEdge.id);
				})
				.filter((edge): edge is Edge => edge !== undefined) ?? [];

		return { nodes: finalNodes, edges: finalEdges };
	} catch (error) {
		console.error("ElkJS layout failed:", error);
		return { nodes, edges }; // Return original elements on error
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
}

const ProjectContext = createContext<ProjectContextProps | undefined>(undefined);

// Load and convert initial data outside the component
let rawNodes: Node[] = [];
let rawEdges: Edge[] = [];
const parsedProgram = parseProgramJSON(programData);

if (parsedProgram) {
	const { nodes: convertedNodes, edges: convertedEdges } = convertProgramToFlow(parsedProgram as Program);
	rawNodes = convertedNodes;
	rawEdges = convertedEdges;
} else {
	console.error("Failed to parse program data.");
}

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [layoutDone, setLayoutDone] = useState(false);

	// Effect to run layout on initial load
	useEffect(() => {
		let isMounted = true;
		if (rawNodes.length > 0 && !layoutDone) {
			getLayoutedElements(rawNodes, rawEdges, elkOptions)
				.then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
					if (isMounted) {
						setNodes(layoutedNodes);
						// Important: Use the layoutedEdges *returned by getLayoutedElements*
						// which are the original edges retrieved from the map.
						setEdges(layoutedEdges);
						setLayoutDone(true);
						console.log("ElkJS layout applied.");
					}
				})
				.catch((error) => {
					console.error("Error during ElkJS layout:", error);
					if (isMounted) {
						setNodes(rawNodes);
						setEdges(rawEdges);
						setLayoutDone(true);
					}
				});
		}

		return () => {
			isMounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layoutDone]);

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

	const value: ProjectContextProps = {
		nodes,
		edges,
		setNodes,
		setEdges,
		onNodesChange,
		onEdgesChange,
		onConnect,
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
