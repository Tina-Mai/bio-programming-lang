import { useEffect } from "react";
import { ReactFlow, Controls, Background, MiniMap, Node, ConnectionLineType, useReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "@/types";
import { useProject } from "@/context/ProjectContext";

const BlockEditorContent = () => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useProject();
	const { fitView } = useReactFlow();

	// animate layout changes and initial load
	useEffect(() => {
		if (nodes.length > 0) {
			const timer = setTimeout(() => {
				fitView({ padding: 0.15, duration: 400 });
			}, 100);

			return () => clearTimeout(timer);
		}
	}, [nodes, fitView]);

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnect={onConnect}
			nodeTypes={nodeTypes}
			connectionLineType={ConnectionLineType.SmoothStep}
			proOptions={{ hideAttribution: true }}
			nodesDraggable={true}
		>
			<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
			<Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} />
			<MiniMap
				nodeColor={(n: Node) => (n.type === "group" ? "rgba(210, 230, 255, 0.3)" : "oklch(70.4% 0.04 256.788 / 0.15)")}
				nodeStrokeWidth={3}
				zoomable
				pannable
				position="bottom-left"
				style={{ width: 125, height: 100 }}
				nodeBorderRadius={2}
				maskColor="oklch(92.9% 0.013 255.508 / 0.7)"
			/>
		</ReactFlow>
	);
};

const BlockEditor = () => {
	return (
		<div style={{ height: "100%" }}>
			<ReactFlowProvider>
				<BlockEditorContent />
			</ReactFlowProvider>
		</div>
	);
};

export default BlockEditor;
