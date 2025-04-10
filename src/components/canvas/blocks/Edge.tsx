import React from "react";
import { BezierEdge, EdgeProps } from "@xyflow/react";

export const defaultEdgeOptions = {
	style: {
		stroke: "#1e293b",
		strokeWidth: 2,
		zIndex: 2000,
	},
	type: "bezier" as const,
	animated: true,
};

export const CustomEdge = (props: EdgeProps) => {
	return (
		<BezierEdge
			{...props}
			style={{
				...defaultEdgeOptions.style,
				...(props.style || {}),
				stroke: "#1e293b",
			}}
		/>
	);
};
