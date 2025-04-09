import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CompileButton from "@/components/energy/CompileButton";
import BounceLoader from "react-spinners/BounceLoader";

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
				<div className="vertical gap-2 w-full h-full justify-center items-center py-10">
					<BounceLoader color="#2644D6" size={50} />
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default EnergyDialog;
