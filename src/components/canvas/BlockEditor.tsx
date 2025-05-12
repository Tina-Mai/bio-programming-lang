import React from "react";
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider } from "@xyflow/react";
import { useProject } from "@/context/ProjectContext";
import "@xyflow/react/dist/style.css";
import ConstraintNode from "./nodes/ConstraintNode";
import SequenceNode from "./nodes/SequenceNode";

const nodeTypes = {
	constraint: ConstraintNode,
	sequence: SequenceNode,
};

const BlockEditor = () => {
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
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
				defaultEdgeOptions={{ animated: true }}
				fitView
				className="bg-slate-50"
				proOptions={{ hideAttribution: true }}
			>
				<Background />
				<Controls />
				<MiniMap nodeStrokeWidth={3} zoomable pannable />
				{/* <Panel position="top-left">
					<button onClick={() => onLayout("TB")}>Vertical Layout</button>
					<button onClick={() => onLayout("LR")}>Horizontal Layout</button>
				</Panel> */}
			</ReactFlow>
		</div>
	);
};

const BlockEditorWrapper = () => (
	<ReactFlowProvider>
		<BlockEditor />
	</ReactFlowProvider>
);

export default BlockEditorWrapper;
