import { Node, Edge, Position } from "@xyflow/react";
import ELK, { ElkNode, ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

// Default node dimensions (can be overridden by actual node sizes if known, or passed to ELK)
const DEFAULT_NODE_WIDTH = 180; // Matches the width set in new node components
const DEFAULT_NODE_HEIGHT = 100; // Approximate height for new node components

// Default ElkJS options for a flat graph layout
export const defaultElkOptions: LayoutOptions = {
	"elk.algorithm": "layered", // Good for directed graphs
	"elk.direction": "DOWN",
	"elk.layered.spacing.nodeNodeBetweenLayers": "80", // Spacing between layers of nodes
	"elk.spacing.nodeNode": "60", // Spacing between nodes in the same layer
	"elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
	"elk.edgeRouting": "ORTHOGONAL", // OR "POLYLINE" or "SPLINES"
};

interface LayoutedElkNode extends ElkNode {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	children?: LayoutedElkNode[];
	edges?: ElkExtendedEdge[];
}

// Converts React Flow nodes to a flat list of ElkNodes for layouting.
// Hierarchy is no longer built here as the graph is flat.
const convertToElkNodes = (nodes: Node[]): ElkNode[] => {
	return nodes.map((node) => ({
		id: node.id,
		width: node.width || DEFAULT_NODE_WIDTH,
		height: node.height || DEFAULT_NODE_HEIGHT,
	}));
};

// Converts layouted ElkNodes back to React Flow nodes, applying positions.
const applyLayoutToFlowNodes = (layoutedElkNodes: LayoutedElkNode[], originalFlowNodesMap: Map<string, Node>, isHorizontal: boolean): Node[] => {
	return layoutedElkNodes
		.map((elkNode) => {
			const originalNode = originalFlowNodesMap.get(elkNode.id);
			if (!originalNode) {
				console.warn(`Original RF node not found for Elk node ID: ${elkNode.id}`);
				return null; // Or some default error node
			}

			return {
				...originalNode,
				position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
				targetPosition: isHorizontal ? Position.Left : Position.Top,
				sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
				style: {
					...originalNode.style,
					width: elkNode.width || originalNode.width,
					height: elkNode.height || originalNode.height,
				},
			};
		})
		.filter((node) => node !== null) as Node[];
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[], options: LayoutOptions = defaultElkOptions): Promise<{ nodes: Node[]; edges: Edge[] }> => {
	if (nodes.length === 0) {
		return { nodes: [], edges: [] };
	}

	const isHorizontal = options?.["elk.direction"] === "RIGHT" || options?.["elk.direction"] === "LEFT";
	const originalFlowNodesMap = new Map<string, Node>(nodes.map((node) => [node.id, node]));

	const elkNodesForLayout = convertToElkNodes(nodes);

	const graphToLayout: ElkNode = {
		id: "root",
		layoutOptions: options,
		children: elkNodesForLayout,
		edges: edges.map((edge) => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target],
		})),
	};

	try {
		const layoutedGraph = (await elk.layout(graphToLayout)) as LayoutedElkNode;

		const finalNodes = applyLayoutToFlowNodes(layoutedGraph.children ?? [], originalFlowNodesMap, isHorizontal);

		return { nodes: finalNodes, edges: edges };
	} catch (error) {
		console.error("ElkJS layout failed:", error);
		return { nodes, edges };
	}
};
