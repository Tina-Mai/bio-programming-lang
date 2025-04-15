import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CompileButton from "@/components/energy/CompileButton";
import { Button } from "@/components/ui/button";
import { Csv, Download } from "@carbon/icons-react";

const EnergyDialog = () => {
	return (
		<Dialog>
			<DialogTrigger>
				<CompileButton />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Optimizing different designs</DialogTitle>
					<DialogDescription>energy function stuff :)</DialogDescription>
				</DialogHeader>
				<div className="horizontal items-center gap-2">
					<div className="flex p-1 bg-blue-100 text-blue-600 justify-center item-center rounded">
						<Csv size={20} />
					</div>
					<Button variant="outline" className="flex items-center gap-2 w-fit">
						<Download className="text-slate-600" />
						Download output
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default EnergyDialog;
