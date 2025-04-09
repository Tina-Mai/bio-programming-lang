import React, { MouseEvent } from "react";
import { ContainerData } from "@/types";
import { NodeProps } from "@xyflow/react";

export const ContainerNode = ({ data, selected }: NodeProps) => {
	const containerData = data as ContainerData;

	const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
		// stop propagation only if this is a direct click on the container (not on its children)
		if (event.target === event.currentTarget) {
			event.stopPropagation();
		}
	};

	return (
		<div
			className="react-flow__node-custom"
			style={{
				width: "100%",
				height: "100%",
				borderRadius: 10,
				backgroundColor: containerData.backgroundColor || "rgba(235, 244, 255, 0.5)",
				border: selected ? "1.5px solid #64748b" : "1px solid #CAD5E2",
				boxShadow: "none",
				zIndex: 0,
				position: "relative",
				outline: "none",
			}}
			onMouseDown={onMouseDown}
			onClick={(event) => event.stopPropagation()}
		>
			{containerData.label && <div className="font-mono text-sm text-zinc-600 py-3 px-4">{containerData.label}</div>}
		</div>
	);
};
