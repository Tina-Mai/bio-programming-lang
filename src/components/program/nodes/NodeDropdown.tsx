import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OverflowMenuHorizontal, Copy, TrashCan } from "@carbon/icons-react";
import { useState } from "react";

const NodeDropdown = ({ nodeId }: { nodeId: string }) => {
	const [open, setOpen] = useState(false);

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDuplicate = async (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Duplicate node: ${nodeId}`);
		setOpen(false);
	};

	const handleDelete = async (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Delete node: ${nodeId}`);
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
