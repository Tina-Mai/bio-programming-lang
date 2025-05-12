import React from "react";
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider } from "@xyflow/react";
import { useProject } from "@/context/ProjectContext";
import "@xyflow/react/dist/style.css";
import ConstraintNode from "./nodes/constraints/ConstraintNode";
import SequenceNode from "./nodes/sequences/SequenceNode";

const nodeTypes = {
	constraint: ConstraintNode,
	sequence: SequenceNode,
};

const GraphEditor = () => {
	const {
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		// TODO: Add any new functions for node/edge manipulation if needed later
		// e.g., onLayout, or specific actions for new node types
	} = useProject();

	// TODO: Implement onLayout if needed for the new flat structure
	// const onLayout = useCallback(
	// 	(direction: string) => {
	// 		// layoutNodes(direction); // This would call a function in ProjectContext
	// 	},
	// 	[nodes, edges]
	// );

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
