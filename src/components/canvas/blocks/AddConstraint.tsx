import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Add } from "@carbon/icons-react";
import { Input } from "@/components/ui/input";
import { constraints as constraintsOptions } from "@/data/constraints";
import { useState } from "react";

const AddConstraint = ({ constraints = [], setConstraints }: { constraints?: string[]; setConstraints: (constraints: string[]) => void }) => {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredConstraints = constraintsOptions.filter((constraint) => constraint.label.toLowerCase().includes(searchTerm.toLowerCase()));

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (!open) {
					setSearchTerm("");
				}
			}}
		>
			<DropdownMenuTrigger>
				<Button size="icon" variant="outline" className="!px-0 !py-0 !size-5 !rounded-xs mt-1" onClick={(e) => e.stopPropagation()}>
					<Add size={4} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Constraints</DropdownMenuLabel>
				<Input
					placeholder="Search"
					className="!bg-white"
					value={searchTerm}
					onChange={(e) => {
						e.stopPropagation();
						setSearchTerm(e.target.value);
					}}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					autoFocus
				/>
				<DropdownMenuSeparator />
				{filteredConstraints.map((constraint) => (
					<DropdownMenuCheckboxItem
						key={constraint.label}
						checked={constraints.map((c) => c.toLowerCase()).includes(constraint.label.toLowerCase())}
						onCheckedChange={(checked) => {
							if (checked) {
								setConstraints([...constraints, constraint.label]);
							} else {
								setConstraints(constraints.filter((c) => c.toLowerCase() !== constraint.label.toLowerCase()));
							}
						}}
					>
						{constraint.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default AddConstraint;
