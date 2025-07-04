import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

export const LAYOUT_CONFIG = {
	// node dimensions used for layout calculations
	NODE_WIDTH: 200,
	NODE_HEIGHT: 80,

	// horizontal spacing between nodes in the same layer
	NODE_SPACING_X: 75,

	// vertical spacing between layers
	ROW_SPACING_Y: 150,

	// padding around the entire layout
	PADDING_X: 50,
	PADDING_Y: 50,
};

// apply dagre-based layout to graph nodes and edges
export function getLayoutedElements(nodes: FlowNode[], edges: FlowEdge[]) {
	// Preserve existing horizontal order by sorting nodes by x-position within their type
	const sortedNodes = [...nodes].sort((a, b) => {
		// First separate by type (constraints before sequences)
		if (a.type === "constraint" && b.type === "sequence") return -1;
		if (a.type === "sequence" && b.type === "constraint") return 1;

		// Then sort by x position within the same type to maintain order
		const aX = a.position?.x ?? 0;
		const bX = b.position?.x ?? 0;
		return aX - bX;
	});

	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({
		rankdir: "TB", // top to bottom layout
		nodesep: LAYOUT_CONFIG.NODE_SPACING_X,
		ranksep: LAYOUT_CONFIG.ROW_SPACING_Y,
		marginx: LAYOUT_CONFIG.PADDING_X,
		marginy: LAYOUT_CONFIG.PADDING_Y,
		align: "UL", // align to top left
	});

	// separate nodes by type
	const constraintNodes = sortedNodes.filter((node) => node.type === "constraint");
	const sequenceNodes = sortedNodes.filter((node) => node.type === "sequence");

	// Add constraint nodes in their current order
	constraintNodes.forEach((node, index) => {
		dagreGraph.setNode(node.id, {
			width: LAYOUT_CONFIG.NODE_WIDTH,
			height: LAYOUT_CONFIG.NODE_HEIGHT,
			type: node.type,
			order: index, // preserve horizontal order
		});
	});

	// Add sequence nodes in their current order
	sequenceNodes.forEach((node, index) => {
		dagreGraph.setNode(node.id, {
			width: LAYOUT_CONFIG.NODE_WIDTH,
			height: LAYOUT_CONFIG.NODE_HEIGHT,
			type: node.type,
			order: index, // preserve horizontal order
		});
	});

	// add edges to the graph
	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	// Create virtual edges to enforce layering and ordering
	if (constraintNodes.length > 0 && sequenceNodes.length > 0) {
		// Create virtual nodes for rank groups
		dagreGraph.setNode("rank_group_0", { width: 0, height: 0 });
		dagreGraph.setNode("rank_group_1", { width: 0, height: 0 });

		// Connect constraint nodes to rank_group_0
		constraintNodes.forEach((node) => {
			// Connect to rank group with high weight to enforce rank
			dagreGraph.setEdge("rank_group_0", node.id, { weight: 1000 });
		});

		// Connect sequence nodes to rank_group_1
		sequenceNodes.forEach((node) => {
			// Connect to rank group with high weight to enforce rank
			dagreGraph.setEdge("rank_group_1", node.id, { weight: 1000 });
		});

		// Enforce rank order between the two groups
		dagreGraph.setEdge("rank_group_0", "rank_group_1", { weight: 2000 });
	}

	// calculate the layout
	dagre.layout(dagreGraph);

	// Get positions from dagre
	const layoutedNodes = sortedNodes.map((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		return {
			...node,
			position: {
				x: nodeWithPosition.x - LAYOUT_CONFIG.NODE_WIDTH / 2,
				y: nodeWithPosition.y - LAYOUT_CONFIG.NODE_HEIGHT / 2,
			},
		};
	});

	// Center each row horizontally
	if (constraintNodes.length > 0) {
		const constraintLayoutedNodes = layoutedNodes.filter((node) => node.type === "constraint");
		const minX = Math.min(...constraintLayoutedNodes.map((n) => n.position.x));
		const maxX = Math.max(...constraintLayoutedNodes.map((n) => n.position.x + LAYOUT_CONFIG.NODE_WIDTH));
		const rowWidth = maxX - minX;
		const graphWidth = dagreGraph.graph()?.width || 0;
		const offsetX = (graphWidth - rowWidth) / 2 - minX + LAYOUT_CONFIG.PADDING_X;

		// Apply centering offset to constraint nodes
		constraintLayoutedNodes.forEach((node) => {
			node.position.x += offsetX;
		});
	}

	if (sequenceNodes.length > 0) {
		const sequenceLayoutedNodes = layoutedNodes.filter((node) => node.type === "sequence");
		const minX = Math.min(...sequenceLayoutedNodes.map((n) => n.position.x));
		const maxX = Math.max(...sequenceLayoutedNodes.map((n) => n.position.x + LAYOUT_CONFIG.NODE_WIDTH));
		const rowWidth = maxX - minX;
		const graphWidth = dagreGraph.graph()?.width || 0;
		const offsetX = (graphWidth - rowWidth) / 2 - minX + LAYOUT_CONFIG.PADDING_X;

		// Apply centering offset to sequence nodes
		sequenceLayoutedNodes.forEach((node) => {
			node.position.x += offsetX;
		});
	}

	// Clean up by removing virtual nodes
	["rank_group_0", "rank_group_1"].forEach((id) => {
		if (dagreGraph.hasNode(id)) {
			dagreGraph.removeNode(id);
		}
	});

	return { nodes: layoutedNodes, edges };
}
