import React, { useState } from "react";
import { EdgeProps, BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { CloseFilled } from "@carbon/icons-react";
import { useProject } from "@/context/ProjectContext";

const Edge = ({ id, sourceX, sourceY, targetX, targetY, selected }: EdgeProps) => {
	const [hovered, setHovered] = useState(false);
	const { deleteEdge } = useProject();

	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		curvature: 0.4,
	});

	const isVisible = selected || hovered;

	// TODO: add hover detection for the edge

	return (
		<>
			<path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: "pointer" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} />
			<BaseEdge
				id={id}
				path={edgePath}
				style={{
					stroke: selected ? "oklch(55.4% 0.046 257.417)" : "oklch(70.4% 0.04 256.788)",
					strokeWidth: selected ? 2 : 1.5,
				}}
				className={hovered ? "react-flow__edge-path-hover" : ""}
			/>
			{isVisible && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							pointerEvents: "all",
						}}
						className="flex bg-slate-50 items-center justify-center rounded-full z-10 cursor-pointer nodrag nopan"
						onClick={() => deleteEdge(id)}
						title="Remove edge"
					>
						<CloseFilled size={18} className="text-slate-500 hover:text-slate-700 transition-colors duration-200" />
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
};

export default Edge;
