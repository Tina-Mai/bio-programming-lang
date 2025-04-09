import React, { useState, useCallback } from "react";
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Connection, NodeChange, EdgeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { defaultEdgeOptions } from "@/components/canvas/blocks/Edge";
import { nodeTypes, edgeTypes } from "@/types";
import { initialNodes } from "@/data/mock/nodes";
import { initialEdges } from "@/data/mock/edges";

const BlockEditor = () => {
	const [nodes, setNodes] = useState<Node[]>(initialNodes);
	const [edges, setEdges] = useState<Edge[]>(initialEdges);
	const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
	const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
	const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds)), []);

	return (
		<div style={{ height: "100%" }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				defaultEdgeOptions={defaultEdgeOptions}
				edgeTypes={edgeTypes}
				proOptions={{ hideAttribution: true }}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				fitView
				fitViewOptions={{ padding: 0.2 }}
			>
				<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
				<Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} />
				<MiniMap
					nodeColor={"oklch(70.4% 0.04 256.788 / 0.25)"}
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
