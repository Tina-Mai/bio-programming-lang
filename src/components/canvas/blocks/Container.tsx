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
			style={{
				width: "100%",
				height: "100%",
				borderRadius: 10,
				backgroundColor: containerData.backgroundColor || "rgba(235, 244, 255, 0.5)",
				border: selected ? "2px solid #1a192b" : "1px solid #ddd",
				zIndex: 0,
			}}
			onMouseDown={onMouseDown}
			onClick={(event) => event.stopPropagation()}
		>
			{containerData.label && <div style={{ padding: 10 }}>{containerData.label}</div>}
		</div>
	);
};
