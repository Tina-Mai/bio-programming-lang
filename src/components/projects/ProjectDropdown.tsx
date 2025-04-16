import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OverflowMenuHorizontal, Copy, TrashCan } from "@carbon/icons-react";
import { useState } from "react";
import { useGlobal } from "@/context/GlobalContext";

const ProjectDropdown = ({ projectId }: { projectId: string }) => {
	const [open, setOpen] = useState(false);
	const { deleteProject, duplicateProject } = useGlobal();

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDuplicate = async (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Duplicate project: ${projectId}`);
		await duplicateProject(projectId);
		setOpen(false);
	};

	const handleDelete = async (e: React.MouseEvent) => {
		handleClick(e);
		console.log(`Delete project: ${projectId}`);
		await deleteProject(projectId);
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
