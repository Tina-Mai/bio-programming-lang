import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CompileButton from "@/components/energy/CompileButton";
import { Button } from "@/components/ui/button";
import { Download } from "@carbon/icons-react";

const EnergyDialog = () => {
	return (
		<Dialog>
			<DialogTrigger>
				<CompileButton />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Optimizing different designs</DialogTitle>
					<DialogDescription>Energy function stuff</DialogDescription>
				</DialogHeader>
				<div className="horizontal items-center gap-2">
					<Button variant="outline" className="flex items-center gap-2 w-fit">
						<Download className="text-slate-600" />
						Download output CSV
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default EnergyDialog;
