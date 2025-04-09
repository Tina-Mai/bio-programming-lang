import React, { useState, useCallback, useEffect } from "react";
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Connection, NodeChange, EdgeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { defaultEdgeOptions } from "@/components/canvas/blocks/Edge";
import { nodeTypes, edgeTypes } from "@/types";
import { Project } from "@/types/Project";

interface BlockEditorProps {
	project?: Project;
}

const BlockEditor = ({ project }: BlockEditorProps) => {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);

	// initialize with project nodes and edges
	useEffect(() => {
		console.log("Project received:", project);
		if (project?.nodes && project.nodes.length > 0) {
			setNodes(project.nodes);
		} else {
			setNodes([]);
		}

		if (project?.edges && project.edges.length > 0) {
			setEdges(project.edges);
		} else {
			setEdges([]);
		}
	}, [project]);

	useEffect(() => {
		console.log("Current nodes:", nodes);
		console.log("Current edges:", edges);
		console.log("Node types:", nodeTypes);
		console.log("Edge types:", edgeTypes);
	}, [nodes, edges]);

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
					nodeColor={"oklch(70.4% 0.04 256.788 / 0.15)"}
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
