import React, { useEffect } from "react";
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider, Panel } from "@xyflow/react";
import { useProject } from "@/context/ProjectContext";
import "@xyflow/react/dist/style.css";
import ConstraintNode from "./nodes/constraints/ConstraintNode";
import SequenceNode from "./nodes/sequences/SequenceNode";
import Edge from "./edges/Edge";

const nodeTypes = {
	constraint: ConstraintNode,
	sequence: SequenceNode,
};

const edgeTypes = {
	default: Edge,
};

const GraphEditor = () => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, applyLayout, isGraphLoading } = useProject();

	// Apply layout when the component mounts or when nodes/edges change significantly
	useEffect(() => {
		if (!isGraphLoading && nodes.length > 0) {
			// Small delay to ensure nodes are properly rendered with dimensions
			const timer = setTimeout(() => {
				applyLayout();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isGraphLoading, nodes.length, applyLayout]);

	return (
		<div style={{ height: "100%", width: "100%" }}>
			<ReactFlow
				className="bg-slate-50"
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				proOptions={{ hideAttribution: true }}
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
				<Panel position="top-right">
					<button onClick={applyLayout} className="px-4 py-2 bg-oklch-70.4%-0.04-256.788 text-white rounded-md shadow hover:bg-oklch-60%-0.06-256.788 transition-colors">
						Auto Layout
					</button>
				</Panel>
			</ReactFlow>
		</div>
	);
};

const GraphEditorWrapper = () => (
	<ReactFlowProvider>
		<GraphEditor />
	</ReactFlowProvider>
);

export default GraphEditorWrapper;
