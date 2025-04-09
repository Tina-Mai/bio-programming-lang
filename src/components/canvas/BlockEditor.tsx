import { ReactFlow, Controls, Background, MiniMap, NodeProps, Node, Edge, Connection, NodeChange, EdgeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useCallback, MouseEvent } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";

// Define the custom data type for container nodes
type ContainerData = {
	label?: string;
	backgroundColor?: string;
};

// Custom node type for containers that stops event propagation
const ContainerNode = ({ data, selected }: NodeProps) => {
	const containerData = data as ContainerData;

	const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
		// Stop propagation only if this is a direct click on the container (not on its children)
		if (event.target === event.currentTarget) {
			event.stopPropagation();
		}
	};

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				borderRadius: 15,
				backgroundColor: containerData.backgroundColor || "rgba(235, 244, 255, 0.8)",
				border: selected ? "2px solid #1a192b" : "1px solid #ddd",
			}}
			onMouseDown={onMouseDown}
			onClick={(event) => event.stopPropagation()}
		>
			{containerData.label && <div style={{ padding: 10 }}>{containerData.label}</div>}
		</div>
	);
};

// Define custom node types
const nodeTypes = {
	container: ContainerNode,
};

// Define the nodes with parent-child relationships
const initialNodes: Node[] = [
	// Top container box (highest level)
	{
		id: "container-top",
		type: "container",
		data: {
			label: "",
			backgroundColor: "rgba(255, 250, 227, 0.8)",
		},
		position: { x: 0, y: 0 },
		style: {
			width: 600,
			height: 500,
			borderRadius: 15,
		},
		draggable: true,
	},

	// Top level node X₁
	{
		id: "x1",
		data: { label: "X₁" },
		position: { x: 250, y: 50 },
		parentId: "container-top",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: "50%",
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},

	// Top constraint label
	{
		id: "constraint-top",
		data: { label: "Constraints:\npTM, pLDDT, etc." },
		position: { x: 350, y: 40 },
		parentId: "container-top",
		draggable: false,
		style: {
			fontSize: 18,
			fontWeight: "bold",
		},
	},

	// Middle container box (second level - left)
	{
		id: "container-middle-left",
		type: "container",
		data: {
			label: "",
			backgroundColor: "rgba(235, 244, 255, 0.8)",
		},
		position: { x: 50, y: 150 },
		parentId: "container-top",
		style: {
			width: 200,
			height: 300,
			borderRadius: 15,
		},
		draggable: true,
	},

	// Middle container box (second level - right)
	{
		id: "container-middle-right",
		type: "container",
		data: {
			label: "",
			backgroundColor: "rgba(235, 244, 255, 0.8)",
		},
		position: { x: 300, y: 150 },
		parentId: "container-top",
		style: {
			width: 250,
			height: 300,
			borderRadius: 15,
		},
		draggable: true,
	},

	// Left X₂ node
	{
		id: "x2-left",
		data: { label: "X₂" },
		position: { x: 100, y: 50 },
		parentId: "container-middle-left",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: "50%",
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},

	// Right X₂ node
	{
		id: "x2-right",
		data: { label: "X₂" },
		position: { x: 70, y: 50 },
		parentId: "container-middle-right",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: "50%",
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},

	// Middle constraint label
	{
		id: "constraint-middle",
		data: { label: "Constraints:\nSymmetry, etc." },
		position: { x: 150, y: 50 },
		parentId: "container-middle-right",
		draggable: false,
		style: {
			fontSize: 18,
			fontWeight: "bold",
		},
	},

	// Bottom container for A nodes - left side
	{
		id: "container-bottom-left",
		type: "container",
		data: {
			label: "",
			backgroundColor: "rgba(226, 232, 240, 0.8)",
		},
		position: { x: 20, y: 150 },
		parentId: "container-middle-left",
		style: {
			width: 160,
			height: 100,
			borderRadius: 15,
		},
		draggable: true,
	},

	// Bottom container for A nodes - right side
	{
		id: "container-bottom-right",
		type: "container",
		data: {
			label: "",
			backgroundColor: "rgba(226, 232, 240, 0.8)",
		},
		position: { x: 20, y: 150 },
		parentId: "container-middle-right",
		style: {
			width: 200,
			height: 100,
			borderRadius: 15,
		},
		draggable: true,
	},

	// Bottom constraint label
	{
		id: "constraint-bottom",
		data: { label: "Constraints:\nLength, etc." },
		position: { x: 120, y: 30 },
		parentId: "container-bottom-right",
		draggable: false,
		style: {
			fontSize: 18,
			fontWeight: "bold",
		},
	},

	// A nodes on left side
	{
		id: "a-left-1",
		data: { label: "A" },
		position: { x: 30, y: 30 },
		parentId: "container-bottom-left",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},
	{
		id: "a-left-2",
		data: { label: "A" },
		position: { x: 110, y: 30 },
		parentId: "container-bottom-left",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},

	// A nodes on right side
	{
		id: "a-right-1",
		data: { label: "A" },
		position: { x: 30, y: 30 },
		parentId: "container-bottom-right",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},
	{
		id: "a-right-2",
		data: { label: "A" },
		position: { x: 110, y: 30 },
		parentId: "container-bottom-right",
		style: {
			width: 60,
			height: 60,
			backgroundColor: "white",
			borderRadius: 10,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			fontWeight: "bold",
			fontSize: 20,
			border: "1px solid #ddd",
		},
	},
];

// Define the edges
const initialEdges: Edge[] = [
	// Connection from X₁ to left X₂
	{
		id: "x1-to-x2-left",
		source: "x1",
		target: "x2-left",
		type: "bezier",
	},
	// Connection from X₁ to right X₂
	{
		id: "x1-to-x2-right",
		source: "x1",
		target: "x2-right",
		type: "bezier",
	},
	// Connections from left X₂ to its A nodes
	{
		id: "x2-left-to-a-left-1",
		source: "x2-left",
		target: "a-left-1",
		type: "bezier",
	},
	{
		id: "x2-left-to-a-left-2",
		source: "x2-left",
		target: "a-left-2",
		type: "bezier",
	},
	// Connections from right X₂ to its A nodes
	{
		id: "x2-right-to-a-right-1",
		source: "x2-right",
		target: "a-right-1",
		type: "bezier",
	},
	{
		id: "x2-right-to-a-right-2",
		source: "x2-right",
		target: "a-right-2",
		type: "bezier",
	},
];

const defaultEdgeOptions = {
	style: { stroke: "#94a3b8" }, // zinc-400
	type: "bezier",
	animated: false,
};

const BlockEditor = () => {
	const [nodes, setNodes] = useState<Node[]>(initialNodes);
	const [edges, setEdges] = useState<Edge[]>(initialEdges);

	const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);

	const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

	const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), []);

	return (
		<div style={{ height: "100%" }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				defaultEdgeOptions={defaultEdgeOptions}
				proOptions={{ hideAttribution: true }}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				fitView
			>
				<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
				<Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} />
				<MiniMap
					nodeColor={"oklch(70.4% 0.04 256.788 / 0.4)"}
					nodeStrokeWidth={3}
					zoomable
					pannable
					position="bottom-left"
					style={{ width: 150, height: 100 }}
					nodeBorderRadius={2}
					maskColor="oklch(92.9% 0.013 255.508 / 0.7)"
				/>
			</ReactFlow>
		</div>
	);
};

export default BlockEditor;
