import React, { MouseEvent } from "react";
import { ContainerData } from "@/types";
import { NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Add, OverflowMenuHorizontal } from "@carbon/icons-react";

export const ContainerNode = ({ data, id, parentId, selected }: NodeProps) => {
	const containerData = data as ContainerData;

	const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
		// stop propagation only if this is a direct click on the container (not on its children)
		if (event.target === event.currentTarget) {
			event.stopPropagation();
		}
	};

	const isTopLevelContainer = id === "container-top" || !parentId;

	// Add console.log to debug
	console.log("Container ID:", data.id);

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
			<div className="horizontal my-3 mx-4 items-center gap-1 flex-wrap">
				{!isTopLevelContainer && (
					<Badge variant="outline" className="text-zinc-600 !px-0 !py-0 !size-5 !rounded-xs">
						<OverflowMenuHorizontal className="stroke-1 stroke-zinc-600" />
					</Badge>
				)}
				{containerData.label &&
					containerData.label.split(", ").map((label, index) => (
						<Badge key={index} variant="outline" className="text-zinc-600 capitalize">
							{label}
						</Badge>
					))}
				<Button size="icon" variant="outline" className="!px-0 !py-0 !size-5 !rounded-xs" onClick={(e) => e.stopPropagation()}>
					<Add size={4} />
				</Button>
			</div>
		</div>
	);
};
