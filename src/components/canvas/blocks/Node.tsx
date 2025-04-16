import { NodeProps, Handle, Position, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/context/ProjectContext";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Add, AddLarge, SubtractLarge, Copy } from "@carbon/icons-react";
import { useState } from "react";

export const defaultNodeOptions = {
	style: {
		width: 60,
		height: 60,
		backgroundColor: "white",
		borderRadius: "50%",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		fontWeight: 600,
		fontSize: 20,
		border: "1px solid #ddd",
		zIndex: 1000,
		transition: "all 0.2s ease",
	},
};

export const StandardNode = ({ data, id, selected }: NodeProps) => {
	const nodeData = data as { label: string };
	const nodeWidth = 60;
	const nodeHeight = 60;
	const { addChildNode, deleteNode, duplicateNode, currentProgram } = useProject();
	const [contextMenuOpen, setContextMenuOpen] = useState(false);
	const { setNodes } = useReactFlow();

	const isActive = selected || contextMenuOpen;

	const handleContextMenuOpenChange = (open: boolean) => {
		setContextMenuOpen(open);
		if (open) {
			setNodes((nodes) =>
				nodes.map((node) => ({
					...node,
					selected: node.id === id,
				}))
			);
		}
	};

	return (
		<ContextMenu onOpenChange={handleContextMenuOpenChange}>
			<ContextMenuTrigger>
				<>
					<Handle type="target" position={Position.Top} />
					<div
						style={{
							width: nodeWidth,
							height: nodeHeight,
							fontWeight: 600,
							fontSize: 20,
							zIndex: 1000,
						}}
						className={`flex bg-white items-center justify-center rounded-full ${isActive ? "border-slate-600 border-[1.5px]" : "border border-slate-400"} transition-all duration-200`}
					>
						{nodeData.label}
					</div>
					<Handle type="source" position={Position.Bottom} />
					<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
						<Button
							size="icon"
							className="!px-0 !py-0 !size-4 !rounded-xs bg-slate-600 hover:bg-slate-500"
							onClick={(e) => {
								e.stopPropagation();
								addChildNode(id);
							}}
						>
							<Add size={4} />
						</Button>
					</div>
				</>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={() => addChildNode(id)}>
					<AddLarge size={16} /> Add child node
				</ContextMenuItem>
				{currentProgram && currentProgram.id !== id && (
					<>
						<ContextMenuItem onSelect={() => deleteNode(id)}>
							<SubtractLarge size={16} /> Delete branch
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => duplicateNode(id)}>
							<Copy size={16} /> Duplicate branch
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
};
