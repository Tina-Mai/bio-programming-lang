import React, { useEffect, useState } from "react";
import { ReactFlow, Background, MiniMap, ReactFlowProvider, Panel, useReactFlow } from "@xyflow/react";
import { useProject } from "@/context/ProjectContext";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Grid, Term, SettingsAdjust } from "@carbon/icons-react";
import ConstraintNode from "./nodes/constraints/ConstraintNode";
import SequenceNode from "./nodes/sequences/SequenceNode";
import Edge from "./edges/Edge";
import { useGlobal } from "@/context/GlobalContext";

const nodeTypes = {
	constraint: ConstraintNode,
	sequence: SequenceNode,
};

const edgeTypes = {
	default: Edge,
};

const GraphEditor = () => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, applyLayout, isGraphLoading, addConstraintNode, addSequenceNode } = useProject();
	const { fitView } = useReactFlow();
	const [isInitialLayoutDone, setIsInitialLayoutDone] = useState(false);
	const { currentProject } = useGlobal();

	// Reset layout flag when project changes
	useEffect(() => {
		setIsInitialLayoutDone(false);
		console.log(`Project changed to ${currentProject?.id}, resetting initial layout flag.`);
	}, [currentProject?.id]);

	// Apply layout and fit view ONCE after initial load OR project change
	useEffect(() => {
		if (!isGraphLoading && nodes.length > 0 && !isInitialLayoutDone) {
			const timer = setTimeout(() => {
				applyLayout();
				// Fit view immediately after layout
				requestAnimationFrame(() => fitView({ padding: 0.2 }));
				setIsInitialLayoutDone(true);
				console.log(`Initial layout applied for project ${currentProject?.id}`);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isGraphLoading, nodes.length, applyLayout, fitView, isInitialLayoutDone, currentProject?.id]);

	// Handler for the manual layout button
	const handleAutoLayout = () => {
		applyLayout();
		// Also fit the view after manual layout
		requestAnimationFrame(() => fitView({ padding: 0.2 }));
	};

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
				fitViewOptions={{ padding: 0.4 }}
				proOptions={{ hideAttribution: true }}
			>
				<Background color="oklch(70.4% 0.04 256.788 / 0.6)" gap={20} size={2} style={{ opacity: 1 }} />
				{/* <Controls position="bottom-left" style={{ display: "flex", flexDirection: "row", marginBottom: "125px" }} showZoom={true} showFitView={true} showInteractive={true} /> */}
				<MiniMap
					nodeColor={"oklch(70.4% 0.04 256.788 / 0.15)"}
					nodeStrokeWidth={3}
					zoomable
					pannable
					position="bottom-left"
					style={{ width: 125, height: 100 }}
					nodeBorderRadius={2}
					maskColor="oklch(86.9% 0.022 252.894 / 0.5)"
				/>
				<Panel position="bottom-left" style={{ marginBottom: "125px" }}>
					<Button onClick={handleAutoLayout} variant="outline" size="sm" className="group text-xs !px-1.5 h-6 bg-white !text-slate-500 hover:!text-slate-600 font-medium">
						<Grid className="text-slate-400" />
						Auto Layout
					</Button>
				</Panel>
				<Panel position="top-left" style={{ marginTop: "60px" }} className="vertical items-center gap-2">
					{/* <div className="vertical bg-white border border-slate-300 rounded-sm px-3 py-2 gap-2">
						<div className="text-xs font-medium text-slate-500">New nodes</div> */}
					<Button
						onClick={addConstraintNode}
						variant="outline"
						size="sm"
						className="group text-xs bg-system-yellow/50 hover:bg-system-yellow/70 backdrop-blur-sm !text-slate-500 hover:!text-slate-600 gap-2 rounded-sm"
					>
						<SettingsAdjust className="text-slate-400 group-hover:text-slate-500 transition-all duration-200" />
						New Constraint
					</Button>
					<Button
						onClick={addSequenceNode}
						variant="outline"
						size="sm"
						className="group text-xs bg-system-blue/50 hover:bg-system-blue/70 backdrop-blur-sm !text-slate-500 hover:!text-slate-600 gap-2 rounded-sm"
					>
						<Term className="text-slate-400 group-hover:text-slate-500 transition-all duration-200" />
						New Sequence
					</Button>
					{/* </div> */}
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
