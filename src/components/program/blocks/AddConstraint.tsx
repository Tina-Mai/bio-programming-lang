import React, { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Add } from "@carbon/icons-react";
import { Input } from "@/components/ui/input";
import { constraints as constraintsOptions } from "@/data/constraints";
import { Constraint } from "@/types";

const AddConstraint = ({ constraints = [], setConstraints }: { constraints?: Constraint[]; setConstraints: (constraints: Constraint[]) => void }) => {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredConstraints = constraintsOptions.filter((constraint) => constraint.name.toLowerCase().includes(searchTerm.toLowerCase()));

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (!open) {
					setSearchTerm("");
				}
			}}
		>
			<DropdownMenuTrigger>
				<Button size="icon" variant="outline" className="!px-0 !py-0 !size-5 !rounded-xs mt-1 bg-slate-50/85" onClick={(e) => e.stopPropagation()}>
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
						key={constraint.name}
						checked={constraints.map((c) => c.name.toLowerCase()).includes(constraint.name.toLowerCase())}
						onCheckedChange={(checked) => {
							const constraintNameLower = constraint.name.toLowerCase();
							if (checked) {
								if (!constraints.some((c) => c.name.toLowerCase() === constraintNameLower)) {
									setConstraints([...constraints, constraint]);
								}
							} else {
								setConstraints(constraints.filter((c) => c.name.toLowerCase() !== constraintNameLower));
							}
						}}
					>
						{constraint.name}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default AddConstraint;
