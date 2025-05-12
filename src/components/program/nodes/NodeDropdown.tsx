import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OverflowMenuHorizontal, Copy, TrashCan } from "@carbon/icons-react";
import { useState } from "react";
import { useProject } from "@/context/ProjectContext";

const NodeDropdown = ({ nodeId }: { nodeId: string }) => {
	const [open, setOpen] = useState(false);
	const { deleteNode, duplicateNode } = useProject();

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDuplicate = async (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Attempting to duplicate node: ${nodeId}`);
		await duplicateNode(nodeId);
		setOpen(false);
	};

	const handleDelete = async (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Attempting to delete node: ${nodeId}`);
		await deleteNode(nodeId);
		setOpen(false);
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger onClick={handleClick}>
				<OverflowMenuHorizontal size={16} className="shrink-0 hover:text-foreground text-slate-500" />
			</DropdownMenuTrigger>
			<DropdownMenuContent onClick={handleClick}>
				<DropdownMenuItem onClick={handleDuplicate}>
					<Copy size={16} />
					Duplicate node
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleDelete}>
					<TrashCan size={16} />
					Delete node
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default NodeDropdown;
