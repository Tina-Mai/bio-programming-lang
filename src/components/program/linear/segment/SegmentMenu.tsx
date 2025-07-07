import { ContextMenu, ContextMenuContent, ContextMenuLabel, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Copy, TrashCan } from "@carbon/icons-react";
import { Segment } from "@/types";

interface SegmentMenuProps {
	children: React.ReactNode;
	segment: Segment;
	onDuplicate?: () => void;
	onDelete?: () => void;
}

// menu when right clicking on a segment
const SegmentMenu: React.FC<SegmentMenuProps> = ({ children, segment, onDuplicate, onDelete }) => {
	return (
		<ContextMenu>
			<ContextMenuTrigger>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuLabel>{segment.label || "Segment"}</ContextMenuLabel>
				<ContextMenuItem onClick={onDuplicate}>
					<Copy />
					Duplicate
				</ContextMenuItem>
				<ContextMenuItem onClick={onDelete} variant="destructive">
					<TrashCan />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
};

export default SegmentMenu;
