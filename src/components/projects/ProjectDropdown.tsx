import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OverflowMenuHorizontal, Copy, TrashCan } from "@carbon/icons-react";
import { useState } from "react";

const ProjectDropdown = ({ projectId }: { projectId: string }) => {
	const [open, setOpen] = useState(false);

	// stop click events from propagating to parent
	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	// TODO: handle duplicating project
	const handleDuplicate = (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Duplicate project: ${projectId}`);
		setOpen(false);
	};

	// TODO: handle deleting project
	const handleDelete = (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Delete project: ${projectId}`);
		setOpen(false);
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger onClick={handleClick}>
				<OverflowMenuHorizontal size={16} className="shrink-0 hover:text-foreground text-slate-500 invisible group-hover:visible" />
			</DropdownMenuTrigger>
			<DropdownMenuContent onClick={handleClick}>
				<DropdownMenuItem onClick={handleDuplicate}>
					<Copy size={16} />
					Duplicate
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleDelete}>
					<TrashCan size={16} />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ProjectDropdown;
