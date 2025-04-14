import React, { useCallback, useEffect } from "react";
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Connection, addEdge, ConnectionLineType, useNodesState, useEdgesState, Position } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "@/types";
import { parseProgramJSON, convertProgramToFlow } from "@/lib/utils";
import programData from "@/data/mock/program.json";
import { Program } from "@/types";

const dagreGraph = new dagre.graphlib.Graph({ compound: true }).setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 60;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
	const direction = "TB";
	dagreGraph.setGraph({ rankdir: direction, nodesep: 70, ranksep: 100 });

	const dagreNodes = nodes.filter((n) => n.type !== "group");
	const dagreGroups = nodes.filter((n) => n.type === "group");

	dagreNodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
		if (node.parentId) {
			dagreGraph.setParent(node.id, node.parentId);
		}
	});

	dagreGroups.forEach((group) => {
		dagreGraph.setNode(group.id, { clusterLabelPos: "top" });
		if (group.parentId) {
			dagreGraph.setParent(group.id, group.parentId);
		}
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const layoutedNodes = nodes.map((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		const position = {
			x: nodeWithPosition.x - (node.type !== "group" ? nodeWidth / 2 : 0),
			y: nodeWithPosition.y - (node.type !== "group" ? nodeHeight / 2 : 0),
		};

		return {
			...node,
			targetPosition: Position.Top,
			sourcePosition: Position.Bottom,
			position,
			...(node.type === "group" && {
				style: {
					...node.style,
					width: nodeWithPosition.width,
					height: nodeWithPosition.height,
				},
			}),
		};
	});

	return { nodes: layoutedNodes, edges };
};

let initialNodes: Node[] = [];
let initialEdges: Edge[] = [];
const parsedProgram = parseProgramJSON(programData);

if (parsedProgram) {
	const { nodes: convertedNodes, edges: convertedEdges } = convertProgramToFlow(parsedProgram as Program);
	const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(convertedNodes, convertedEdges);
	initialNodes = layoutedNodes;
	initialEdges = layoutedEdges;
} else {
	console.error("Failed to parse program data.");
}

const BlockEditor = () => {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: "default", animated: true, style: { stroke: "#aaa" } }, eds)), [setEdges]);

	useEffect(() => {
		console.log("Current nodes:", nodes);
		console.log("Current edges:", edges);
		console.log("Node types:", nodeTypes);
	}, [nodes, edges]);

	return (
		<div style={{ height: "100%" }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				connectionLineType={ConnectionLineType.SmoothStep}
				proOptions={{ hideAttribution: true }}
				fitView
				fitViewOptions={{ padding: 0.15 }}
				nodesDraggable={true}
			>
				<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
				<Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} />
				<MiniMap
					nodeColor={(n: Node) => (n.type === "group" ? "rgba(210, 230, 255, 0.5)" : "oklch(70.4% 0.04 256.788 / 0.15)")}
					nodeStrokeWidth={3}
					zoomable
					pannable
					position="bottom-left"
					style={{ width: 125, height: 100 }}
					nodeBorderRadius={2}
					maskColor="oklch(92.9% 0.013 255.508 / 0.7)"
				/>
			</ReactFlow>
		</div>
	);
};

export default BlockEditor;
